import Groq from 'groq-sdk';
import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { InvestmentStrategySession } from '../../models/InvestmentStrategySession.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

export class InvestmentAgentService {
    async getRecommendations(investorPreferences: string, userId: string, sessionId?: string) {
        const landRepo = AppDataSource.getRepository(Land);
        const workerRepo = AppDataSource.getRepository(WorkerProfile);
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);

        let session: InvestmentStrategySession | null = null;
        let availableFarms = [];

        if (sessionId) {
            session = await sessionRepo.findOne({ where: { id: sessionId, user_id: userId } });
            if (!session) throw new Error('Investment session not found');
            availableFarms = session.context_data || [];
        } else {
            // First time - fetch farms and start session
            const lands = await landRepo.find({
                where: { is_active: true },
                relations: ['owner'],
                take: 10
            });

            for (const land of lands) {
                const worker = await workerRepo.findOne({ where: { user_id: land.owner_id } });
                const weatherRiskScore = (Math.random() * 5 + 1).toFixed(1); 
                
                availableFarms.push({
                    id: land.id,
                    name: land.name,
                    price: land.price,
                    description: land.description,
                    weatherRiskScore: `${weatherRiskScore}/10`,
                    farmer: worker ? {
                        id: worker.user_id,
                        rating: worker.rating,
                        completedTasks: worker.completed_tasks,
                        onTimeRate: worker.on_time_rate
                    } : null
                });
            }

            session = sessionRepo.create({
                user_id: userId,
                title: `Strategy: ${investorPreferences.substring(0, 30)}...`,
                context_data: availableFarms,
                messages: []
            });
        }

        session!.messages = [
            ...(session!.messages ?? []),
            { role: 'user' as const, content: investorPreferences, timestamp: new Date().toISOString() }
        ];

        const prompt = `
You are an expert AI Portfolio Strategist for "Farmy", an agritech platform.
The user is an investor. Analyze the available farms and provide strategic recommendations.

Context (Available Farms):
${JSON.stringify(availableFarms, null, 2)}

Chat History:
${JSON.stringify(session!.messages.slice(-5), null, 2)}

Instructions:
1. If this is the start, recommend exactly 3 farms with a diversification logic.
2. If the user asks questions about specific farms or choices, explain analytically.
3. Be professional, concise, and prioritize risk management (weather + farmer reliability).
4. Use Markdown. Refer to farms by their name.
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a smart investment strategy assistant for an agritech platform.' },
                    ...session!.messages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'system', content: prompt } // Re-injecting instructions
                ],
                model: 'llama-3.1-8b-instant',
            });

            const aiContent = completion.choices[0]?.message?.content || 'No strategy generated.';
            
            session!.messages = [
                ...(session!.messages ?? []),
                { role: 'assistant', content: aiContent, timestamp: new Date().toISOString() }
            ];

            await sessionRepo.save(session!);

            return {
                recommendation: aiContent,
                farms: availableFarms,
                sessionId: session!.id,
                history: session!.messages
            };
        } catch (error: any) {
            console.error('[InvestmentAgentService] Groq Error:', error);
            throw new Error('Failed to communicate with Groq AI API');
        }
    }

    async getHistory(userId: string) {
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);
        return await sessionRepo.find({
            where: { user_id: userId },
            order: { createdAt: 'DESC' }
        });
    }

    async getSession(userId: string, sessionId: string) {
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);
        return await sessionRepo.findOne({
            where: { id: sessionId, user_id: userId }
        });
    }
}

export const investmentAgentService = new InvestmentAgentService();
