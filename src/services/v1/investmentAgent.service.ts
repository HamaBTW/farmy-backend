import Groq from 'groq-sdk';
import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { InvestmentStrategySession } from '../../models/InvestmentStrategySession.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

// Simulated API Connectors for Dynamic Data
class DynamicDataProvider {
    static async getMarketData() {
        // In a real app, this would be an axios call to a market API
        return {
            grainPrice: `+${(Math.random() * 5).toFixed(1)}%`,
            oilseedTrend: Math.random() > 0.5 ? "Bullish" : "Stable",
            demandIndex: "High",
            fetchTime: new Date().toISOString()
        };
    }

    static async getWeatherData() {
        // In a real app, OpenWeatherMap or similar
        return {
            temperature: `${(20 + Math.random() * 12).toFixed(1)}°C`,
            humidity: `${(40 + Math.random() * 40).toFixed(0)}%`,
            alert: "None",
        };
    }
}

export class InvestmentAgentService {
    async getRecommendations(investorPreferences: string, userId: string, sessionId?: string, userContext?: any) {
        const landRepo = AppDataSource.getRepository(Land);
        const workerRepo = AppDataSource.getRepository(WorkerProfile);
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);

        let session: InvestmentStrategySession | null = null;
        let availableFarms = [];

        // Dynamic API Data
        const marketData = await DynamicDataProvider.getMarketData();
        const weatherForecast = await DynamicDataProvider.getWeatherData();

        if (sessionId) {
            session = await sessionRepo.findOne({ where: { id: sessionId, user_id: userId } });
            if (!session) throw new Error('Investment session not found');
            availableFarms = session.context_data || [];
        } else {
            const lands = await landRepo.find({
                where: { is_active: true },
                relations: ['owner'],
                take: 10
            });

            for (const land of lands) {
                const worker = await workerRepo.findOne({ where: { user_id: land.owner_id } });
                const weatherRiskScore = (Math.random() * 3 + 1).toFixed(1); 
                
                availableFarms.push({
                    id: land.id,
                    name: land.name,
                    price: land.price,
                    description: land.description,
                    weatherRiskScore: `${weatherRiskScore}/10`,
                    fullData: land,
                    farmer: worker ? {
                        id: worker.user_id,
                        rating: worker.rating,
                        completed_tasks: worker.completed_tasks,
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

        const minifiedFarms = availableFarms.map((f: any) => ({
            id: f.id,
            name: f.name,
            price: f.price,
            weatherRisk: f.weatherRiskScore,
            farmerRating: f.farmer?.rating || 'N/A'
        }));

        const prompt = `
You are the "Farmy Strategic Analyst". Be EXTREMELY concise. Respond ONLY about the farms/context below.

PLAYER CONTEXT (User's Current Estate):
${JSON.stringify(userContext || 'None')}

LIVE API TOOLS:
- Market: ${JSON.stringify(marketData)}
- Weather: ${JSON.stringify(weatherForecast)}

Context (Top Available Farms):
${JSON.stringify(minifiedFarms)}

Chat History (Last 2):
${JSON.stringify(session!.messages.slice(-2).map(m => ({ role: m.role, content: m.content.substring(0, 500) })))}

Instructions:
1. Suggest exactly 3 farms if asked.
2. If providing context analysis for revenue/portfolio, prioritize diversification.
3. Keep it under 100 words. Bullet points only. Use Markdown.
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a concise smart investment strategy assistant.' },
                    ...session!.messages.map(m => ({ role: m.role, content: m.content })),
                    { role: 'system', content: prompt }
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
                history: session!.messages,
                tools: {
                    market: marketData,
                    weather: weatherForecast
                }
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

    async deleteSession(userId: string, sessionId: string) {
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);
        await sessionRepo.delete({ id: sessionId, user_id: userId });
        return true;
    }
}

export const investmentAgentService = new InvestmentAgentService();
