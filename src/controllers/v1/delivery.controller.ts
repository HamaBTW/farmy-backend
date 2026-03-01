import { Response, NextFunction } from 'express';
import { deliveryService } from '../../services/v1/delivery.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { DeliveryStatus } from '../../models/Delivery.js';
import { UserRole } from '../../models/User.js';

// ─── GET delivery by order ID ────────────────────────────────

export const getDeliveryByOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const delivery = await deliveryService.getByOrderId(
            req.params.orderId as string,
            req.user!.id
        );

        const tracking = deliveryService.buildTrackingResponse(delivery);

        res.status(200).json({
            success: true,
            data: tracking
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET delivery by delivery ID ─────────────────────────────

export const getDeliveryById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const delivery = await deliveryService.getById(
            req.params.id as string,
            req.user!.id
        );

        const tracking = deliveryService.buildTrackingResponse(delivery);

        res.status(200).json({
            success: true,
            data: tracking
        });
    } catch (error) {
        next(error);
    }
};

// ─── LIST deliveries for current user ────────────────────────

export const getMyDeliveries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const role = req.query.role as 'buyer' | 'seller' | 'all' | undefined;
        const deliveries = await deliveryService.listForUser(
            req.user!.id,
            role || 'all'
        );

        const data = deliveries.map(d => deliveryService.buildTrackingResponse(d));

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};

// ─── UPDATE delivery status (role-based) ─────────────────────

export const updateDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

        const tracking = deliveryService.buildTrackingResponse(delivery);

        res.status(200).json({
            success: true,
            message: `Delivery status updated to ${status}`,
            data: tracking
        });
    } catch (error) {
        next(error);
    }
};

// ─── UPDATE delivery location ────────────────────────────────

export const updateDeliveryLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { latitude, longitude } = req.body;

        const delivery = await deliveryService.updateLocation(
            req.params.id as string,
            req.user!.id,
            latitude,
            longitude
        );

        res.status(200).json({
            success: true,
            message: 'Location updated',
            data: {
                id: delivery.id,
                current_latitude: delivery.current_latitude,
                current_longitude: delivery.current_longitude
            }
        });
    } catch (error) {
        next(error);
    }
};
