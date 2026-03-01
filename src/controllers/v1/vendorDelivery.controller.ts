import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { vendorDeliveryService } from '../../services/v1/vendorDelivery.service.js';
import { deliveryService } from '../../services/v1/delivery.service.js';
import { DeliveryStatus } from '../../models/Delivery.js';
import { UserRole } from '../../models/User.js';

// ─── GET vendor deliveries (paginated, filtered) ─────────────

export const getVendorDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await vendorDeliveryService.listVendorDeliveries({
            vendorId: req.user!.id,
            status: req.query.status as DeliveryStatus | undefined,
            page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
            sortBy: (req.query.sortBy as 'date' | 'revenue') || 'date',
            sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
            search: req.query.search as string | undefined
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET vendor delivery stats ────────────────────────────────

export const getVendorDeliveryStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await vendorDeliveryService.getVendorStats(req.user!.id);

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET vendor delivery detail ───────────────────────────────

export const getVendorDeliveryDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const detail = await vendorDeliveryService.getVendorDeliveryDetail(
            req.params.id as string,
            req.user!.id
        );

        res.status(200).json({
            success: true,
            data: detail
        });
    } catch (error) {
        next(error);
    }
};

// ─── UPDATE delivery status (vendor context) ──────────────────

export const updateVendorDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, note, latitude, longitude, cancellation_reason } = req.body;

        const delivery = await deliveryService.updateStatus({
            deliveryId: req.params.id as string,
            userId: req.user!.id,
            userRole: req.user!.role as UserRole,
            newStatus: status as DeliveryStatus,
            note,
            latitude,
            longitude,
            cancellationReason: cancellation_reason
        });

        // Return vendor-specific detail response
        const detail = await vendorDeliveryService.getVendorDeliveryDetail(
            delivery.id,
            req.user!.id
        );

        res.status(200).json({
            success: true,
            message: `Delivery status updated to ${status}`,
            data: detail
        });
    } catch (error) {
        next(error);
    }
};
