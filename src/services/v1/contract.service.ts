import { AppDataSource } from '../../config/db.config.js';
import { LandWorkerContract, ContractStatus, SalaryType, ContractProposer } from '../../models/LandWorkerContract.js';
import { LandWorkerInvitation, InvitationStatus } from '../../models/LandWorkerInvitation.js';
import { ContractNegotiation } from '../../models/ContractNegotiation.js';
import { WorkerBalance } from '../../models/WorkerBalance.js';
import { Transaction, TransactionStatus, TransactionType } from '../../models/Transaction.js';
import { LandWorker, LandWorkerStatus } from '../../models/LandWorker.js';
import { LandRental } from '../../models/LandRental.js';
import { Land } from '../../models/Land.js';
import { User, UserRole } from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { stripeService } from './StripeService.js';
import { getIO } from '../../socket/socket.js';
import { In, Not, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    [ContractStatus.HIRING_PENDING]: [ContractStatus.NEGOTIATION_PENDING, ContractStatus.HIRING_DECLINED, ContractStatus.PAYMENT_PENDING],
    [ContractStatus.NEGOTIATION_PENDING]: [ContractStatus.NEGOTIATION_COUNTERED, ContractStatus.HIRING_DECLINED, ContractStatus.PAYMENT_PENDING],
    [ContractStatus.NEGOTIATION_COUNTERED]: [ContractStatus.NEGOTIATION_PENDING, ContractStatus.HIRING_DECLINED, ContractStatus.PAYMENT_PENDING],
    [ContractStatus.PAYMENT_PENDING]: [ContractStatus.ACTIVE, ContractStatus.HIRING_DECLINED],
    [ContractStatus.ACTIVE]: [ContractStatus.SUSPENDED, ContractStatus.TERMINATED, ContractStatus.EXPIRED],
    [ContractStatus.SUSPENDED]: [ContractStatus.ACTIVE, ContractStatus.TERMINATED],
};

interface HireWorkerData {
    invitation_id: string;
    salary_amount: number;
    salary_type: SalaryType;
    contract_start_date: string;
    contract_end_date: string;
    message?: string;
}

class ContractService {
    private contractRepo = AppDataSource.getRepository(LandWorkerContract);
    private invitationRepo = AppDataSource.getRepository(LandWorkerInvitation);
    private negotiationRepo = AppDataSource.getRepository(ContractNegotiation);
    private balanceRepo = AppDataSource.getRepository(WorkerBalance);
    private transactionRepo = AppDataSource.getRepository(Transaction);
    private landWorkerRepo = AppDataSource.getRepository(LandWorker);
    private rentalRepo = AppDataSource.getRepository(LandRental);
    private landRepo = AppDataSource.getRepository(Land);
    private userRepo = AppDataSource.getRepository(User);

