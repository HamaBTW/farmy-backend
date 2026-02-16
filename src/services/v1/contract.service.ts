import { AppDataSource } from '../../config/db.config.js';
import { LandWorkerContract, ContractStatus, SalaryType, ContractProposer } from '../../models/LandWorkerContract.js';
import { LandWorkerInvitation, InvitationStatus } from '../../models/LandWorkerInvitation.js';
import { ContractNegotiation } from '../../models/ContractNegotiation.js';
import { WorkerBalance } from '../../models/WorkerBalance.js';
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
     * Worker responds to hiring proposal (approve/decline/negotiate).
     */
    async respondToContract(contractId: string, workerId: string, response: 'approve' | 'decline') {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'investor', 'worker']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.worker_id !== workerId) throw new AppError(403, 'Only the worker can respond to this contract');

        // Valid states for response
        const validStates = [ContractStatus.HIRING_PENDING, ContractStatus.NEGOTIATION_COUNTERED];
        if (!validStates.includes(contract.status))
            throw new AppError(400, `Cannot respond to contract with status: ${contract.status}`);

        if (response === 'approve') {
            // Worker approves -> payment_pending
            this.validateTransition(contract.status, ContractStatus.PAYMENT_PENDING);
            contract.status = ContractStatus.PAYMENT_PENDING;
            contract.current_proposer = ContractProposer.WORKER;
        } else {
            // Worker declines
            this.validateTransition(contract.status, ContractStatus.HIRING_DECLINED);
            contract.status = ContractStatus.HIRING_DECLINED;
        }

        const saved = await this.contractRepo.save(contract);

        // Emit socket event
        try {
            const io = getIO();
            const event = response === 'approve' ? 'contract_payment_required' : 'contract_created';
            io.to(contract.investor_id).emit(event, {
                contract: saved,
                response,
                message: response === 'approve'
                    ? `Worker approved the contract. Payment required.`
                    : `Worker declined the hiring proposal.`
            });
        } catch (e) { /* socket not ready */ }

        return saved;
    }

    /**
     * Investor responds to worker counter-offer or cancels the contract (accept/decline).
     */
    async investorRespondToContract(contractId: string, investorId: string, response: 'accept' | 'decline') {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'investor', 'worker']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.investor_id !== investorId)
            throw new AppError(403, 'Only the investor can respond to this contract');

        if (response === 'accept') {
            // Accept => payment_pending (valid from negotiation_pending, hiring_pending, negotiation_countered)
            const acceptableStates = [
                ContractStatus.NEGOTIATION_PENDING,
                ContractStatus.NEGOTIATION_COUNTERED,
                ContractStatus.HIRING_PENDING
            ];
            if (!acceptableStates.includes(contract.status))
                throw new AppError(400, `Cannot accept contract with status: ${contract.status}`);
            this.validateTransition(contract.status, ContractStatus.PAYMENT_PENDING);
            contract.status = ContractStatus.PAYMENT_PENDING;
            contract.current_proposer = ContractProposer.INVESTOR;

            // Create a system negotiation record for the acceptance
            const negotiation = this.negotiationRepo.create({
                contract_id: contractId,
                sender_id: investorId,
                comment: 'Offer accepted. Proceeding to payment.'
            });
            await this.negotiationRepo.save(negotiation);
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
            const negotiation = this.negotiationRepo.create({
                contract_id: contractId,
                sender_id: investorId,
                comment: 'Offer declined. This negotiation has been cancelled.'
            });
            await this.negotiationRepo.save(negotiation);
        }

        const saved = await this.contractRepo.save(contract);

        // Emit socket event to worker
        try {
            const io = getIO();
            const event = response === 'accept' ? 'contract_payment_required' : 'contract_terminated';
            io.to(contract.worker_id).emit(event, {
                contract: saved,
                response,
                message: response === 'accept'
                    ? `Investor accepted the terms. Payment in progress.`
                    : `Investor declined the negotiation.`
            });
            // Also notify investor's own sessions
            io.to(contract.investor_id).emit(event, {
                contract: saved,
                response
            });
        } catch (e) { /* socket not ready */ }

        return saved;
    }

    /**
     * Negotiate contract terms (either party can negotiate).
     */
    async negotiateContract(contractId: string, senderId: string, data: { comment: string; proposed_salary_amount?: number; proposed_salary_type?: string }) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'investor', 'worker']
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
        const negotiation = this.negotiationRepo.create({
            contract_id: contractId,
            sender_id: senderId,
            proposed_salary_amount: data.proposed_salary_amount || null,
            comment: data.comment.trim()
        });
        await this.negotiationRepo.save(negotiation);

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

        const saved = await this.contractRepo.save(contract);

        // Emit socket event
        try {
            const io = getIO();
            const targetId = isWorker ? contract.investor_id : contract.worker_id;
            io.to(targetId).emit('contract_negotiated', {
                contract: saved,
                negotiation,
                message: `New negotiation message on contract for ${contract.land?.name}`
            });
        } catch (e) { /* socket not ready */ }

        return { contract: saved, negotiation };
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
     * Create Stripe payment intent for first month salary.
     * Investor must pay before contract becomes active.
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

        // Ensure investor has a Stripe customer
        const investor = await this.userRepo.findOne({
            where: { id: investorId },
            select: ['id', 'email', 'profile', 'stripe_customer_id']
        });
        if (!investor) throw new AppError(404, 'Investor not found');

        let stripeCustomerId = investor.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripeService.createCustomer(investor.email, investor.profile?.name);
            stripeCustomerId = customer.id;
            investor.stripe_customer_id = stripeCustomerId;
            await this.userRepo.save(investor);
        }

        // Create payment intent with contract metadata
        const paymentIntent = await stripeService.createPaymentIntent(
            Number(contract.salary_amount),
            'tnd',
            stripeCustomerId
        );

        // Create ephemeral key for Stripe SDK
        const ephemeralKey = await stripeService.createEphemeralKey(stripeCustomerId);

        return {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            ephemeralKey: ephemeralKey.secret,
            customerId: stripeCustomerId,
            amount: contract.salary_amount,
            contractId: contract.id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        };
    }

    /**
     * Handle Stripe webhook to confirm payment and activate contract.
     * THIS IS THE ONLY WAY TO ACTIVATE A CONTRACT.
     */
    async handlePaymentWebhook(paymentIntentId: string, contractId: string) {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['land', 'worker', 'investor']
        });
        if (!contract) throw new AppError(404, 'Contract not found');
        if (contract.status !== ContractStatus.PAYMENT_PENDING)
            throw new AppError(400, 'Contract is not awaiting payment');

        // Activate contract
        contract.status = ContractStatus.ACTIVE;
        contract.first_payment_transaction_id = paymentIntentId;
        await this.contractRepo.save(contract);

        // Create/update worker balance - add salary to pending_balance
        let balance = await this.balanceRepo.findOne({ where: { worker_id: contract.worker_id } });
        if (!balance) {
            balance = this.balanceRepo.create({
                worker_id: contract.worker_id,
                available_balance: 0,
                pending_balance: Number(contract.salary_amount)
            });
        } else {
            balance.pending_balance = Number(balance.pending_balance) + Number(contract.salary_amount);
        }
        await this.balanceRepo.save(balance);

        // Create land_worker record for backward compatibility
        const existingLandWorker = await this.landWorkerRepo.findOne({
            where: { land_id: contract.land_id, worker_id: contract.worker_id, status: LandWorkerStatus.ACTIVE }
        });
        if (!existingLandWorker) {
            const landWorker = this.landWorkerRepo.create({
                land_id: contract.land_id,
                worker_id: contract.worker_id,
                assigned_by: contract.investor_id,
                role: 'contract',
                salary: contract.salary_amount,
                status: LandWorkerStatus.ACTIVE,
                started_at: contract.contract_start_date
            });
            await this.landWorkerRepo.save(landWorker);
        }

        // Emit socket events
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

        return contract;
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
        return this.rentalRepo.findOne({
            where: [
                { land_id: landId, rental_end_date: IsNull(), rental_start_date: LessThanOrEqual(currentDate) },
                { land_id: landId, rental_end_date: MoreThanOrEqual(currentDate), rental_start_date: LessThanOrEqual(currentDate) }
            ],
            order: { rental_start_date: 'DESC' }
        }) || null;
    }
}

export const contractService = new ContractService();
