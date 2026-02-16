import { Response, NextFunction } from 'express';
import { invitationService } from '../../services/v1/invitation.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const inviteWorker = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await invitationService.inviteWorker(
            req.params.landId,
            req.user!.id,
            {
                worker_id: req.body.worker_id,
                message: req.body.message
            }
        );
        res.status(201).json({ success: true, message: 'Worker invited successfully', data: result });
    } catch (error) { next(error); }
};

export const respondToInvitation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await invitationService.respondToInvitation(
            req.params.id,
            req.user!.id,
            req.body.response
        );
        res.status(200).json({ success: true, message: `Invitation ${req.body.response}d`, data: result });
    } catch (error) { next(error); }
};

export const getInvitationsByLand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status as string | undefined;
        const result = await invitationService.getInvitationsByLand(req.params.landId, status);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getWorkerInvitations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await invitationService.getWorkerInvitations(req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getApprovedWorkers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await invitationService.getApprovedWorkersForLand(req.params.landId);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};
