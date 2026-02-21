import { AppDataSource } from '../../config/db.config.js';
import { ProofRequest, ProofRequestStatus } from '../../models/ProofRequest.js';
import { User } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { MoreThan } from 'typeorm';
import { aiService } from './ai.service.js';

class ProofService {
    private proofRepo = AppDataSource.getRepository(ProofRequest);

    async requestProof(investorId: string, farmerId: string) {
        // Validation: Verify both users exist
        const userRepository = AppDataSource.getRepository(User);
        const investor = await userRepository.findOne({ where: { id: investorId } });
        const farmer = await userRepository.findOne({ where: { id: farmerId } });

        if (!investor || !farmer) {
            throw new AppError(404, 'User not found');
        }

        // Feature constraint: Max 3 requests a week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentRequestsCount = await this.proofRepo.count({
            where: {
                investor_id: investorId,
                farmer_id: farmerId,
                createdAt: MoreThan(oneWeekAgo)
            }
        });

        if (recentRequestsCount >= 3) {
            throw new AppError(429, 'You have reached the maximum of 3 proof requests per week for this farmer.');
        }

        // Expiration logic: 1 hour from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const proof = this.proofRepo.create({
            investor_id: investorId,
            farmer_id: farmerId,
            status: ProofRequestStatus.PENDING,
            expires_at: expiresAt
        });

        return await this.proofRepo.save(proof);
    }

    async getMyProofs(userId: string) {
        // Assuming a user can be both an investor and a farmer, fetch everything involving them.
        const proofs = await this.proofRepo.find({
            where: [
                { investor_id: userId },
                { farmer_id: userId }
            ],
            relations: ['investor', 'farmer'],
            order: { createdAt: 'DESC' }
        });

        // Mark expired proofs
        const now = new Date();
        for (const p of proofs) {
            if (p.status === ProofRequestStatus.PENDING && new Date(p.expires_at) < now) {
                p.status = ProofRequestStatus.EXPIRED;
                await this.proofRepo.save(p);
            }
        }

        return proofs.map(p => ({
            id: p.id,
            investor_id: p.investor_id,
            investor_name: (p.investor as any)?.username || 'Unknown',
            farmer_id: p.farmer_id,
            farmer_name: (p.farmer as any)?.username || 'Unknown',
            status: p.status,
            ai_reasoning: p.ai_reasoning,
            expires_at: p.expires_at,
            createdAt: p.createdAt,
        }));
    }

    async submitProof(proofId: string, farmerId: string, imageBuffer: Buffer, mimetype: string) {
        const proof = await this.proofRepo.findOne({ where: { id: proofId } });

        if (!proof) {
            throw new AppError(404, 'Proof request not found');
        }

        if (proof.farmer_id !== farmerId) {
            throw new AppError(403, 'You are not authorized to submit proof for this request');
        }

        if (proof.status !== ProofRequestStatus.PENDING) {
            throw new AppError(400, `Proof request is already ${proof.status}`);
        }

        if (new Date(proof.expires_at) < new Date()) {
            proof.status = ProofRequestStatus.EXPIRED;
            await this.proofRepo.save(proof);
            throw new AppError(400, 'Proof request has expired');
        }

        const condition = 'Verify if this image clearly shows ongoing farming activities, well-maintained land, or healthy crops/animals.';
        const verification = await aiService.verifyImage(imageBuffer, mimetype, condition);

        if (verification.success && verification.verified) {
            proof.status = ProofRequestStatus.VERIFIED;
            proof.ai_reasoning = verification.reasoning || 'AI verified the image successfully.';
        } else {
            proof.status = ProofRequestStatus.REJECTED;
            proof.ai_reasoning = verification.reasoning || verification.error || 'The image does not show clear farming activity.';
        }

        return await this.proofRepo.save(proof);
    }
}

export const proofService = new ProofService();
