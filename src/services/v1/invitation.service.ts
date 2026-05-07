import { AppDataSource } from '../../config/db.config.js';
import { LandWorkerInvitation, InvitationStatus } from '../../models/LandWorkerInvitation.js';
import { LandWorkerContract, ContractStatus } from '../../models/LandWorkerContract.js';
import { Land } from '../../models/Land.js';
import { User, UserRole } from '../../models/User.js';
import { WorkerProfile, VerificationStatus } from '../../models/WorkerProfile.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { getIO } from '../../socket/socket.js';
import { In } from 'typeorm';
import { firebaseService } from './firebase.service.js';
import { NotificationType } from '../../models/Notification.js';
import { JobApplication, JobApplicationStatus } from '../../models/JobApplication.js';
import { LandWorker, LandWorkerStatus, HiringSource } from '../../models/LandWorker.js';

class InvitationService {
    private invitationRepo = AppDataSource.getRepository(LandWorkerInvitation);
    private landRepo = AppDataSource.getRepository(Land);
    private userRepo = AppDataSource.getRepository(User);
    private profileRepo = AppDataSource.getRepository(WorkerProfile);

    /**
     * Farmer invites a worker to a specific land.
     * Only the land owner (farmer) can invite.
     */
    async inviteWorker(landId: string, farmerId: string, data: { worker_id: string; message?: string }) {
        // Validate farmer
        const farmer = await this.userRepo.findOne({ where: { id: farmerId } });
        if (!farmer) throw new AppError(404, 'Farmer not found');
        if (farmer.role !== UserRole.FARMER) throw new AppError(403, 'Only farmers can invite workers');

        // Validate land ownership
        const land = await this.landRepo.findOne({ where: { id: landId } });
        if (!land) throw new AppError(404, 'Land not found');
        if (land.owner_id !== farmerId) throw new AppError(403, 'You can only invite workers to your own land');

        // Validate worker
        const worker = await this.userRepo.findOne({ where: { id: data.worker_id } });
        if (!worker) throw new AppError(404, 'Worker not found');

        const workerProfile = await this.profileRepo.findOne({ where: { user_id: data.worker_id } });
        if (!workerProfile) throw new AppError(404, 'Worker profile not found');
        if (workerProfile.verification_status !== VerificationStatus.VERIFIED)
            throw new AppError(400, 'Worker must be verified before being invited');

        // Check for existing pending invitation
        const existingInvitation = await this.invitationRepo.findOne({
            where: {
                land_id: landId,
                worker_id: data.worker_id,
                status: InvitationStatus.INVITATION_PENDING
            }
        });
        if (existingInvitation) throw new AppError(409, 'An invitation is already pending for this worker on this land');

        // Check for existing approved invitation (already approved for this land)
        const existingApproved = await this.invitationRepo.findOne({
            where: {
                land_id: landId,
                worker_id: data.worker_id,
                status: InvitationStatus.INVITATION_APPROVED
            }
        });
        if (existingApproved) throw new AppError(409, 'Worker already has an approved invitation for this land');

        // Check if worker is already active in the land workforce
        const landWorkerRepo = AppDataSource.getRepository(LandWorker);
        const existingLandWorker = await landWorkerRepo.findOne({
            where: { land_id: landId, worker_id: data.worker_id }
        });
        if (existingLandWorker) throw new AppError(409, 'Worker is already part of the workforce for this land');

        // Check for pending job applications for this land
        const applicationRepo = AppDataSource.getRepository(JobApplication);
        const existingApplication = await applicationRepo.createQueryBuilder('app')
            .innerJoin('app.job', 'job')
            .where('app.worker_id = :workerId', { workerId: data.worker_id })
            .andWhere('job.land_id = :landId', { landId })
            .andWhere('app.status = :status', { status: JobApplicationStatus.PENDING })
            .getOne();
            
        if (existingApplication) {
            throw new AppError(409, 'This worker has an active job application for this land. Please review it in the Job Requests section instead.');
        }

        // Create invitation with 7 day expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitation = this.invitationRepo.create({
            land_id: landId,
            farmer_id: farmerId,
            worker_id: data.worker_id,
            status: InvitationStatus.INVITATION_PENDING,
            message: data.message || null,
            expires_at: expiresAt
        });

        const saved = await this.invitationRepo.save(invitation);

        // Load relations for response
        const full = await this.invitationRepo.findOne({
            where: { id: saved.id },
            relations: ['land', 'farmer', 'worker']
        });

        // Emit socket event to worker
        try {
            const io = getIO();
            io.to(data.worker_id).emit('invitation_created', {
                invitation: full,
                message: `You have been invited to work on ${land.name}`
            });

            // Send Push Notification to Worker (non-blocking)
            const requesterName = farmer.profile?.name || farmer.email.split('@')[0];
            firebaseService.sendToUsers(
                data.worker_id,
                'Job Invitation',
                `${requesterName} invited you to work on ${land.name}.`,
                { land_id: land.id, invitation_id: saved.id },
                NotificationType.INVITATION
            ).catch(err => console.error('[InvitationService] Failed to send notification:', err));
        } catch (e) { /* socket not ready */ }

        return full;
    }

    /**
     * Worker responds to invitation (approve/decline).
     * Only the invited worker can respond.
     */
    async respondToInvitation(invitationId: string, workerId: string, response: 'approve' | 'decline') {
        const invitation = await this.invitationRepo.findOne({
            where: { id: invitationId },
            relations: ['land', 'farmer', 'worker']
        });
        if (!invitation) throw new AppError(404, 'Invitation not found');
        if (invitation.worker_id !== workerId) throw new AppError(403, 'Only the invited worker can respond');

        // Validate current state
        if (invitation.status !== InvitationStatus.INVITATION_PENDING)
            throw new AppError(400, `Cannot respond to invitation with status: ${invitation.status}`);

        // Check expiry
        if (invitation.expires_at && new Date() > invitation.expires_at) {
            invitation.status = InvitationStatus.EXPIRED;
            await this.invitationRepo.save(invitation);
            throw new AppError(400, 'This invitation has expired');
        }

        if (response === 'approve') {
            invitation.status = InvitationStatus.INVITATION_APPROVED;

            // Automatically add to unified land_workers workforce
            const landWorkerRepo = AppDataSource.getRepository(LandWorker);
            
            // Final safety check for race conditions
            const exists = await landWorkerRepo.findOne({
                where: { land_id: invitation.land_id, worker_id: workerId }
            });

            if (!exists) {
                const landWorker = landWorkerRepo.create({
                    land_id: invitation.land_id,
                    worker_id: workerId,
                    assigned_by: invitation.farmer_id,
                    role: 'general', // Default role
                    status: LandWorkerStatus.ACTIVE,
                    hiring_source: HiringSource.INVITATION,
                    started_at: new Date()
                });
                await landWorkerRepo.save(landWorker);
            }
        } else {
            invitation.status = InvitationStatus.INVITATION_DECLINED;
        }

        const saved = await this.invitationRepo.save(invitation);

        // Emit socket event to farmer
        try {
            const io = getIO();
            io.to(invitation.farmer_id).emit('invitation_responded', {
                invitation: saved,
                response,
                message: response === 'approve'
                    ? `Worker accepted your invitation for ${invitation.land?.name}`
                    : `Worker declined your invitation for ${invitation.land?.name}`
            });

            // Send Push Notification to Farmer (non-blocking)
            const workerName = (invitation.worker as any)?.profile?.name || (invitation.worker as any)?.email.split('@')[0] || 'A worker';
            const actionLabel = response === 'approve' ? 'accepted' : 'declined';
            firebaseService.sendToUsers(
                invitation.farmer_id,
                'Invitation Update',
                `${workerName} has ${actionLabel} your invitation for ${invitation.land?.name}.`,
                { land_id: invitation.land_id, invitation_id: invitation.id, response },
                NotificationType.INVITATION
            ).catch(err => console.error('[InvitationService] Failed to send notification:', err));
        } catch (e) { /* socket not ready */ }

        return saved;
    }

    /**
     * Get invitations for a specific land (farmer view).
     * Optionally filter by status.
     */
    async getInvitationsByLand(landId: string, status?: string) {
        const where: any = { land_id: landId };
        if (status) {
            where.status = status;
        }
        return this.invitationRepo.find({
            where,
            relations: ['worker', 'farmer', 'land'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get worker's invitations (worker dashboard).
     */
    async getWorkerInvitations(workerId: string) {
        return this.invitationRepo.find({
            where: { worker_id: workerId },
            relations: ['land', 'farmer'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get approved workers for a specific land (investor view to hire from).
     */
    async getApprovedWorkersForLand(landId: string) {
        const approvedInvitations = await this.invitationRepo.find({
            where: {
                land_id: landId,
                status: InvitationStatus.INVITATION_APPROVED
            },
            relations: ['worker', 'land']
        });

        // Filter out workers that already have an active/pending contract on this land
        const contractRepo = AppDataSource.getRepository(LandWorkerContract);
        const result = [];

        for (const inv of approvedInvitations) {
            const existingContract = await contractRepo.findOne({
                where: {
                    land_id: landId,
                    worker_id: inv.worker_id,
                    invitation_id: inv.id
                }
            });

            // Include if no contract or contract was declined/terminated/expired
            if (!existingContract ||
                existingContract.status === ContractStatus.HIRING_DECLINED ||
                existingContract.status === ContractStatus.TERMINATED ||
                existingContract.status === ContractStatus.EXPIRED) {

                // Add worker profile data
                const profile = await this.profileRepo.findOne({
                    where: { user_id: inv.worker_id },
                    relations: ['user']
                });

                result.push({
                    invitation: inv,
                    worker: inv.worker,
                    profile: profile
                });
            }
        }

        return result;
    }
}

export const invitationService = new InvitationService();
