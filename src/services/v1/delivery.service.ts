import { AppDataSource } from '../../config/db.config.js';
import {
    Delivery,
    DeliveryStatus,
    DeliveryTimelineEntry,
    DELIVERY_TRANSITIONS,
    TERMINAL_STATUSES
} from '../../models/Delivery.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';
import { User, UserRole } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';
import logger from '../../utils/logger.js';

/** Human-readable labels for push notifications */
const STATUS_LABELS: Record<DeliveryStatus, string> = {
    [DeliveryStatus.ORDER_CREATED]: 'Order Created',
    [DeliveryStatus.CONFIRMED]: 'Order Confirmed',
    [DeliveryStatus.PREPARING]: 'Preparing Your Order',
    [DeliveryStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [DeliveryStatus.NEARBY]: 'Driver Nearby',
    [DeliveryStatus.DELIVERED]: 'Delivered',
    [DeliveryStatus.CANCELLED]: 'Cancelled'
};

class DeliveryService {
    private deliveryRepo = AppDataSource.getRepository(Delivery);
    private purchaseRepo = AppDataSource.getRepository(ProductPurchase);
    private userRepo = AppDataSource.getRepository(User);

    // ─── CREATE ──────────────────────────────────────────────

    /**
     * Creates a delivery record linked to a purchase.
     * Called automatically after a successful product purchase.
     */
    async createForOrder(params: {
        orderId: string;
        buyerId: string;
        sellerId: string;
        deliveryAddress?: string;
        destinationLatitude?: number;
        destinationLongitude?: number;
        estimatedMinutes?: number;
    }): Promise<Delivery> {
        // Prevent duplicate deliveries for the same order
        const existing = await this.deliveryRepo.findOne({
            where: { order_id: params.orderId }
        });
        if (existing) return existing;

        const now = new Date();
        const eta = params.estimatedMinutes
            ? new Date(now.getTime() + params.estimatedMinutes * 60_000)
            : new Date(now.getTime() + 60 * 60_000); // default 60 min

        const timeline: DeliveryTimelineEntry[] = [
            { status: DeliveryStatus.ORDER_CREATED, timestamp: now.toISOString() }
        ];

        const delivery = this.deliveryRepo.create({
            order_id: params.orderId,
            buyer_id: params.buyerId,
            seller_id: params.sellerId,
            delivery_status: DeliveryStatus.ORDER_CREATED,
            estimated_delivery_time: eta,
            delivery_address: params.deliveryAddress || null,
            destination_latitude: params.destinationLatitude || null,
            destination_longitude: params.destinationLongitude || null,
            timeline
        });

        return this.deliveryRepo.save(delivery);
    }

    // ─── READ ────────────────────────────────────────────────

    /**
     * Get delivery by order ID – validates ownership.
     */
    async getByOrderId(orderId: string, userId: string): Promise<Delivery> {
        const delivery = await this.deliveryRepo.findOne({
            where: { order_id: orderId },
            relations: ['order', 'buyer', 'seller', 'driver']
        });

        if (!delivery) {
            throw new AppError(404, 'Delivery not found for this order');
        }

        // Only buyer, seller, driver, or admin can view
        if (
            delivery.buyer_id !== userId &&
            delivery.seller_id !== userId &&
            delivery.driver_id !== userId
        ) {
            // Check if user is admin
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'You do not have access to this delivery');
            }
        }

        return delivery;
    }

    /**
     * Get delivery by its own ID – validates ownership.
     */
    async getById(deliveryId: string, userId: string): Promise<Delivery> {
        const delivery = await this.deliveryRepo.findOne({
            where: { id: deliveryId },
            relations: ['order', 'buyer', 'seller', 'driver']
        });

        if (!delivery) {
            throw new AppError(404, 'Delivery not found');
        }

        if (
            delivery.buyer_id !== userId &&
            delivery.seller_id !== userId &&
            delivery.driver_id !== userId
        ) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'You do not have access to this delivery');
            }
        }

        return delivery;
    }

    /**
     * List all deliveries for the authenticated user (buyer or seller).
     */
    async listForUser(userId: string, role: 'buyer' | 'seller' | 'all' = 'all'): Promise<Delivery[]> {
        const where: any[] = [];

        if (role === 'buyer' || role === 'all') {
            where.push({ buyer_id: userId });
        }
        if (role === 'seller' || role === 'all') {
            where.push({ seller_id: userId });
        }

        return this.deliveryRepo.find({
            where,
            relations: ['order', 'buyer', 'seller'],
            order: { createdAt: 'DESC' }
        });
    }

    // ─── STATUS UPDATE ───────────────────────────────────────

    /**
     * Transition delivery status with strict state-machine validation.
     * Enforces role-based access control.
     */
    async updateStatus(params: {
        deliveryId: string;
        userId: string;
        userRole: UserRole;
        newStatus: DeliveryStatus;
        note?: string;
        latitude?: number;
        longitude?: number;
        cancellationReason?: string;
    }): Promise<Delivery> {
        const delivery = await this.deliveryRepo.findOne({
            where: { id: params.deliveryId },
            relations: ['order', 'buyer', 'seller']
        });

        if (!delivery) {
            throw new AppError(404, 'Delivery not found');
        }

        // ── Role-based access ──
        if (params.userRole === UserRole.CUSTOMER) {
            throw new AppError(403, 'Customers cannot modify delivery status');
        }

        // Farmers/Investors can only update their own orders
        if (
            params.userRole === UserRole.FARMER ||
            params.userRole === UserRole.INVESTOR
        ) {
            if (delivery.seller_id !== params.userId) {
                throw new AppError(403, 'You can only update deliveries for your own orders');
            }
        }

        // Admin has full control – no extra checks needed

        // ── State-machine validation ──
        const currentStatus = delivery.delivery_status;
        const allowedNext = DELIVERY_TRANSITIONS[currentStatus];

        if (!allowedNext || !allowedNext.includes(params.newStatus)) {
            throw new AppError(
                400,
                `Invalid transition: cannot move from ${currentStatus} to ${params.newStatus}. ` +
                `Allowed transitions: ${allowedNext?.join(', ') || 'none'}`
            );
        }

        // ── Idempotency: if already at the requested status, return as-is ──
        if (currentStatus === params.newStatus) {
            return delivery;
        }

        // ── Apply transition ──
        delivery.delivery_status = params.newStatus;

        // Update timeline
        const timelineEntry: DeliveryTimelineEntry = {
            status: params.newStatus,
            timestamp: new Date().toISOString(),
            ...(params.note ? { note: params.note } : {})
        };

        if (!delivery.timeline) delivery.timeline = [];
        delivery.timeline.push(timelineEntry);

        // Status-specific side effects
        switch (params.newStatus) {
            case DeliveryStatus.OUT_FOR_DELIVERY:
                delivery.started_at = new Date();
                if (params.latitude != null) delivery.current_latitude = params.latitude;
                if (params.longitude != null) delivery.current_longitude = params.longitude;
                break;

            case DeliveryStatus.NEARBY:
                if (params.latitude != null) delivery.current_latitude = params.latitude;
                if (params.longitude != null) delivery.current_longitude = params.longitude;
                break;

            case DeliveryStatus.DELIVERED:
                delivery.delivered_at = new Date();
                break;

            case DeliveryStatus.CANCELLED:
                delivery.cancellation_reason = params.cancellationReason || null;
                break;
        }

        const saved = await this.deliveryRepo.save(delivery);

        // ── Push notification to buyer (non-blocking) ──
        this.notifyBuyer(delivery, params.newStatus).catch(err =>
            logger.error('[DeliveryService] Failed to send notification:', err)
        );

        return saved;
    }

    // ─── LOCATION UPDATE ─────────────────────────────────────

    /**
     * Update driver/delivery location without changing status.
     */
    async updateLocation(deliveryId: string, userId: string, latitude: number, longitude: number): Promise<Delivery> {
        const delivery = await this.deliveryRepo.findOne({
            where: { id: deliveryId }
        });

        if (!delivery) {
            throw new AppError(404, 'Delivery not found');
        }

        // Only seller, driver, or admin can update location
        if (delivery.seller_id !== userId && delivery.driver_id !== userId) {
            const user = await this.userRepo.findOne({ where: { id: userId } });
            if (!user || user.role !== UserRole.ADMIN) {
                throw new AppError(403, 'Not authorized to update delivery location');
            }
        }

        delivery.current_latitude = latitude;
        delivery.current_longitude = longitude;

        return this.deliveryRepo.save(delivery);
    }

    // ─── STRUCTURED TRACKING RESPONSE ────────────────────────

    /**
     * Builds a rich tracking response for the frontend.
     */
    buildTrackingResponse(delivery: Delivery) {
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

        const timelineMap = new Map<string, DeliveryTimelineEntry>();
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

        // Add cancellation entry if applicable
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
            order: delivery.order
                ? {
                    id: delivery.order.id,
                    product_name: (delivery.order as any).product_name,
                    quantity: (delivery.order as any).quantity,
                    total_price: (delivery.order as any).total_price
                }
                : null,
            seller: delivery.seller
                ? {
                    id: delivery.seller.id,
                    name: delivery.seller.profile?.name || delivery.seller.email,
                    picture: delivery.seller.profile?.picture || null
                }
                : null,
            buyer: delivery.buyer
                ? {
                    id: delivery.buyer.id,
                    name: delivery.buyer.profile?.name || delivery.buyer.email
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

    // ─── PRIVATE HELPERS ─────────────────────────────────────

    private async notifyBuyer(delivery: Delivery, newStatus: DeliveryStatus): Promise<void> {
        const label = STATUS_LABELS[newStatus];
        let body: string;

        switch (newStatus) {
            case DeliveryStatus.CONFIRMED:
                body = 'Your order has been confirmed by the seller!';
                break;
            case DeliveryStatus.PREPARING:
                body = 'Your order is being prepared for delivery.';
                break;
            case DeliveryStatus.OUT_FOR_DELIVERY:
                body = 'Your order is on the way! Track it in real time.';
                break;
            case DeliveryStatus.NEARBY:
                body = 'The delivery driver is nearby! Please be ready.';
                break;
            case DeliveryStatus.DELIVERED:
                body = 'Your order has been delivered. Enjoy!';
                break;
            case DeliveryStatus.CANCELLED:
                body = delivery.cancellation_reason
                    ? `Your delivery was cancelled: ${delivery.cancellation_reason}`
                    : 'Your delivery has been cancelled.';
                break;
            default:
                body = `Your delivery status is now: ${label}`;
        }

        await firebaseService.sendToUsers(
            delivery.buyer_id,
            `Delivery: ${label}`,
            body,
            { delivery_id: delivery.id, order_id: delivery.order_id, status: newStatus },
            NotificationType.PURCHASE
        );
    }
}

export const deliveryService = new DeliveryService();
