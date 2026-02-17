import { Response, NextFunction } from 'express';
import { contractService } from '../../services/v1/contract.service.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const hireWorker = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.hireWorker(
            req.params.landId as string,
            req.user!.id,
            {
                invitation_id: req.body.invitation_id,
                salary_amount: req.body.salary_amount,
                salary_type: req.body.salary_type,
                contract_start_date: req.body.contract_start_date,
                contract_end_date: req.body.contract_end_date,
                message: req.body.message
            }
        );
        res.status(201).json({ success: true, message: 'Hiring proposal sent', data: result });
    } catch (error) { next(error); }
};

export const respondToContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.respondToContract(
            req.params.id as string,
            req.user!.id,
            req.body.response
        );
        res.status(200).json({ success: true, message: `Contract ${req.body.response}d`, data: result });
    } catch (error) { next(error); }
};

export const investorRespondToContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.investorRespondToContract(
            req.params.id as string,
            req.user!.id,
            req.body.response
        );
        res.status(200).json({ success: true, message: `Contract ${req.body.response}ed`, data: result });
    } catch (error) { next(error); }
};

export const negotiateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.negotiateContract(
            req.params.id as string,
            req.user!.id,
            {
                comment: req.body.comment,
                proposed_salary_amount: req.body.proposed_salary_amount,
                proposed_salary_type: req.body.proposed_salary_type
            }
        );
        res.status(200).json({ success: true, message: 'Negotiation submitted', data: result });
    } catch (error) { next(error); }
};

export const getNegotiationHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getNegotiationHistory(req.params.id as string, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const editNegotiation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.editNegotiation(
            req.params.id as string,
            req.params.negotiationId as string,
            req.user!.id,
            {
                comment: req.body.comment,
                proposed_salary_amount: req.body.proposed_salary_amount,
                proposed_salary_type: req.body.proposed_salary_type
            }
        );
        res.status(200).json({ success: true, message: 'Negotiation updated', data: result });
    } catch (error) { next(error); }
};

export const deleteNegotiation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.deleteNegotiation(
            req.params.id as string,
            req.params.negotiationId as string,
            req.user!.id
        );
        res.status(200).json({ success: true, message: 'Negotiation withdrawn', data: result });
    } catch (error) { next(error); }
};

export const createContractPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.createContractPayment(req.params.id as string, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getContractsByLand = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getContractsByLand(req.params.landId as string);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getWorkerContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getWorkerContracts(req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getContractById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getContractById(req.params.id as string, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const suspendContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.suspendContract(req.params.id as string, req.user!.id);
        res.status(200).json({ success: true, message: 'Contract suspended', data: result });
    } catch (error) { next(error); }
};

export const terminateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.terminateContract(req.params.id as string, req.user!.id);
        res.status(200).json({ success: true, message: 'Contract terminated', data: result });
    } catch (error) { next(error); }
};

export const getNegotiatingContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getNegotiatingContracts(req.params.landId as string, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getActiveContracts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getActiveContracts(req.params.landId as string, req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getWorkerBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getWorkerBalance(req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// Stripe Webhook Handler (raw body required, no auth)
export const stripeWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const rawSig = req.headers['stripe-signature'];
        const sig: string = Array.isArray(rawSig) ? rawSig[0] : (rawSig || '');

        if (!sig) {
            res.status(400).json({ error: 'Missing stripe-signature header' });
            return;
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured');
            res.status(500).json({ error: 'Webhook secret not configured' });
            return;
        }

        // Import stripeService for signature verification
        const { stripeService } = await import('../../services/v1/StripeService.js');

        let event: any;
        try {
            event = stripeService.constructWebhookEvent(
                (req as any).rawBody || req.body,
                sig,
                webhookSecret
            );
        } catch (err: any) {
            console.error(`[Webhook] Signature verification failed: ${err.message}`);
            res.status(400).json({ error: `Webhook signature verification failed` });
            return;
        }

        // Handle supported event types
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const metadata = paymentIntent.metadata || {};
                console.log(`[Webhook] payment_intent.succeeded: ${paymentIntent.id}, contract: ${metadata.contract_id}`);

                if (metadata.contract_id && metadata.type === 'salary_upfront') {
                    await contractService.handlePaymentWebhook(paymentIntent.id, metadata);
                }
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`[Webhook] payment_intent.payment_failed: ${paymentIntent.id}`);
                await contractService.handlePaymentFailedWebhook(paymentIntent.id);
                break;
            }
            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        // Always return 200 to acknowledge receipt (Stripe retries on non-2xx)
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook] Unexpected error:', error);
        // Still return 200 to prevent Stripe retries on our internal errors
        res.status(200).json({ received: true });
    }
};
