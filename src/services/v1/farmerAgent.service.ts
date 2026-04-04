import Groq from 'groq-sdk';
import axios from 'axios';
import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { VegetationVariant } from '../../models/VegetationVariant.js';
import { AnimalVariant } from '../../models/AnimalVariant.js';
import { InvestmentStrategySession } from '../../models/InvestmentStrategySession.js'; // We can reuse the session model for history
import { In } from 'typeorm';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

export class FarmerAgentService {
    async getProfitAnalysis(userId: string, landId?: string, question?: string) {
        const itemRequestRepo = AppDataSource.getRepository(ItemRequest);
        const vegRepo = AppDataSource.getRepository(VegetationVariant);
        const animalRepo = AppDataSource.getRepository(AnimalVariant);

        // 1. Fetch current farm state
        const where: any = { user_id: userId };
        if (landId) where.land_id = landId;
        
        const myAssets = await itemRequestRepo.find({
            where,
            relations: ['placed_item']
        });

        // Resolve names for the AI
        const variantIds = myAssets.map(a => a.variant_id);
        const vegVariants = await vegRepo.find({ where: { id: In(variantIds) }, relations: ['type'] });
        const animalVariants = await animalRepo.find({ where: { id: In(variantIds) }, relations: ['type'] });
        
        const nameMap: Record<string, string> = {};
        vegVariants.forEach(v => nameMap[v.id] = `${v.variant_code} (${v.type.name})`);
        animalVariants.forEach(a => nameMap[a.id] = `${a.variant_code} (${a.type.name})`);

        const placedAssets = myAssets.filter(a => a.placed_item);
        const pendingAssets = myAssets.filter(a => a.status === 'pending');
        
        // Calculate total investment
        const totalSpent = myAssets.reduce((sum, a) => sum + Number(a.price_paid || 0), 0);

        const farmContext = {
            totalInvested: totalSpent,
            activeAssetsCount: placedAssets.length,
            pendingOrdersCount: pendingAssets.length,
            activeAssets: placedAssets.map(a => ({
                name: nameMap[a.variant_id] || 'Asset',
                invested: a.price_paid,
                status: 'Growing/Producing'
            }))
        };

        const prompt = `
You are the "Farmy Production Guru". Your job is to help the FARMER maximize profit.
${question ? `The Farmer has a specific question: "${question}"` : 'Analyze the current farm state and provide a Profit & Loss (P&L) insight.'}

FARM STATE:
${JSON.stringify(farmContext)}

MARKET TRENDS (STUB):
- Wheat: High Demand (+5% price)
- Tomatoes: Over-supply (-10% price)
- Work Labor: Seasonal shortage (Costs +15%)

Instructions:
1. Be encouraging but realistic.
2. Highlight the "ROI" (Return on Investment).
3. Provide 3 actionable tips (e.g. "Sell wheat now", "Wait to harvester tomatoes").
4. Keep it under 150 words.
5. Use markdown, bold text, and bullet points.
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a production analyst for a digital farming platform.' },
                    { role: 'user', content: prompt }
                ],
                model: 'llama-3.1-8b-instant',
            });

            return {
                analysis: completion.choices[0]?.message?.content || 'Analysis unavailable.',
                context: farmContext
            };
        } catch (error) {
            console.error('[FarmerAgentService] Error:', error);
            throw new Error('Failed to reach the Production Guru');
        }
    }
}

export const farmerAgentService = new FarmerAgentService();
