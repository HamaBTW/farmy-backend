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

export const negotiateContract = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.negotiateContract(
            req.params.id as string,
            req.user!.id,
            {
                comment: req.body.comment,
                proposed_salary_amount: req.body.proposed_salary_amount
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
        const result = await contractService.getActiveContracts(req.params.landId as string);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

export const getWorkerBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await contractService.getWorkerBalance(req.user!.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
};

// Stripe Webhook Handler (raw body required)
export const stripeWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const rawSig = req.headers['stripe-signature'];
        const sig: string = Array.isArray(rawSig) ? rawSig[0] : (rawSig || '');

        if (!sig) {
            res.status(400).json({ error: 'Missing stripe-signature header' });
            return;
        }

        const stripe = (await import('stripe')).default;
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2026-01-28.clover',
        });

        let event: any;
        try {
            event = stripeInstance.webhooks.constructEvent(
                (req as any).rawBody || req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET || ''
            );
        } catch (err: any) {
            res.status(400).json({ error: `Webhook Error: ${err.message}` });
            return;
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const contractId = paymentIntent.metadata?.contract_id;

            if (contractId) {
                await contractService.handlePaymentWebhook(paymentIntent.id, contractId);
            }
        }

        res.status(200).json({ received: true });
    } catch (error) { next(error); }
};
