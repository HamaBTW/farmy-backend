import Groq from 'groq-sdk';
import axios from 'axios';
import { AppDataSource } from '../../config/db.config.js';
import { Land } from '../../models/Land.js';
import { WorkerProfile } from '../../models/WorkerProfile.js';
import { InvestmentStrategySession } from '../../models/InvestmentStrategySession.js';
import { VegetationVariant } from '../../models/VegetationVariant.js';
import { AnimalVariant } from '../../models/AnimalVariant.js';
import { MachineVariant } from '../../models/MachineVariant.js';

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
                const response = await axios.get(`https://api.api-ninjas.com/v1/commodity?name=${symbol}`, {
                    headers: { 'X-Api-Key': apiKey }
                });
                if (response.data && response.data.price) {
                    results[symbol] = {
                        price: response.data.price,
                        updated: response.data.updated_at
                    };
                }
            }
            return results;
        } catch (error: any) {
            console.error('[MarketAPI] Error:', error.message);
            return { error: "Market API unreachable or invalid key." };
        }
    }

    /**
     * OpenWeatherMap One Call 3.0 API
     * Fetches detailed current and forecasted weather.
     */
    static async getRealWeatherData(lat: number = 36.8, lon: number = 10.1) {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
            return { temp: "24°C", condition: "Sunny", status: "API Key Pending (Using Defaults)" };
        }

        try {
            const response = await axios.get(`https://api.openweathermap.org/data/3.0/onecall`, {
                params: { lat, lon, appid: apiKey, units: 'metric', exclude: 'minutely,hourly' }
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
            const isUnauthorized = error.response?.status === 401;
            console.error('[WeatherAPI] Error:', error.message, isUnauthorized ? '- Ensure you have subscribed to One Call 3.0 (with valid CC) in your OpenWeather dashboard.' : '');
            return { 
                error: isUnauthorized ? "Weather API Unauthorized (One Call 3.0 needs separate activation)" : "Weather API unreachable.",
                details: error.message 
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

        // 2. Fetch Marketplace Assets for detailed planning
        const vegetation = await vegRepo.find({ take: 5, where: { is_available: true }, relations: ['type'] });
        const animals = await animalRepo.find({ take: 3, where: { is_available: true }, relations: ['type'] });
        const machineVariants = await machineRepo.find({ take: 3, where: { is_available: true }, relations: ['type'] });
        const topWorkers = await workerRepo.find({ 
            take: 5, 
            order: { rating: 'DESC' }, 
            relations: ['user'] // 'profile' is a Column, not a Relation
        });

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
                fullData: l
            }));
            session = sessionRepo.create({ user_id: userId, title: `Financial Kit: ${new Date().toLocaleDateString()}`, context_data: availableFarms, messages: [] });
        }

        session!.messages = [...(session!.messages ?? []), { role: 'user', content: investorPreferences, timestamp: new Date().toISOString() }];

        const marketplaceContext = {
            inventory: vegetation.map((v: any) => ({ id: v.id, name: `${v.variant_code} (${v.type.name})`, price: v.base_price })),
            animals: animals.map((a: any) => ({ id: a.id, name: `${a.variant_code} (${a.type.name})`, price: a.base_price })),
            machines: machineVariants.map((m: any) => ({ id: m.id, name: `${m.variant_code} (${m.type.name})`, price: m.base_price })),
            labor: topWorkers.map((w: any) => ({ id: w.user_id, name: w.user?.profile?.name || 'Worker', rate: w.hourly_rate, rating: w.rating }))
        };

        const prompt = `
You are the "Farmy Wealth Manager". Respond to the budget or context with a complete 1-2-3 Starter Kit.
Be extremely concise (max 100 words). Use bold text and bullet points only.

USER BUDGET/ASK: ${investorPreferences}
USER CURRENT ESTATE: ${JSON.stringify(userContext || 'Empty')}

REAL-TIME API DATA (API-NINJAS & OPENWEATHER):
- Market: ${JSON.stringify(marketData)}
- Weather forecast: ${JSON.stringify(weatherData)}

AVAILABLE OPTIONS:
- Land: ${JSON.stringify(availableFarms.map((f: any) => ({ name: f.name, price: f.price })))}
- Marketplace Items: ${JSON.stringify(marketplaceContext)}

Instructions:
1. Always suggest exactly 3 items to buy/rent (Land, Item, Worker).
2. Balance it with weather conditions (e.g. don't suggest wheat if drought).
3. Do not overspend.
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
