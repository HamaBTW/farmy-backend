import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppDataSource } from '../../config/db.config.js';
import { ProofRequest, ProofRequestStatus } from '../../models/ProofRequest.js';
import { User } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { MoreThan } from 'typeorm';
import { aiService } from './ai.service.js';
import { assetVariantService } from './assetVariant.service.js';
import { itemRequestService } from './itemRequest.service.js';
import { getIO } from '../../socket/socket.js';
import { firebaseService } from './firebase.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProofService {
    private proofRepo = AppDataSource.getRepository(ProofRequest);

    async requestProof(
        investorId: string,
        farmerId: string,
        landId?: string,
        targetType: 'land' | 'item' = 'land',
        targetId?: string
    ) {
        // Validation: Verify both users exist
        const userRepository = AppDataSource.getRepository(User);
        const investor = await userRepository.findOne({ where: { id: investorId } });
        const farmer = await userRepository.findOne({ where: { id: farmerId } });

        if (!investor || !farmer) {
            throw new AppError(404, 'User not found');
        }

        // Limit: 3 requests per week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const recentCount = await this.proofRepo.count({
            where: {
                investor_id: investorId,
                farmer_id: farmerId,
                createdAt: MoreThan(startOfWeek)
            }
        });

        if (recentCount >= 3) {
            throw new AppError(400, 'Proof request limit reached (3 per week for this worker).');
        }

        // Expiration logic: 1 hour from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        let targetName = null;
        if (targetType === 'item' && targetId) {
            try {
                const placedItem = await itemRequestService.getPlacedItemById(targetId);
                const variant = await assetVariantService.findById(placedItem.asset_category, placedItem.variant_id) as any;
                targetName = variant?.type?.name || 'Assigned Item';
            } catch (e) {
                targetName = 'Placed Item';
            }
        }

        const proof = this.proofRepo.create({
            investor_id: investorId,
            farmer_id: farmerId,
            land_id: landId,
            status: ProofRequestStatus.PENDING,
            expires_at: expiresAt,
            target_type: targetType,
            target_id: targetId,
            target_name: targetName
        });

        const saved = await this.proofRepo.save(proof);

        // Reload relations for enriched socket events
        const enriched = await this.proofRepo.findOne({
            where: { id: saved.id },
            relations: ['investor', 'farmer', 'land']
        });

        if (!enriched) return saved;

        // Emit socket event for real-time counter changes
        try {
            const io = getIO();
            const payload = {
                proof: enriched,
                land_id: landId,
                message: targetType === 'item' ? `New proof requested for ${targetName}.` : 'New proof of work requested for land.'
            };
            io.to(farmerId).emit('proof_requested', payload);
            io.to(investorId).emit('proof_requested', payload);

            // Send Push Notification to Farmer (non-blocking)
            const land = landId ? await AppDataSource.getRepository('Land').findOne({ where: { id: landId } }) as any : null;
            const landName = land?.name || 'your land';
            const requesterName = investor.profile?.name || investor.email.split('@')[0];

            firebaseService.sendToUsers(
                farmerId,
                'Proof Requested!',
                `${requesterName} requested proof of work for ${landName}.`
            ).catch(err => console.error('[ProofService] Failed to send notification:', err));
        } catch (e) { }

        return enriched;
    }

    async getMyProofs(userId: string) {
        // Assuming a user can be both an investor and a farmer, fetch everything involving them.
        const proofs = await this.proofRepo.find({
            where: [
                { investor_id: userId },
                { farmer_id: userId }
            ],
            relations: ['investor', 'farmer', 'land'],
            order: { createdAt: 'DESC' } as any
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
            investor_name: (p.investor as any)?.profile?.name || (p.investor as any)?.email || 'Unknown',
            farmer_id: p.farmer_id,
            farmer_name: (p.farmer as any)?.profile?.name || (p.farmer as any)?.email || 'Unknown',
            land_id: p.land_id,
            land_name: (p.land as any)?.name,
            status: p.status,
            ai_reasoning: p.ai_reasoning,
            expires_at: p.expires_at,
            createdAt: p.createdAt,
            target_type: p.target_type,
            target_id: p.target_id,
            target_name: p.target_name,
            image_url: p.image_url
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

        // Verify image via AI
        try {
            let condition = 'Verify if this image is a genuine farm or land clearly showing farming activity.';
            if (proof.target_type === 'item' && proof.target_name) {
                condition = `Verify if this image clearly shows a actual, deployed ${proof.target_name} on a real farm or land. Provide reasoning.`;
            }

            const verification = await aiService.verifyImage(imageBuffer, mimetype, condition);

            if (verification.success && verification.verified) {
                proof.status = ProofRequestStatus.VERIFIED;
            } else {
                proof.status = ProofRequestStatus.REJECTED;
            }
            proof.ai_reasoning = verification.reasoning || verification.error || 'Verification failed';
        } catch (e: any) {
            proof.status = ProofRequestStatus.REJECTED;
            proof.ai_reasoning = `AI Error: ${e.message}`;
        }

        // Save image to disk
        try {
            const fileName = `proof-${proof.id}-${Date.now()}.${mimetype.split('/')[1] || 'jpg'}`;
            const uploadDir = path.join(__dirname, '../../uploads/proofs');
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, imageBuffer);
            proof.image_url = `/uploads/proofs/${fileName}`;
        } catch (e) {
            console.error('Failed to save proof image:', e);
        }

        const saved = await this.proofRepo.save(proof);

        // Reload relations for enriched socket events
        const enriched = await this.proofRepo.findOne({
            where: { id: saved.id },
            relations: ['investor', 'farmer', 'land']
        });

        if (!enriched) return saved;

        // Emit socket event for status update
        try {
            const io = getIO();
            const payload = {
                proof: enriched,
                land_id: enriched.land_id,
                message: enriched.status === ProofRequestStatus.VERIFIED
                    ? 'Proof verified successfully.'
                    : 'The submitted image was rejected by AI.'
            };
            io.to(proof.investor_id).emit('proof_status_updated', payload);
            io.to(proof.farmer_id).emit('proof_status_updated', payload);

            // Send Push Notification to Investor (non-blocking)
            const statusLabel = enriched.status === ProofRequestStatus.VERIFIED ? 'Verified' : 'Rejected';
            const landName = (enriched.land as any)?.name || 'Land';
            firebaseService.sendToUsers(
                proof.investor_id,
                `Proof ${statusLabel}`,
                `AI has ${statusLabel.toLowerCase()} the proof for ${landName}.`
            ).catch(err => console.error('[ProofService] Failed to send notification:', err));
        } catch (e) { }

        return enriched;
    }
}

export const proofService = new ProofService();
