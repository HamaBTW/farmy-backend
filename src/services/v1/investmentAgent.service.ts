import Groq from 'groq-sdk';
import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';

// Initialize Groq SDK. Make sure GROQ_API_KEY is available in your .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

export class InvestmentAgentService {
    async getRecommendations(investorPreferences: string) {
        if (!process.env.GROQ_API_KEY) {
            console.warn('GROQ_API_KEY is missing, using a dummy or will throw an error from SDK.');
        }

        const landRepo = AppDataSource.getRepository(Land);
        const workerRepo = AppDataSource.getRepository(WorkerProfile);

        // Fetch top farms / active lands
        const lands = await landRepo.find({
            where: { is_active: true },
            relations: ['owner'],
            take: 15
        });

        const availableFarms = [];

        for (const land of lands) {
            // Find worker profile for farmer reliability
            const worker = await workerRepo.findOne({ where: { user_id: land.owner_id } });
            
            // Mock weather risk based on a random factor or coordinate
            const weatherRiskScore = (Math.random() * 10).toFixed(1); 
            
            const reliability = worker ? {
                rating: worker.rating,
                completedTasks: worker.completed_tasks,
                onTimeRate: worker.on_time_rate
            } : { rating: 0, completedTasks: 0, onTimeRate: 0 };

            availableFarms.push({
                farmId: land.id,
                farmName: land.name,
                price: land.price,
                weatherRiskScore: `${weatherRiskScore}/10`,
                farmerReliability: reliability
            });
        }

        const prompt = `
You are an expert AI investment advisor for an agritech platform.
An investor wants recommendations on where to invest their money.
"Diversify across 3 farms" is optimal to mitigate risks.
Please analyze the following available farms and recommend the 3 best ones based on:
1. Low weather risk.
2. High farmer reliability (rating, completed tasks, on-time rate).

Investor Preferences: ${investorPreferences || 'Maximize return, minimize risk'}

Available Farms:
${JSON.stringify(availableFarms, null, 2)}

Provide a concise, analytical response recommending exactly 3 farms and explaining why they create a good diversified portfolio. Return the response in Markdown format.
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a smart investment recommendation system for an agritech platform.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.1-8b-instant',
            });

            return {
                recommendation: completion.choices[0]?.message?.content || 'No recommendation could be generated.',
                analyzedFarms: availableFarms.length
            };
        } catch (error: any) {
            console.error('[InvestmentAgentService] Groq API Error:', error);
            throw new Error('Failed to communicate with Groq AI API');
        }
    }
}

export const investmentAgentService = new InvestmentAgentService();
