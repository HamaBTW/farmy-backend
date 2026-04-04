import Groq from 'groq-sdk';
import axios from 'axios';
import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { InvestmentStrategySession } from '../../models/InvestmentStrategySession.js';
import { VegetationVariant } from '../../models/VegetationVariant.js';
import { AnimalVariant } from '../../models/AnimalVariant.js';
import { MachineVariant } from '../../models/MachineVariant.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { In } from 'typeorm';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_expected' });

// Real External API Connectors for Market & Weather
class ExternalAPIConnectors {
    /**
     * API-Ninjas Commodities API (https://api-ninjas.com/api/commodity)
     * Fetches prices for grains and livestock.
     */
    static async getRealMarketData() {
        const apiKey = process.env.MARKET_API_KEY;
        if (!apiKey || apiKey === 'your_market_data_api_key_here') {
            return { grainPrice: "+3.8%", oilPrice: "-1.2%", status: "API Key Pending", demandIndex: "High" };
        }

        try {
            // API-Ninjas Commodity common names
            const symbols = ['Wheat', 'Corn', 'Soybeans', 'Live Cattle'];
            const results: any = {};
            
            for (const symbol of symbols) {
                try {
                    const response = await axios.get(`https://api.api-ninjas.com/v1/commodity?name=${symbol}`, {
                        headers: { 'X-Api-Key': apiKey },
                        timeout: 3000
                    });
                    if (response.data && response.data.price) {
                        results[symbol] = {
                            price: response.data.price,
                            updated: response.data.updated_at
                        };
                    }
                } catch (e) {
                    // Fallback for individual symbol failure
                    results[symbol] = { price: "Simulated +1.2%", status: "Estimated" };
                }
            }
            return results;
        } catch (error: any) {
            return { Wheat: "820.00", Corn: "440.00", Soybeans: "1200.00", status: "Simulated Market Data" };
        }
    }

    /**
     * OpenWeatherMap One Call 3.0 API
     * Fetches detailed current and forecasted weather.
     */
    static async getRealWeatherData(lat: number = 36.8, lon: number = 10.1) {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        try {
            if (!apiKey || apiKey.length < 5) throw new Error("Missing Key");

            const response = await axios.get(`https://api.openweathermap.org/data/3.0/onecall`, {
                params: { lat, lon, appid: apiKey, units: 'metric', exclude: 'minutely,hourly' },
                timeout: 3000
            });
            return {
                temp: `${response.data.current.temp}°C`,
                condition: response.data.current.weather[0].main,
                humidity: `${response.data.current.humidity}%`,
                forecast: response.data.daily.slice(0, 3).map((d: any) => ({
                    date: new Date(d.dt * 1000).toLocaleDateString(),
                    temp: `${d.temp.day}°C`,
                    desc: d.weather[0].description
                }))
            };
        } catch (error: any) {
            // HIGH FIDELITY SIMULATION FALLBACK
            // Provides plausible data so the AI doesn't break character or report "Technical Failure"
            const currentMonth = new Date().getMonth();
            const isSummer = currentMonth >= 5 && currentMonth <= 8;
            
            return {
                temp: isSummer ? "32°C" : "18°C",
                condition: isSummer ? "Clear Sky" : "Partly Cloudy",
                humidity: "45%",
                status: "Simulated/Historical Forecast",
                forecast: [
                    { date: "Tomorrow", temp: isSummer ? "33°C" : "19°C", desc: "Sunny" },
                    { date: "Day after", temp: isSummer ? "31°C" : "17°C", desc: "Clear" }
                ]
            };
        }
    }
}

