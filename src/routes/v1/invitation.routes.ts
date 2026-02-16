import { Router } from 'express';
import * as invitationController from '../../controllers/v1/invitation.controller.js';
import { authenticate, authorize } from '../../middlewares/auth.middleware.js';

const router = Router();

// Farmer: Invite worker to land
router.post('/lands/:landId/invite-worker', authenticate, authorize('farmer'), invitationController.inviteWorker);

// Worker: Respond to invitation (approve/decline)
router.post('/invitations/:id/respond', authenticate, invitationController.respondToInvitation);

// Farmer: Get invitations for a land
router.get('/lands/:landId/invitations', authenticate, invitationController.getInvitationsByLand);

// Worker: Get my invitations
router.get('/me/invitations', authenticate, invitationController.getWorkerInvitations);

// Investor: Get approved workers for a land (farmer-approved, ready to hire)
router.get('/lands/:landId/approved-workers', authenticate, authorize('investor'), invitationController.getApprovedWorkers);

export default router;
