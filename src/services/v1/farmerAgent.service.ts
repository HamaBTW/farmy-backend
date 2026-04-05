import Groq from 'groq-sdk';
import axios from 'axios';
import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { VegetationVariant } from '../../models/VegetationVariant.js';
import { AnimalVariant } from '../../models/AnimalVariant.js';
import { User } from '../../models/User.js';
import { FarmerStrategySession } from '../../models/FarmerStrategySession.js'; 
import { In } from 'typeorm';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

export class FarmerAgentService {
    private sessionRepo = AppDataSource.getRepository(FarmerStrategySession);

    async getHistory(userId: string) {
        return await this.sessionRepo.find({
            where: { user_id: userId, is_active: true },
            order: { createdAt: 'DESC' },
            select: ['id', 'title', 'createdAt']
        });
    }

    async getSessionDetails(userId: string, sessionId: string) {
        return await this.sessionRepo.findOne({
            where: { id: sessionId, user_id: userId }
        });
    }

    async deleteSession(userId: string, sessionId: string) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId, user_id: userId } });
        if (session) {
            session.is_active = false;
            await this.sessionRepo.save(session);
            return true;
        }
        return false;
    }

    async getProfitAnalysis(userId: string, landId?: string, question?: string, sessionId?: string) {
        const itemRequestRepo = AppDataSource.getRepository(ItemRequest);
        const vegRepo = AppDataSource.getRepository(VegetationVariant);
        const animalRepo = AppDataSource.getRepository(AnimalVariant);

        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: userId } });
        const userCredits = user ? Number(user.credits) : 0;

        let session: FarmerStrategySession | null = null;
        if (sessionId) {
            session = await this.sessionRepo.findOne({ where: { id: sessionId, user_id: userId } });
        }

        // 1. Fetch current farm state
        const where: any = { user_id: userId };
        if (landId) where.land_id = landId;
        
        const myAssets = await itemRequestRepo.find({
            where,
            relations: ['placed_item']
        });

        const variantIds = myAssets.map(a => a.variant_id);
        const vegVariants = await vegRepo.find({ where: { id: In(variantIds) }, relations: ['type'] });
        const animalVariants = await animalRepo.find({ where: { id: In(variantIds) }, relations: ['type'] });
        
        const nameMap: Record<string, string> = {};
        vegVariants.forEach(v => nameMap[v.id] = `${v.variant_code} (${v.type.name})`);
        animalVariants.forEach(a => nameMap[a.id] = `${a.variant_code} (${a.type.name})`);

        const placedAssets = myAssets.filter(a => a.placed_item);
        const totalSpent = myAssets.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);

        const farmContext = {
            totalInvested: totalSpent,
            currentCredits: userCredits,
            activeAssetsCount: placedAssets.length,
            activeAssets: placedAssets.map(a => ({
                name: nameMap[a.variant_id] || 'Asset',
                invested: a.price_paid,
                status: 'Growing/Producing'
            }))
        };

        const currentMessages: any[] = session?.messages || [];
        if (question) {
            currentMessages.push({ role: 'user', content: question, timestamp: new Date().toISOString() });
        }

        const prompt = `
You are the "Farmy Production Guru". Help the FARMER maximize profit.
${question ? `Farmer's latest message: "${question}"` : 'Initial farm analysis.'}

IMPORTANT FINANCIAL RULES:
1. Always prioritize the user's 'currentCredits' budget.
2. DO NOT suggest purchases or upgrades that exceed 'currentCredits'.
3. If funds are low, suggest organic growth, soil preparation, or cost-cutting.

FARM STATE:
${JSON.stringify(farmContext)}

CONVERSATION HISTORY:
${JSON.stringify(currentMessages.slice(-5))}

MARKET TRENDS:
- Wheat: High Demand (+5% price)
- Tomatoes: Over-supply (-10% price)
- Labor: Shortage (+15% costs)
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a production analyst. Provide concise, bold, markdown-formatted harvest advice.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.1-8b-instant',
            });

            const analysis = completion.choices[0]?.message?.content || 'Analysis unavailable.';
            currentMessages.push({ role: 'assistant', content: analysis, timestamp: new Date().toISOString() });

            // Create or update session
            if (!session) {
                session = this.sessionRepo.create({
                    user_id: userId,
                    title: question ? (question.length > 30 ? question.substring(0, 30) + '...' : question) : 'Farm Analysis',
                    context_data: farmContext,
                    messages: currentMessages
                });
            } else {
                session.messages = currentMessages;
            }
            await this.sessionRepo.save(session);

            return {
                analysis,
                context: farmContext,
                sessionId: session.id
            };
        } catch (error) {
            console.error('[FarmerAgentService] Error:', error);
            throw new Error('Failed to reach the Production Guru');
        }
    }
}

export const farmerAgentService = new FarmerAgentService();