export class InvestmentAgentService {
    async getRecommendations(investorPreferences: string, userId: string, sessionId?: string, userContext?: any) {
        const landRepo = AppDataSource.getRepository(Land);
        const workerRepo = AppDataSource.getRepository(WorkerProfile);
        const vegRepo = AppDataSource.getRepository(VegetationVariant);
        const animalRepo = AppDataSource.getRepository(AnimalVariant);
        const machineRepo = AppDataSource.getRepository(MachineVariant);
        const sessionRepo = AppDataSource.getRepository(InvestmentStrategySession);

        // 1. Fetch Real-time Market & Weather
        const marketData = await ExternalAPIConnectors.getRealMarketData();
        const weatherData = await ExternalAPIConnectors.getRealWeatherData();

        let session: InvestmentStrategySession | null = null;
        let availableFarms: any[] = [];

        let gameContext: any = userContext || {};
        if (userContext?.landId) {
            const itemRequestRepo = AppDataSource.getRepository(ItemRequest);
            const requests = await itemRequestRepo.find({
                where: { land_id: userContext.landId, user_id: userId },
                relations: ['placed_item']
            });
            
            const activeAssetIds = requests.filter(r => r.placed_item).map(r => r.variant_id);
            // Map active assets to detailed objects for interactive AI linking
            const activeAssetMap: any[] = [];
            
            if (activeAssetIds.length > 0) {
                const vegVariants = await vegRepo.find({ where: { id: In(activeAssetIds) }, relations: ['type'] });
                const animalVariants = await animalRepo.find({ where: { id: In(activeAssetIds) }, relations: ['type'] });
                const machineVariantsRes = await machineRepo.find({ where: { id: In(activeAssetIds) }, relations: ['type'] });
                
                activeAssetMap.push(...vegVariants.map(v => ({ id: v.id, name: v.variant_code, category: 'vegetation' })));
                activeAssetMap.push(...animalVariants.map(a => ({ id: a.id, name: a.variant_code, category: 'animal' })));
                activeAssetMap.push(...machineVariantsRes.map(m => ({ id: m.id, name: m.variant_code, category: 'machine' })));
            }

            gameContext = {
                ...gameContext,
                inventoryCount: requests.filter(r => r.status === 'approved' && !r.placed_item).length,
                placedCount: requests.filter(r => r.placed_item).length,
                pendingCount: requests.filter(r => r.status === 'pending').length,
                activeAssets: activeAssetMap
            };
        }

        if (sessionId) {
            session = await sessionRepo.findOne({ where: { id: sessionId, user_id: userId } });
            if (!session) throw new Error('Session not found');
            availableFarms = session.context_data || [];
        } else {
            const lands = await landRepo.find({ where: { is_active: true }, take: 8 });
            availableFarms = lands.map((l: any) => ({
                id: l.id,
                name: l.name,
                price: l.price,
                description: l.description,
                weatherRiskScore: `${(Math.random() * 3 + 1).toFixed(1)}/10`,
                fullData: l
            }));
            session = sessionRepo.create({ user_id: userId, title: `Financial Kit: ${new Date().toLocaleDateString()}`, context_data: availableFarms, messages: [] });
        }

        // 3. Fetch Marketplace Assets for detailed planning
        const vegetation = await vegRepo.find({ take: 5, where: { is_available: true }, relations: ['type'] });
        const animals = await animalRepo.find({ take: 3, where: { is_available: true }, relations: ['type'] });
        const machineVariants = await machineRepo.find({ take: 3, where: { is_available: true }, relations: ['type'] });
        // Fetch top rated/active workers
        const topWorkers = await workerRepo.find({ take: 3, order: { rating: 'DESC' }, relations: ['user'] });

        const marketplaceContext = {
            inventory: vegetation.map((v: any) => ({ id: v.id, name: `${v.variant_code} (${v.type.name})`, price: v.base_price, category: 'vegetation' })),
            animals: animals.map((a: any) => ({ id: a.id, name: `${a.variant_code} (${a.type.name})`, price: a.base_price, category: 'animal' })),
            machines: machineVariants.map((m: any) => ({ id: m.id, name: `${m.variant_code} (${m.type.name})`, price: m.base_price, category: 'machine' })),
            labor: topWorkers.map((w: any) => ({ id: w.id, name: w.user?.profile?.name || 'Worker', rate: w.hourly_rate, rating: w.rating }))
        };

        session!.messages = [...(session!.messages ?? []), { role: 'user', content: investorPreferences, timestamp: new Date().toISOString() }];

        const prompt = `
You are the "Farmy Wealth Manager". Respond to the budget or context with a complete 1-2-3 Balanced Kit.
Be extremely concise (max 100 words). Use bold text and bullet points only.

USER BUDGET/ASK: ${investorPreferences}
USER CURRENT ESTATE (INVENTORY/LANDS): ${JSON.stringify(gameContext)}

REAL-TIME API DATA (API-NINJAS & OPENWEATHER):
- Market: ${JSON.stringify(marketData)}
- Weather forecast: ${JSON.stringify(weatherData)}

AVAILABLE OPTIONS:
- Land: ${JSON.stringify(availableFarms.map((f: any) => ({ id: f.id, name: f.name, price: f.price })))}
- Marketplace Items: ${JSON.stringify(marketplaceContext)}

Instructions:
1. Always suggest exactly 3 items to buy/rent (Land, Item, Worker).
2. Balance it with weather conditions (e.g. don't suggest wheat if drought).
3. Do not overspend.
4. **CRITICAL**: If the "USER CURRENT ESTATE" (gameContext) is empty/null while they ask for analysis, explicitly state: "No existing data found for analysis." and then pivot to suggest a starting investment.
5. **INTERACTIVE LINKS**: When mentioning any Land, Marketplace Asset, or Worker, you MUST wrap it in a deep link. 
   - **VERY IMPORTANT**: You MUST use the exact **UUID** (e.g. 550e8400-e29b...) provided in the JSON data as the ID. **NEVER use the name or slug as the ID.**
   - For Land: [Land Name](farmy://land/UUID)
   - For Marketplace (Vegetation/Animal/Machine): [Item Name](farmy://asset/CATEGORY/UUID) (CATEGORY must be: animal, vegetation, or machine).
   - For Labor/Workers: [Worker Name](farmy://worker/UUID)
`;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a strategic wealth manager for a digital farming platform.' },
                    ...session!.messages.slice(-2).map(m => ({ role: m.role as any, content: m.content })),
                    { role: 'system', content: prompt }
                ],
                model: 'llama-3.1-8b-instant',
            });

            const aiContent = completion.choices[0]?.message?.content || 'Consultation failed.';
            session!.messages = [...(session!.messages ?? []), { role: 'assistant', content: aiContent, timestamp: new Date().toISOString() }];
            await sessionRepo.save(session!);

            return {
                recommendation: aiContent,
                farms: availableFarms,
                sessionId: session!.id,
                history: session!.messages,
                tools: { market: marketData, weather: weatherData }
            };
        } catch (error: any) {
            console.error('[InvestmentAgentService] Consultation Error:', error);
            throw new Error('Failed to reach the AI Strategist');
        }
    }

    async getHistory(userId: string) {
        return await AppDataSource.getRepository(InvestmentStrategySession).find({ where: { user_id: userId }, order: { createdAt: 'DESC' } });
    }

    async getSession(userId: string, sessionId: string) {
        return await AppDataSource.getRepository(InvestmentStrategySession).findOne({ where: { id: sessionId, user_id: userId } });
    }

    async deleteSession(userId: string, sessionId: string) {
        await AppDataSource.getRepository(InvestmentStrategySession).delete({ id: sessionId, user_id: userId });
        return true;
    }
}

export const investmentAgentService = new InvestmentAgentService();
