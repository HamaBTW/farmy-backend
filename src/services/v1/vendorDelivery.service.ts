import { AppDataSource } from '../../config/db.config.js';
import { Delivery, DeliveryStatus, DELIVERY_TRANSITIONS, TERMINAL_STATUSES } from '../../models/Delivery.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';
import { AppError } from '../../middlewares/error.middleware.js';
import logger from '../../utils/logger.js';

/** Human-readable labels */
const STATUS_LABELS: Record<DeliveryStatus, string> = {
    [DeliveryStatus.ORDER_CREATED]: 'Order Created',
    [DeliveryStatus.CONFIRMED]: 'Order Confirmed',
    [DeliveryStatus.PREPARING]: 'Preparing',
    [DeliveryStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [DeliveryStatus.NEARBY]: 'Driver Nearby',
    [DeliveryStatus.DELIVERED]: 'Delivered',
    [DeliveryStatus.CANCELLED]: 'Cancelled'
};

export interface VendorDeliveryFilters {
    vendorId: string;
    status?: DeliveryStatus;
    page?: number;
    limit?: number;
    sortBy?: 'date' | 'revenue';
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}

export interface VendorDeliveryStats {
    total_orders_count: number;
    active_deliveries_count: number;
    delivered_count: number;
    cancelled_count: number;
    total_revenue: number;
}

class VendorDeliveryService {
    private deliveryRepo = AppDataSource.getRepository(Delivery);
    private purchaseRepo = AppDataSource.getRepository(ProductPurchase);

    // ─── VENDOR DELIVERY LIST (paginated + filtered) ─────────

    async listVendorDeliveries(filters: VendorDeliveryFilters) {
        const {
            vendorId,
            status,
            page = 1,
            limit = 20,
            sortBy = 'date',
            sortOrder = 'DESC',
            search
        } = filters;

        const qb = this.deliveryRepo.createQueryBuilder('d')
            .leftJoinAndSelect('d.order', 'purchase')
            .leftJoinAndSelect('d.buyer', 'buyer')
            .where('d.seller_id = :vendorId', { vendorId });

        // Filter by status
        if (status) {
            qb.andWhere('d.delivery_status = :status', { status });
        }

        // Search by customer name or order ID
        if (search && search.trim()) {
            qb.andWhere(
                `(buyer.email LIKE :search OR CAST(d.order_id AS CHAR) LIKE :search OR JSON_EXTRACT(buyer.profile, '$.name') LIKE :search)`,
                { search: `%${search.trim()}%` }
            );
        }

        // Sorting
        if (sortBy === 'revenue') {
            qb.orderBy('purchase.total_price', sortOrder);
        } else {
            qb.orderBy('d.createdAt', sortOrder);
        }

        // Pagination
        const skip = (page - 1) * limit;
        qb.skip(skip).take(limit);

        const [deliveries, total] = await qb.getManyAndCount();

        const data = deliveries.map(d => this.buildVendorDeliveryItem(d));

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    // ─── VENDOR STATS ────────────────────────────────────────

    async getVendorStats(vendorId: string): Promise<VendorDeliveryStats> {
        const qb = this.deliveryRepo.createQueryBuilder('d')
            .leftJoin('d.order', 'purchase')
            .where('d.seller_id = :vendorId', { vendorId });

        // Total orders
        const totalOrders = await qb.getCount();

        // Active deliveries (non-terminal)
        const activeCount = await this.deliveryRepo.createQueryBuilder('d')
            .where('d.seller_id = :vendorId', { vendorId })
            .andWhere('d.delivery_status NOT IN (:...terminal)', {
                terminal: TERMINAL_STATUSES
            })
            .getCount();

        // Delivered count
        const deliveredCount = await this.deliveryRepo.createQueryBuilder('d')
            .where('d.seller_id = :vendorId', { vendorId })
            .andWhere('d.delivery_status = :status', { status: DeliveryStatus.DELIVERED })
            .getCount();

        // Cancelled count
        const cancelledCount = await this.deliveryRepo.createQueryBuilder('d')
            .where('d.seller_id = :vendorId', { vendorId })
            .andWhere('d.delivery_status = :status', { status: DeliveryStatus.CANCELLED })
            .getCount();

        // Total revenue (SUM of total_price for delivered orders)
        const revenueResult = await this.deliveryRepo.createQueryBuilder('d')
            .leftJoin('d.order', 'purchase')
            .select('COALESCE(SUM(purchase.total_price), 0)', 'total_revenue')
            .where('d.seller_id = :vendorId', { vendorId })
            .andWhere('d.delivery_status = :status', { status: DeliveryStatus.DELIVERED })
            .getRawOne();

        return {
            total_orders_count: totalOrders,
            active_deliveries_count: activeCount,
            delivered_count: deliveredCount,
            cancelled_count: cancelledCount,
            total_revenue: parseFloat(revenueResult?.total_revenue || '0')
        };
    }

    // ─── VENDOR DELIVERY DETAIL ──────────────────────────────

    async getVendorDeliveryDetail(deliveryId: string, vendorId: string) {
        const delivery = await this.deliveryRepo.findOne({
            where: { id: deliveryId, seller_id: vendorId },
            relations: ['order', 'buyer', 'seller', 'driver']
        });

        if (!delivery) {
            throw new AppError(404, 'Delivery not found or you do not have access');
        }

        return this.buildVendorDeliveryDetail(delivery);
    }

    // ─── RESPONSE BUILDERS ───────────────────────────────────

    private buildVendorDeliveryItem(delivery: Delivery) {
        const currentStatus = delivery.delivery_status;
        const allowedTransitions = DELIVERY_TRANSITIONS[currentStatus] || [];

        return {
            id: delivery.id,
            order_id: delivery.order_id,
            delivery_status: delivery.delivery_status,
            delivery_status_label: STATUS_LABELS[delivery.delivery_status],
            estimated_delivery_time: delivery.estimated_delivery_time,
            is_terminal: TERMINAL_STATUSES.includes(delivery.delivery_status),
            allowed_transitions: allowedTransitions,
            customer: delivery.buyer
                ? {
                    id: delivery.buyer.id,
                    name: delivery.buyer.profile?.name || delivery.buyer.email,
                    email: delivery.buyer.email,
                    picture: delivery.buyer.profile?.picture || null
                }
                : null,
            order: delivery.order
                ? {
                    id: delivery.order.id,
                    product_name: (delivery.order as any).product_name,
                    quantity: (delivery.order as any).quantity,
                    total_price: Number((delivery.order as any).total_price)
                }
                : null,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt
        };
    }

    private buildVendorDeliveryDetail(delivery: Delivery) {
        const allStatuses = [
            DeliveryStatus.ORDER_CREATED,
            DeliveryStatus.CONFIRMED,
            DeliveryStatus.PREPARING,
            DeliveryStatus.OUT_FOR_DELIVERY,
            DeliveryStatus.NEARBY,
            DeliveryStatus.DELIVERED
        ];

        const currentIndex = allStatuses.indexOf(delivery.delivery_status);
        const isCancelled = delivery.delivery_status === DeliveryStatus.CANCELLED;
        const isTerminal = TERMINAL_STATUSES.includes(delivery.delivery_status);

        const timelineMap = new Map<string, any>();
        if (delivery.timeline) {
            for (const entry of delivery.timeline) {
                timelineMap.set(entry.status, entry);
            }
        }

        const statusTimeline = allStatuses.map((status, index) => {
            const entry = timelineMap.get(status);
            let state: 'completed' | 'current' | 'pending' | 'cancelled';

            if (isCancelled) {
                state = entry ? 'completed' : 'cancelled';
            } else if (index < currentIndex) {
                state = 'completed';
            } else if (index === currentIndex) {
                state = 'current';
            } else {
                state = 'pending';
            }

            return {
                status,
                label: STATUS_LABELS[status],
                state,
                timestamp: entry?.timestamp || null,
                note: entry?.note || null
            };
        });

        if (isCancelled) {
            const cancelEntry = timelineMap.get(DeliveryStatus.CANCELLED);
            statusTimeline.push({
                status: DeliveryStatus.CANCELLED,
                label: STATUS_LABELS[DeliveryStatus.CANCELLED],
                state: 'current',
                timestamp: cancelEntry?.timestamp || null,
                note: delivery.cancellation_reason || cancelEntry?.note || null
            });
        }

        const currentStatus = delivery.delivery_status;
        const allowedTransitions = DELIVERY_TRANSITIONS[currentStatus] || [];

        return {
            id: delivery.id,
            order_id: delivery.order_id,
            delivery_status: delivery.delivery_status,
            delivery_status_label: STATUS_LABELS[delivery.delivery_status],
            estimated_delivery_time: delivery.estimated_delivery_time,
            delivery_address: delivery.delivery_address,
            is_terminal: isTerminal,
            started_at: delivery.started_at,
            delivered_at: delivery.delivered_at,
            cancellation_reason: delivery.cancellation_reason,
            allowed_transitions: allowedTransitions,
            allowed_transition_labels: allowedTransitions.map(s => ({
                status: s,
                label: STATUS_LABELS[s]
            })),
            coordinates: (delivery.current_latitude && delivery.current_longitude)
                ? {
                    latitude: Number(delivery.current_latitude),
                    longitude: Number(delivery.current_longitude)
                }
                : null,
            destination: (delivery.destination_latitude && delivery.destination_longitude)
                ? {
                    latitude: Number(delivery.destination_latitude),
                    longitude: Number(delivery.destination_longitude)
                }
                : null,
            timeline: statusTimeline,
            customer: delivery.buyer
                ? {
                    id: delivery.buyer.id,
                    name: delivery.buyer.profile?.name || delivery.buyer.email,
                    email: delivery.buyer.email,
                    picture: delivery.buyer.profile?.picture || null
                }
                : null,
            order: delivery.order
                ? {
                    id: delivery.order.id,
                    product_name: (delivery.order as any).product_name,
                    quantity: (delivery.order as any).quantity,
                    total_price: Number((delivery.order as any).total_price)
                }
                : null,
            seller: delivery.seller
                ? {
                    id: delivery.seller.id,
                    name: delivery.seller.profile?.name || delivery.seller.email,
                    picture: delivery.seller.profile?.picture || null
                }
                : null,
            driver: delivery.driver
                ? {
                    id: delivery.driver.id,
                    name: delivery.driver.profile?.name || delivery.driver.email,
                    picture: delivery.driver.profile?.picture || null
                }
                : null,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt
        };
    }
}

export const vendorDeliveryService = new VendorDeliveryService();