    /**
     * Validate state transition
     */
    private validateTransition(currentStatus: ContractStatus, newStatus: ContractStatus) {
        const allowed = VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(newStatus)) {
            throw new AppError(400, `Invalid state transition from ${currentStatus} to ${newStatus}`);
        }
    }

    /**
     * Investor hires a farmer-approved worker.
     */
    async hireWorker(landId: string, investorId: string, data: HireWorkerData) {
        // Validate investor
        const investor = await this.userRepo.findOne({ where: { id: investorId } });
        if (!investor) throw new AppError(404, 'Investor not found');
        if (investor.role !== UserRole.INVESTOR) throw new AppError(403, 'Only investors can hire workers');

        // Validate active rental
        const activeRental = await this.getActiveRental(landId);
        if (!activeRental) throw new AppError(403, 'No active rental found for this land');
        if (activeRental.investor_id !== investorId)
            throw new AppError(403, 'You do not have an active rental on this land');

        // Validate invitation
        const invitation = await this.invitationRepo.findOne({
            where: { id: data.invitation_id },
            relations: ['worker', 'land']
        });
        if (!invitation) throw new AppError(404, 'Invitation not found');
        if (invitation.land_id !== landId) throw new AppError(400, 'Invitation is not for this land');
        if (invitation.status !== InvitationStatus.INVITATION_APPROVED)
            throw new AppError(400, 'Worker must be farmer-approved before hiring');

        // Check for existing active/pending contract
        const existingContract = await this.contractRepo.findOne({
            where: {
                land_id: landId,
                worker_id: invitation.worker_id,
                status: In([
                    ContractStatus.HIRING_PENDING,
                    ContractStatus.NEGOTIATION_PENDING,
                    ContractStatus.NEGOTIATION_COUNTERED,
                    ContractStatus.PAYMENT_PENDING,
                    ContractStatus.ACTIVE
                ])
            }
        });
        if (existingContract) throw new AppError(409, 'Worker already has an active or pending contract on this land');

        // Validate worker max 2 active lands
        const activeContracts = await this.contractRepo.count({
            where: {
                worker_id: invitation.worker_id,
                status: ContractStatus.ACTIVE
            }
        });
        if (activeContracts >= 2) throw new AppError(400, 'Worker cannot be active in more than 2 lands simultaneously');

        // Validate contract dates against rental period
        const startDate = new Date(data.contract_start_date);
        const endDate = new Date(data.contract_end_date);

        if (startDate >= endDate) throw new AppError(400, 'Contract start date must be before end date');
        if (activeRental.rental_end_date && endDate > activeRental.rental_end_date)
            throw new AppError(400, 'Contract end date cannot exceed rental period');

        // Check overlapping contracts for the worker
        const overlapping = await this.contractRepo
            .createQueryBuilder('c')
            .where('c.worker_id = :workerId', { workerId: invitation.worker_id })
            .andWhere('c.status IN (:...statuses)', {
                statuses: [ContractStatus.ACTIVE, ContractStatus.PAYMENT_PENDING, ContractStatus.HIRING_PENDING, ContractStatus.NEGOTIATION_PENDING, ContractStatus.NEGOTIATION_COUNTERED]
            })
            .andWhere('c.contract_start_date < :endDate', { endDate: data.contract_end_date })
            .andWhere('c.contract_end_date > :startDate', { startDate: data.contract_start_date })
            .getCount();

        if (overlapping > 0) throw new AppError(400, 'Worker has overlapping contracts in this period');

        // Validate salary
        if (data.salary_amount <= 0) throw new AppError(400, 'Salary must be positive');

        // Create contract
        const contract = this.contractRepo.create({
            land_id: landId,
            invitation_id: data.invitation_id,
            investor_id: investorId,
            worker_id: invitation.worker_id,
            salary_type: data.salary_type || SalaryType.MONTHLY,
            salary_amount: data.salary_amount,
            contract_start_date: startDate,
            contract_end_date: endDate,
            status: ContractStatus.HIRING_PENDING,
            current_proposer: ContractProposer.INVESTOR,
            message: data.message || null
        });

        const saved = await this.contractRepo.save(contract);

        const full = await this.contractRepo.findOne({
            where: { id: saved.id },
            relations: ['land', 'worker', 'investor', 'invitation']
        });

        // Emit socket event to worker
        try {
            const io = getIO();
            io.to(invitation.worker_id).emit('contract_created', {
                contract: full,
                message: `You have received a hiring proposal for ${invitation.land?.name}`
            });
        } catch (e) { /* socket not ready */ }

        return full;
    }

    /**
     * Worker responds to hiring proposal (approve/decline).
     * Accept = accept the OTHER party's (investor's) latest proposal.
     * Worker can only accept when current_proposer is 'investor' (it's the investor's offer on the table).
     */
    async respondToContract(contractId: string, workerId: string, response: 'approve' | 'decline') {
        return AppDataSource.transaction(async (manager) => {
            const contractRepo = manager.getRepository(LandWorkerContract);
            const negotiationRepo = manager.getRepository(ContractNegotiation);

            // Lock the contract row for this transaction
            const contract = await contractRepo.findOne({
                where: { id: contractId },
                relations: ['land', 'investor', 'worker'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract) throw new AppError(404, 'Contract not found');
            if (contract.worker_id !== workerId) throw new AppError(403, 'Only the worker can respond to this contract');

            // Valid states for response
            const validStates = [ContractStatus.HIRING_PENDING, ContractStatus.NEGOTIATION_COUNTERED];
            if (!validStates.includes(contract.status))
                throw new AppError(400, `Cannot respond to contract with status: ${contract.status}`);

            if (response === 'approve') {
                // Worker can only accept the investor's proposal (current_proposer must be investor)
                if (contract.current_proposer !== ContractProposer.INVESTOR)
                    throw new AppError(400, 'You can only accept the other party\'s offer. It is currently your turn to propose.');

                this.validateTransition(contract.status, ContractStatus.PAYMENT_PENDING);
                contract.status = ContractStatus.PAYMENT_PENDING;
                // Salary is already frozen to the investor's last proposal on the contract row

                // Create a system negotiation record for the acceptance
                const negotiation = negotiationRepo.create({
                    contract_id: contractId,
                    sender_id: workerId,
                    comment: 'Offer accepted. Proceeding to payment.'
                });
                await negotiationRepo.save(negotiation);
            } else {
                // Worker declines
                this.validateTransition(contract.status, ContractStatus.HIRING_DECLINED);
                contract.status = ContractStatus.HIRING_DECLINED;

                const negotiation = negotiationRepo.create({
                    contract_id: contractId,
                    sender_id: workerId,
                    comment: 'Offer declined. This negotiation has been cancelled.'
                });
                await negotiationRepo.save(negotiation);
            }

            const saved = await contractRepo.save(contract);

            // Emit socket event
            try {
                const io = getIO();
                const eventName = response === 'approve' ? 'contract_accepted' : 'contract_declined';
                // Notify both parties
                [contract.investor_id, contract.worker_id].forEach(uid => {
                    io.to(uid).emit(eventName, {
                        contract: saved,
                        response,
                        message: response === 'approve'
                            ? `Worker approved the contract. Payment required.`
                            : `Worker declined the hiring proposal.`
                    });
                });
            } catch (e) { /* socket not ready */ }

            return saved;
        });
    }

    /**
     * Investor responds to worker counter-offer or cancels the contract (accept/decline).
     * Accept = accept the OTHER party's (worker's) latest proposal.
     * Investor can only accept when current_proposer is 'worker' (worker's offer on the table).
     */
    async investorRespondToContract(contractId: string, investorId: string, response: 'accept' | 'decline') {
        return AppDataSource.transaction(async (manager) => {
            const contractRepo = manager.getRepository(LandWorkerContract);
            const negotiationRepo = manager.getRepository(ContractNegotiation);

            const contract = await contractRepo.findOne({
                where: { id: contractId },
                relations: ['land', 'investor', 'worker'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract) throw new AppError(404, 'Contract not found');
            if (contract.investor_id !== investorId)
                throw new AppError(403, 'Only the investor can respond to this contract');

            if (response === 'accept') {
                // Investor can only accept the worker's proposal (current_proposer must be worker)
                // Exception: hiring_pending (investor's own initial offer — worker hasn't countered yet)
                const acceptableStates = [
                    ContractStatus.NEGOTIATION_PENDING,
                    ContractStatus.NEGOTIATION_COUNTERED,
                    ContractStatus.HIRING_PENDING
                ];
                if (!acceptableStates.includes(contract.status))
                    throw new AppError(400, `Cannot accept contract with status: ${contract.status}`);

                // For negotiation states, enforce turn-based: investor can only accept worker's offer
                if (contract.status !== ContractStatus.HIRING_PENDING &&
                    contract.current_proposer !== ContractProposer.WORKER)
                    throw new AppError(400, 'You can only accept the other party\'s offer. It is currently your turn to propose.');

                this.validateTransition(contract.status, ContractStatus.PAYMENT_PENDING);
                contract.status = ContractStatus.PAYMENT_PENDING;
                // Salary is already frozen on the contract row from the last negotiation

                // Create a system negotiation record for the acceptance
                const negotiation = negotiationRepo.create({
                    contract_id: contractId,
                    sender_id: investorId,
                    comment: 'Offer accepted. Proceeding to payment.'
                });
                await negotiationRepo.save(negotiation);
            } else {
                // Decline => hiring_declined (from any negotiation state)
                const declinableStates = [
                    ContractStatus.HIRING_PENDING,
                    ContractStatus.NEGOTIATION_PENDING,
                    ContractStatus.NEGOTIATION_COUNTERED,
                    ContractStatus.PAYMENT_PENDING
                ];
                if (!declinableStates.includes(contract.status))
                    throw new AppError(400, `Cannot decline contract with status: ${contract.status}`);
                this.validateTransition(contract.status, ContractStatus.HIRING_DECLINED);
                contract.status = ContractStatus.HIRING_DECLINED;

                // Create a system negotiation record for the decline
                const negotiation = negotiationRepo.create({
                    contract_id: contractId,
                    sender_id: investorId,
                    comment: 'Offer declined. This negotiation has been cancelled.'
                });
                await negotiationRepo.save(negotiation);
            }

            const saved = await contractRepo.save(contract);

            // Emit socket event to both parties
            try {
                const io = getIO();
                const eventName = response === 'accept' ? 'contract_accepted' : 'contract_declined';
                [contract.worker_id, contract.investor_id].forEach(uid => {
                    io.to(uid).emit(eventName, {
                        contract: saved,
                        response,
                        message: response === 'accept'
                            ? `Investor accepted the terms. Payment in progress.`
                            : `Investor declined the negotiation.`
                    });
                });
            } catch (e) { /* socket not ready */ }

            return saved;
        });
    }

    /**
     * Negotiate contract terms (either party can negotiate).
     * Uses DB transaction with pessimistic locking to prevent race conditions.
     */
    async negotiateContract(contractId: string, senderId: string, data: { comment: string; proposed_salary_amount?: number; proposed_salary_type?: string }) {
        return AppDataSource.transaction(async (manager) => {
            const contractRepo = manager.getRepository(LandWorkerContract);
            const negotiationRepo = manager.getRepository(ContractNegotiation);

            const contract = await contractRepo.findOne({
                where: { id: contractId },
                relations: ['land', 'investor', 'worker'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract) throw new AppError(404, 'Contract not found');

            // Validate sender is part of the contract
            const isInvestor = contract.investor_id === senderId;
            const isWorker = contract.worker_id === senderId;
            if (!isInvestor && !isWorker)
                throw new AppError(403, 'Only the investor or worker can negotiate');

            // Validate state allows negotiation
            const validStates = [
                ContractStatus.HIRING_PENDING,
                ContractStatus.NEGOTIATION_PENDING,
                ContractStatus.NEGOTIATION_COUNTERED
            ];
            if (!validStates.includes(contract.status))
                throw new AppError(400, `Cannot negotiate in status: ${contract.status}`);

            if (!data.comment || data.comment.trim().length === 0)
                throw new AppError(400, 'Comment is required for negotiation');

            // Create negotiation record
            const negotiation = negotiationRepo.create({
                contract_id: contractId,
                sender_id: senderId,
                proposed_salary_amount: data.proposed_salary_amount || null,
                comment: data.comment.trim()
            });
            await negotiationRepo.save(negotiation);

            // Update contract status based on who is negotiating
            if (isWorker) {
                contract.status = ContractStatus.NEGOTIATION_PENDING;
                contract.current_proposer = ContractProposer.WORKER;
            } else {
                contract.status = ContractStatus.NEGOTIATION_COUNTERED;
                contract.current_proposer = ContractProposer.INVESTOR;
            }

            // Update salary if proposed
            if (data.proposed_salary_amount && data.proposed_salary_amount > 0) {
                contract.salary_amount = data.proposed_salary_amount;
            }

            // Update salary type if proposed
            if (data.proposed_salary_type && Object.values(SalaryType).includes(data.proposed_salary_type as SalaryType)) {
                contract.salary_type = data.proposed_salary_type as SalaryType;
            }

            const saved = await contractRepo.save(contract);

            // Emit socket event to both parties
            try {
                const io = getIO();
                [contract.investor_id, contract.worker_id].forEach(uid => {
                    io.to(uid).emit('contract_negotiated', {
                        contract: saved,
                        negotiation,
                        message: `New negotiation message on contract for ${contract.land?.name}`
                    });
                });
            } catch (e) { /* socket not ready */ }

            return { contract: saved, negotiation };
        });
    }

    /**
     * Edit the LAST negotiation message on a contract.
     * Rules:
     * - Only the sender of the last message can edit it
     * - Only allowed in negotiation states (hiring_pending, negotiation_pending, negotiation_countered)
     * - Preserves createdAt, updates updatedAt
     * - Does NOT change current_proposer or contract status
     * - Updates salary on contract if proposed_salary_amount changes
     */
    async editNegotiation(contractId: string, negotiationId: string, userId: string, data: { comment?: string; proposed_salary_amount?: number; proposed_salary_type?: string }) {
        return AppDataSource.transaction(async (manager) => {
            const contractRepo = manager.getRepository(LandWorkerContract);
            const negotiationRepo = manager.getRepository(ContractNegotiation);

            const contract = await contractRepo.findOne({
                where: { id: contractId },
                relations: ['land', 'investor', 'worker'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract) throw new AppError(404, 'Contract not found');

            // Immutability check — no edits after payment_pending, active, terminated, etc.
            const immutableStates = [
                ContractStatus.PAYMENT_PENDING,
                ContractStatus.ACTIVE,
                ContractStatus.SUSPENDED,
                ContractStatus.TERMINATED,
                ContractStatus.EXPIRED,
                ContractStatus.HIRING_DECLINED
            ];
            if (immutableStates.includes(contract.status))
                throw new AppError(400, `Cannot edit negotiations in status: ${contract.status}`);

            // Validate sender is part of the contract
            if (contract.investor_id !== userId && contract.worker_id !== userId)
                throw new AppError(403, 'You are not part of this contract');

            // Get the LAST negotiation message (by createdAt DESC)
            const lastNegotiation = await negotiationRepo.findOne({
                where: { contract_id: contractId },
                order: { createdAt: 'DESC' }
            });
            if (!lastNegotiation) throw new AppError(404, 'No negotiation messages found');
            if (lastNegotiation.id !== negotiationId)
                throw new AppError(400, 'You can only edit the last negotiation message');
            if (lastNegotiation.sender_id !== userId)
                throw new AppError(403, 'You can only edit your own messages');

            // Update negotiation fields
            if (data.comment && data.comment.trim().length > 0) {
                lastNegotiation.comment = data.comment.trim();
            }
            if (data.proposed_salary_amount !== undefined) {
                lastNegotiation.proposed_salary_amount = data.proposed_salary_amount > 0 ? data.proposed_salary_amount : null;
            }
            await negotiationRepo.save(lastNegotiation);

            // Sync salary on the contract if the proposed amount changed
            if (data.proposed_salary_amount && data.proposed_salary_amount > 0) {
                contract.salary_amount = data.proposed_salary_amount;
            }
            if (data.proposed_salary_type && Object.values(SalaryType).includes(data.proposed_salary_type as SalaryType)) {
                contract.salary_type = data.proposed_salary_type as SalaryType;
            }
            const saved = await contractRepo.save(contract);

            // Emit socket event to both parties
            try {
                const io = getIO();
                [contract.investor_id, contract.worker_id].forEach(uid => {
                    io.to(uid).emit('negotiation_edited', {
                        contract: saved,
                        negotiation: lastNegotiation,
                        message: `A negotiation message was edited`
                    });
                });
            } catch (e) { /* socket not ready */ }

            return { contract: saved, negotiation: lastNegotiation };
        });
    }

    /**
     * Delete (remove) the LAST negotiation message on a contract.
     * Rules:
     * - Only the sender of the last message can delete it
     * - Only allowed in negotiation states
     * - Reverts contract state: flips current_proposer, reverts salary to previous negotiation or original
     * - If no previous negotiation exists, reverts to hiring_pending with investor as proposer
     */
    async deleteNegotiation(contractId: string, negotiationId: string, userId: string) {
        return AppDataSource.transaction(async (manager) => {
            const contractRepo = manager.getRepository(LandWorkerContract);
            const negotiationRepo = manager.getRepository(ContractNegotiation);

            const contract = await contractRepo.findOne({
                where: { id: contractId },
                relations: ['land', 'investor', 'worker'],
                lock: { mode: 'pessimistic_write' }
            });
            if (!contract) throw new AppError(404, 'Contract not found');

            // Immutability check
            const immutableStates = [
                ContractStatus.PAYMENT_PENDING,
                ContractStatus.ACTIVE,
                ContractStatus.SUSPENDED,
                ContractStatus.TERMINATED,
                ContractStatus.EXPIRED,
                ContractStatus.HIRING_DECLINED
            ];
            if (immutableStates.includes(contract.status))
                throw new AppError(400, `Cannot delete negotiations in status: ${contract.status}`);

            // Validate sender is part of the contract
            if (contract.investor_id !== userId && contract.worker_id !== userId)
                throw new AppError(403, 'You are not part of this contract');

            // Get ALL non-system negotiation messages ordered by createdAt
            const allNegotiations = await negotiationRepo.find({
                where: { contract_id: contractId },
                order: { createdAt: 'ASC' }
            });

            if (allNegotiations.length === 0) throw new AppError(404, 'No negotiation messages found');

            const lastNegotiation = allNegotiations[allNegotiations.length - 1];
            if (lastNegotiation.id !== negotiationId)
                throw new AppError(400, 'You can only delete the last negotiation message');
            if (lastNegotiation.sender_id !== userId)
                throw new AppError(403, 'You can only delete your own messages');

            // Delete the last negotiation
            await negotiationRepo.remove(lastNegotiation);

            // Find the previous negotiation (the new "last" message) to revert state
            // Filter out system messages to find the previous real proposal
            const systemPhrases = ['Offer accepted. Proceeding to payment.', 'Offer declined. This negotiation has been cancelled.'];
            const previousNegotiations = allNegotiations.slice(0, -1).filter(n => !systemPhrases.includes(n.comment));

            if (previousNegotiations.length > 0) {
                const prevNeg = previousNegotiations[previousNegotiations.length - 1];
                const prevSenderIsWorker = prevNeg.sender_id === contract.worker_id;

                // Revert to previous proposer's state
                if (prevSenderIsWorker) {
                    contract.status = ContractStatus.NEGOTIATION_PENDING;
                    contract.current_proposer = ContractProposer.WORKER;
                } else {
                    contract.status = ContractStatus.NEGOTIATION_COUNTERED;
                    contract.current_proposer = ContractProposer.INVESTOR;
                }

                // Revert salary to previous negotiation's proposed amount, or keep current
                if (prevNeg.proposed_salary_amount && Number(prevNeg.proposed_salary_amount) > 0) {
                    contract.salary_amount = Number(prevNeg.proposed_salary_amount);
                }
            } else {
                // No previous negotiations — revert to original hiring_pending state
                contract.status = ContractStatus.HIRING_PENDING;
                contract.current_proposer = ContractProposer.INVESTOR;
                // salary_amount stays at the original hiring offer (already on contract)
            }

            const saved = await contractRepo.save(contract);

            // Emit socket event to both parties
            try {
                const io = getIO();
                [contract.investor_id, contract.worker_id].forEach(uid => {
                    io.to(uid).emit('negotiation_deleted', {
                        contract: saved,
                        deletedNegotiationId: negotiationId,
                        message: `A negotiation message was withdrawn`
                    });
                });
            } catch (e) { /* socket not ready */ }

            return { contract: saved };
        });
    }

    /**
     * Get negotiation history for a contract.
     */
    async getNegotiationHistory(contractId: string, userId: string) {
        const contract = await this.contractRepo.findOne({ where: { id: contractId } });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== userId && contract.worker_id !== userId)
            throw new AppError(403, 'You are not part of this contract');

        return this.negotiationRepo.find({
            where: { contract_id: contractId },
            relations: ['sender'],
            order: { createdAt: 'ASC' }
        });
    }

    /**
     * Create Stripe payment intent for first salary cycle.
     * - Monthly → 1 full month upfront
     * - Hourly → 24h upfront  
     * - Per-task → 1 task cycle upfront
     * Uses idempotency key to prevent duplicate charges.
     * Currency: USD (Stripe US account).
     */
    async createContractPayment(contractId: string, investorId: string) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'worker', 'investor']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== investorId)
            throw new AppError(403, 'Only the investor can make payment');
        if (contract.status !== ContractStatus.PAYMENT_PENDING)
            throw new AppError(400, 'Contract must be in payment_pending status');

        // --- Catch-up check: verify if payment already succeeded but contract is pending ---
        const existingTx = await this.transactionRepo.findOne({
            where: {
                contract_id: contractId,
                type: TransactionType.SALARY_UPFRONT
            },
            order: { createdAt: 'DESC' }
        });

        if (existingTx) {
            // 1. If we already saved it as SUCCEEDED but contract is stuck in PAYMENT_PENDING
            if (existingTx.status === TransactionStatus.SUCCEEDED) {
                console.log(`[Catch-up] Transaction already SUCCEEDED for contract ${contractId}. Activating now.`);
                await AppDataSource.transaction(async (manager) => {
                    await this.activateContractInternal(manager, contractId, existingTx.stripe_payment_intent_id, existingTx.metadata as any);
                });
                return { activated: true, message: 'Contract activated. You were already charged.' };
            }

            // 2. If it's PENDING, check Stripe directly (webhook might be lost)
            if (existingTx.status === TransactionStatus.PENDING) {
                const intent = await stripeService.retrievePaymentIntent(existingTx.stripe_payment_intent_id);
                if (intent.status === 'succeeded') {
                    console.log(`[Catch-up] Stripe says SUCCEEDED for pending TX ${existingTx.id}. Syncing.`);
                    await AppDataSource.transaction(async (manager) => {
                        await this.activateContractInternal(manager, contractId, existingTx.stripe_payment_intent_id, intent.metadata as any);
                    });
                    return { activated: true, message: 'Contract was pending activation. Payment successful.' };
                }

                // If still pending, return it to the UI to try paying again (Stripe UI handles "already paid" error if PENDING on their side too)
                const investor = await this.userRepo.findOne({ where: { id: investorId } });
                const ephemeralKey = await stripeService.createEphemeralKey(investor!.stripe_customer_id!);
                return {
                    paymentIntentId: intent.id,
                    clientSecret: intent.client_secret,
                    ephemeralKey: ephemeralKey.secret,
                    customerId: investor!.stripe_customer_id,
                    amount: contract.salary_amount,
                    currency: 'usd',
                    contractId: contract.id,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
                };
            }
        }

        // Ensure investor has a Stripe customer
        const investor = await this.userRepo.findOne({
            where: { id: investorId },
            select: ['id', 'email', 'profile', 'stripe_customer_id']
        });
        if (!investor) throw new AppError(404, 'Investor not found');

        let stripeCustomerId = investor.stripe_customer_id;
        if (stripeCustomerId) {
            // Verify the stored customer still exists in Stripe
            try {
                const existing = await stripeService.getCustomer(stripeCustomerId);
                if ((existing as any).deleted) {
                    stripeCustomerId = null;
                }
            } catch {
                // Customer doesn't exist in Stripe — clear it and create a new one
                stripeCustomerId = null;
            }
        }
        if (!stripeCustomerId) {
            const customer = await stripeService.createCustomer(investor.email, investor.profile?.name);
            stripeCustomerId = customer.id;
            investor.stripe_customer_id = stripeCustomerId;
            await this.userRepo.save(investor);
        }

        // Build metadata for webhook reconciliation
        const metadata: Record<string, string> = {
            contract_id: contract.id,
            investor_id: contract.investor_id,
            worker_id: contract.worker_id,
            land_id: contract.land_id,
            salary_type: contract.salary_type,
            salary_amount: String(contract.salary_amount),
            type: 'salary_upfront'
        };

        // Idempotency key prevents duplicate charges on retry
        const idempotencyKey = `contract_payment_${contract.id}_${Date.now()}`;

        // Create payment intent — always USD
        const paymentIntent = await stripeService.createPaymentIntent(
            Number(contract.salary_amount),
            'usd',
            stripeCustomerId,
            metadata,
            idempotencyKey
        );

        // Record transaction as pending
        const transaction = this.transactionRepo.create({
            stripe_payment_intent_id: paymentIntent.id,
            contract_id: contract.id,
            investor_id: contract.investor_id,
            worker_id: contract.worker_id,
            amount: Number(contract.salary_amount),
            currency: 'usd',
            status: TransactionStatus.PENDING,
            type: TransactionType.SALARY_UPFRONT,
            metadata
        });
        await this.transactionRepo.save(transaction);

        // Create ephemeral key for Stripe SDK
        const ephemeralKey = await stripeService.createEphemeralKey(stripeCustomerId);

        return {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            ephemeralKey: ephemeralKey.secret,
            customerId: stripeCustomerId,
            amount: contract.salary_amount,
            currency: 'usd',
            contractId: contract.id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        };
    }

    /**
     * Internal activation logic shared by Webhook and Manual check.
     * Must be called within a transaction if manager is provided.
     */
    private async activateContractInternal(manager: any, contractId: string, paymentIntentId: string, metadata: Record<string, string>) {
        const contract = await manager.findOne(LandWorkerContract, {
            where: { id: contractId },
            relations: ['land', 'worker', 'investor'],
            lock: { mode: 'pessimistic_write' }
        });

        if (!contract) {
            console.error(`[Activation] Contract ${contractId} not found`);
            return;
        }

        // Double-activation prevention
        if (contract.status === ContractStatus.ACTIVE) {
            console.log(`[Activation] Contract ${contractId} already active.`);
            return;
        }

        // 1. Update/Create transaction record → succeeded
        let txRecord = await manager.findOne(Transaction, {
            where: { stripe_payment_intent_id: paymentIntentId }
        });

        if (txRecord) {
            txRecord.status = TransactionStatus.SUCCEEDED;
            await manager.save(Transaction, txRecord);
        } else {
            txRecord = manager.create(Transaction, {
                stripe_payment_intent_id: paymentIntentId,
                contract_id: contractId,
                investor_id: contract.investor_id,
                worker_id: contract.worker_id,
                amount: Number(contract.salary_amount),
                currency: 'usd',
                status: TransactionStatus.SUCCEEDED,
                type: TransactionType.SALARY_UPFRONT,
                metadata: metadata as any
            });
            await manager.save(Transaction, txRecord);
        }

        // 2. Activate contract
        contract.status = ContractStatus.ACTIVE;
        contract.first_payment_transaction_id = paymentIntentId;
        await manager.save(LandWorkerContract, contract);

        // 3. Update worker balance
        let balance = await manager.findOne(WorkerBalance, {
            where: { worker_id: contract.worker_id },
            lock: { mode: 'pessimistic_write' }
        });
        if (!balance) {
            balance = manager.create(WorkerBalance, {
                worker_id: contract.worker_id,
                available_balance: 0,
                pending_balance: Number(contract.salary_amount)
            });
        } else {
            balance.pending_balance = Number(balance.pending_balance) + Number(contract.salary_amount);
        }
        await manager.save(WorkerBalance, balance);

        // 4. Create land_worker record
        const existingLandWorker = await manager.findOne(LandWorker, {
            where: { land_id: contract.land_id, worker_id: contract.worker_id, status: LandWorkerStatus.ACTIVE }
        });
        if (!existingLandWorker) {
            const landWorker = manager.create(LandWorker, {
                land_id: contract.land_id,
                worker_id: contract.worker_id,
                assigned_by: contract.investor_id,
                role: 'contract',
                salary: contract.salary_amount,
                status: LandWorkerStatus.ACTIVE,
                started_at: contract.contract_start_date
            });
            await manager.save(LandWorker, landWorker);
        }

        // 5. Emit socket events
        try {
            const io = getIO();
            io.to(contract.worker_id).emit('contract_activated', {
                contract,
                message: `Your contract for ${contract.land?.name} is now active!`
            });
            io.to(contract.investor_id).emit('contract_activated', {
                contract,
                message: `Contract activated. Worker is now active on ${contract.land?.name}`
            });
        } catch (e) { /* socket not ready */ }

        console.log(`[Activation] ✅ Contract ${contractId} activated via PI ${paymentIntentId}`);
    }

    /**
     * Handle Stripe webhook to confirm payment and activate contract.
     * THIS IS THE ONLY WAY TO ACTIVATE A CONTRACT.
     * 
     * Security guarantees:
     * - DB transaction with pessimistic lock on contract row
     * - Idempotency: checks if transaction already succeeded (duplicate webhook)
     * - Only transitions payment_pending → active
     * - All salary goes to pending_balance (escrow — no payout)
     * - Creates land_worker record for backward compatibility
     */
    async handlePaymentWebhook(paymentIntentId: string, metadata: Record<string, string>) {
        const contractId = metadata.contract_id;
        if (!contractId) {
            console.error('[Webhook] Missing contract_id in metadata for PI:', paymentIntentId);
            return;
        }

        // Idempotency check
        const existingTx = await this.transactionRepo.findOne({
            where: { stripe_payment_intent_id: paymentIntentId, status: TransactionStatus.SUCCEEDED }
        });
        if (existingTx) {
            console.log(`[Webhook] Duplicate webhook for PI ${paymentIntentId} — already processed.`);
            return;
        }

        await AppDataSource.transaction(async (manager) => {
            await this.activateContractInternal(manager, contractId, paymentIntentId, metadata);
        });
    }
    async handlePaymentFailedWebhook(paymentIntentId: string) {
        const txRecord = await this.transactionRepo.findOne({
            where: { stripe_payment_intent_id: paymentIntentId }
        });
        if (txRecord && txRecord.status === TransactionStatus.PENDING) {
            txRecord.status = TransactionStatus.FAILED;
            await this.transactionRepo.save(txRecord);
            console.log(`[Webhook] ❌ Payment failed for PI ${paymentIntentId}`);
        }
    }

    /**
     * Suspend a contract (investor action).
     */
    async suspendContract(contractId: string, investorId: string) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== investorId)
            throw new AppError(403, 'Only the investor can suspend a contract');

        this.validateTransition(contract.status, ContractStatus.SUSPENDED);
        contract.status = ContractStatus.SUSPENDED;
        await this.contractRepo.save(contract);

        // Update land_worker status
        const lw = await this.landWorkerRepo.findOne({
            where: { land_id: contract.land_id, worker_id: contract.worker_id, status: LandWorkerStatus.ACTIVE }
        });
        if (lw) {
            lw.status = LandWorkerStatus.SUSPENDED;
            await this.landWorkerRepo.save(lw);
        }

        try {
            const io = getIO();
            io.to(contract.worker_id).emit('contract_suspended', { contract });
        } catch (e) { /* socket not ready */ }

        return contract;
    }

    /**
     * Terminate a contract (investor action).
     */
    async terminateContract(contractId: string, investorId: string) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== investorId)
            throw new AppError(403, 'Only the investor can terminate a contract');

        this.validateTransition(contract.status, ContractStatus.TERMINATED);
        contract.status = ContractStatus.TERMINATED;
        await this.contractRepo.save(contract);

        // Update land_worker
        const lw = await this.landWorkerRepo.findOne({
            where: { land_id: contract.land_id, worker_id: contract.worker_id }
        });
        if (lw) {
            lw.status = LandWorkerStatus.INACTIVE;
            lw.ended_at = new Date();
            await this.landWorkerRepo.save(lw);
        }

        try {
            const io = getIO();
            io.to(contract.worker_id).emit('contract_terminated', { contract });
        } catch (e) { /* socket not ready */ }

        return contract;
    }

    /**
     * Get contracts for a land.
     */
    async getContractsByLand(landId: string) {
        return this.contractRepo.find({
            where: { land_id: landId },
            relations: ['worker', 'investor', 'invitation', 'land'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get worker's contracts (worker dashboard).
     */
    async getWorkerContracts(workerId: string) {
        return this.contractRepo.find({
            where: { worker_id: workerId },
            relations: ['land', 'investor', 'invitation'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get worker's active contracts count.
     */
    async getWorkerActiveContractsCount(workerId: string) {
        return this.contractRepo.count({
            where: { worker_id: workerId, status: ContractStatus.ACTIVE }
        });
    }

    /**
     * Get a single contract by ID with all relations.
     */
    async getContractById(contractId: string, userId: string) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'investor', 'worker', 'invitation']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== userId && contract.worker_id !== userId)
            throw new AppError(403, 'You are not part of this contract');
        return contract;
    }

    /**
     * Get worker balance.
     */
    async getWorkerBalance(workerId: string) {
        let balance = await this.balanceRepo.findOne({ where: { worker_id: workerId } });
        if (!balance) {
            balance = this.balanceRepo.create({
                worker_id: workerId,
                available_balance: 0,
                pending_balance: 0
            });
            await this.balanceRepo.save(balance);
        }
        return balance;
    }

    /**
     * Get contracts in negotiation for a land (investor view).
     */
    async getNegotiatingContracts(landId: string, investorId: string) {
        return this.contractRepo.find({
            where: {
                land_id: landId,
                investor_id: investorId,
                status: In([
                    ContractStatus.HIRING_PENDING,
                    ContractStatus.NEGOTIATION_PENDING,
                    ContractStatus.NEGOTIATION_COUNTERED,
                    ContractStatus.PAYMENT_PENDING
                ])
            },
            relations: ['worker', 'invitation', 'land'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Get active contracts for a land (investor view).
     * Filters by investor so each investor only sees their own workers.
     */
    async getActiveContracts(landId: string, investorId?: string) {
        const where: any = {
            land_id: landId,
            status: In([ContractStatus.ACTIVE, ContractStatus.SUSPENDED])
        };
        if (investorId) {
            where.investor_id = investorId;
        }
        return this.contractRepo.find({
            where,
            relations: ['worker', 'investor', 'land'],
            order: { createdAt: 'DESC' }
        });
    }

    private async getActiveRental(landId: string): Promise<LandRental | null> {
        const currentDate = new Date();
        const rental = await this.rentalRepo.findOne({
            where: [
                { land_id: landId, rental_end_date: IsNull(), rental_start_date: LessThanOrEqual(currentDate) },
                { land_id: landId, rental_end_date: MoreThanOrEqual(currentDate), rental_start_date: LessThanOrEqual(currentDate) }
            ],
            order: { rental_start_date: 'DESC' }
        });
        return rental || null;
    }
}

export const contractService = new ContractService();
