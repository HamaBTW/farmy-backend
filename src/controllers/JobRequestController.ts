import { Request, Response } from 'express';
import { JobRequestService } from '../services/JobRequestService.js';

export class JobRequestController {
    static async create(req: Request, res: Response) {
        try {
            const farmer_id = (req as any).user.id;
            const jobRequest = await JobRequestService.createJobRequest({
                ...req.body,
                farmer_id
            });
            res.status(201).json(jobRequest);
        } catch (error: any) {
            console.error('Error creating job request:', error);
            res.status(400).json({ message: error.message });
        }
    }

    static async getAll(req: Request, res: Response) {
        try {
            const filters = req.query;
            const jobs = await JobRequestService.getJobRequests(filters);
            res.json(jobs);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getRecommended(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const jobs = await JobRequestService.getRecommendedJobs(userId);
            res.json(jobs);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
