import { Request, Response } from 'express';
import { JobApplicationService } from '../../services/JobApplicationService.js';
import { JobApplicationStatus } from '../../models/index.js';

export class JobApplicationController {
    static async apply(req: Request, res: Response) {
        try {
            const { jobId } = req.params;
            const { notes } = req.body;
            const workerId = (req as any).user.id;

            const application = await JobApplicationService.applyToJob(jobId, workerId, notes);
            res.status(201).json(application);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getMyApplications(req: Request, res: Response) {
        try {
            const workerId = (req as any).user.id;
            const applications = await JobApplicationService.getMyApplications(workerId);
            res.json(applications);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    static async getJobApplications(req: Request, res: Response) {
        try {
            const { jobId } = req.params;
            const farmerId = (req as any).user.id;
            const applications = await JobApplicationService.getJobApplications(jobId, farmerId);
            res.json(applications);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const { applicationId } = req.params;
            const { status } = req.body;
            const farmerId = (req as any).user.id;

            if (!Object.values(JobApplicationStatus).includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }

            const application = await JobApplicationService.updateStatus(applicationId, farmerId, status);
            res.json(application);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}
