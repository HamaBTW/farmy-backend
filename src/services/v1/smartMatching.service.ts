import { AppDataSource } from '../../config/db.config.js';
import { User } from '../../models/User.js';
import { Product, ProductStatus } from '../../models/Product.js';
import { Land } from '../../models/Land.js';
import { AppError } from '../../middlewares/error.middleware.js';
import axios from 'axios';

interface MatchScore {
  id: string;
  score: number;
  reasoning: string;
  matchFactors: {
    distanceScore: number;
    budgetScore: number;
    availabilityScore: number;
    qualityScore: number;
  };
}

class SmartMatchingService {
  private userRepo = AppDataSource.getRepository(User);
  private productRepo = AppDataSource.getRepository(Product);
  private landRepo = AppDataSource.getRepository(Land);

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Score distance: closer = higher score
   */
  private scoreDistance(distance: number): number {
    // 0 km = 100, 100 km = 0
    return Math.max(0, 100 - distance);
  }

  /**
   * Call Groq AI for intelligent ranking
   */
  private async callGroqForRanking(
    userProfile: any,
    items: any[],
    context: 'products' | 'lands'
  ): Promise<Map<string, MatchScore>> {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ GROQ_API_KEY not set, using default scoring');
        return new Map();
      }

      const prompt = this._buildRankingPrompt(userProfile, items, context);

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0]?.message?.content || '{}';
      const scores = this._parseGroqResponse(content);
      return scores;
    } catch (error) {
      console.error('❌ Groq ranking error:', error);
      return new Map();
    }
  }

  /**
   * Build prompt for Groq to rank items
   */
  private _buildRankingPrompt(
    userProfile: any,
    items: any[],
    context: 'products' | 'lands'
  ): string {
    if (context === 'products') {
      return `
      You are a smart farm product matching assistant. Rank these products for a customer based on relevance.
      
      Customer Profile:
      - Location: ${userProfile.location ? `${userProfile.location.latitude}, ${userProfile.location.longitude}` : 'Unknown'}
      - Budget: ${userProfile.profile?.budget || 'Any'}
      - Interests: ${userProfile.profile?.interests?.join(', ') || 'General'}
      - Preferences: ${userProfile.profile?.preferences?.join(', ') || 'Any'}
      
      Products:
      ${items
        .map(
          (p, i) => `
      ${i + 1}. "${p.title}"
         - Price: ${p.price} credits
         - Quantity: ${p.quantity} ${p.unit}
         - Owner Location: ${p.owner?.location ? `${p.owner.location.latitude}, ${p.owner.location.longitude}` : 'Unknown'}
         - Description: ${p.description || 'N/A'}
         - Type: ${p.product_type?.name || 'Unknown'}
      `
        )
        .join('')}
      
      Rank these products and return a JSON object with format:
      {
        "rankings": [
          {"id": "product-id", "score": 85, "reasoning": "Close location and good value"},
          ...
        ]
      }
      
      Consider: distance proximity, price fit, item freshness/availability, quality.
      `;
    } else {
      return `
      You are a smart farm land investment matching assistant. Rank these lands for an investor.
      
      Investor Profile:
      - Location: ${userProfile.location ? `${userProfile.location.latitude}, ${userProfile.location.longitude}` : 'Unknown'}
      - Budget: ${userProfile.profile?.budget || 'Any'} credits/month
      - Experience: ${userProfile.profile?.experience || 'N/A'}
      - Investment Interests: ${userProfile.profile?.interests?.join(', ') || 'General'}
      - Risk Tolerance: ${userProfile.profile?.riskTolerance || 'Moderate'}
      
      Available Lands:
      ${items
        .map(
          (l, i) => `
      ${i + 1}. "${l.name}"
         - Size: ${l.width_m}m × ${l.height_m}m (${(l.width_m * l.height_m) / 10000} hectares)
         - Owner Location: ${l.owner?.location ? `${l.owner.location.latitude}, ${l.owner.location.longitude}` : 'Unknown'}
         - Description: ${l.description || 'N/A'}
         - Monthly Cost: ${l.monthly_rent || 'Variable'} credits/month
      `
        )
        .join('')}
      
      Rank these lands and return a JSON object with format:
      {
        "rankings": [
          {"id": "land-id", "score": 90, "reasoning": "Perfect size, close location, good ROI potential"},
          ...
        ]
      }
      
      Consider: location proximity, size fit for investment, cost efficiency, scalability potential.
      `;
    }
  }

  /**
   * Parse Groq JSON response
   */
  private _parseGroqResponse(content: string): Map<string, MatchScore> {
    const scores = new Map<string, MatchScore>();
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.rankings && Array.isArray(data.rankings)) {
          data.rankings.forEach((item: any) => {
            scores.set(item.id, {
              id: item.id,
              score: item.score || 0,
              reasoning: item.reasoning || '',
              matchFactors: {
                distanceScore: 0,
                budgetScore: 0,
                availabilityScore: 0,
                qualityScore: 0
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to parse Groq response:', error);
    }
    return scores;
  }

  /**
   * Get smart product recommendations for a customer
   */
  async getSmartProductRecommendations(userId: string, limit: number = 10) {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (!user.location) {
        throw new AppError(400, 'User location not set. Please update your location in settings.');
      }

      // Fetch all available products with owner info
      const products = await this.productRepo.find({
        where: { status: ProductStatus.AVAILABLE },
        relations: ['owner', 'product_type', 'land'],
        take: 100
      });

      if (products.length === 0) {
        console.log('ℹ️ No available products found');
        return [];
      }

      console.log(`🔍 Found ${products.length} products, calculating scores...`);

      // Calculate scores for each product
      const scoredProducts = products.map((product) => {
        const scores = this._calculateProductScore(user, product);
        return {
          ...product,
          matchScore: scores.total,
          matchFactors: scores.factors
        };
      });

      // Get AI-based ranking from Groq
      const groqScores = await this.callGroqForRanking(user, products, 'products');

      // Combine scores: 60% traditional scoring, 40% AI scoring
      const finalScored = scoredProducts.map((item) => {
        const groqScore = groqScores.get(item.id);
        const finalScore = item.matchScore * 0.6 + (groqScore?.score || item.matchScore) * 0.4;
        return {
          ...item,
          finalScore,
          aiReasoning: groqScore?.reasoning || 'Recommended based on location and availability'
        };
      });

      // Sort by score and return top results
      const recommended = finalScored
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, limit);

      console.log(`✅ Returning ${recommended.length} recommended products`);
      return recommended;
    } catch (error) {
      console.error('❌ Smart product recommendation error:', error);
      throw error;
    }
  }

  /**
   * Get smart land recommendations for an investor
   */
  async getSmartLandRecommendations(userId: string, limit: number = 10) {
    try {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (!user.location) {
        throw new AppError(400, 'User location not set. Please update your location in settings.');
      }

      // Fetch all available lands with owner info
      const lands = await this.landRepo.find({
        where: { is_active: true },
        relations: ['owner'],
        take: 100
      });

      if (lands.length === 0) {
        console.log('ℹ️ No available lands found');
        return [];
      }

      console.log(`🔍 Found ${lands.length} lands, calculating scores...`);

      // Calculate scores for each land
      const scoredLands = lands.map((land) => {
        const scores = this._calculateLandScore(user, land);
        return {
          ...land,
          matchScore: scores.total,
          matchFactors: scores.factors
        };
      });

      // Get AI-based ranking from Groq
      const groqScores = await this.callGroqForRanking(user, lands, 'lands');

      // Combine scores: 60% traditional scoring, 40% AI scoring
      const finalScored = scoredLands.map((item) => {
        const groqScore = groqScores.get(item.id);
        const finalScore = item.matchScore * 0.6 + (groqScore?.score || item.matchScore) * 0.4;
        return {
          ...item,
          finalScore,
          aiReasoning: groqScore?.reasoning || 'Recommended based on location and availability'
        };
      });

      // Sort by score and return top results
      const recommended = finalScored
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, limit);

      console.log(`✅ Returning ${recommended.length} recommended lands`);
      return recommended;
    } catch (error) {
      console.error('❌ Smart land recommendation error:', error);
      throw error;
    }
  }

  /**
   * Calculate product match score
   */
  private _calculateProductScore(user: any, product: any) {
    let distanceScore = 50; // Default if no location
    let budgetScore = 100; // Default if no budget constraint
    let availabilityScore = 0;
    let qualityScore = 50;

    // Distance scoring
    if (user.location && product.owner?.location) {
      const distance = this.calculateDistance(
        user.location.latitude,
        user.location.longitude,
        product.owner.location.latitude,
        product.owner.location.longitude
      );
      distanceScore = this.scoreDistance(distance);
    }

    // Budget scoring
    if (user.profile?.budget && product.price) {
      const budgetRatio = product.price / (user.profile.budget || 1);
      budgetScore = budgetRatio <= 1.5 ? 100 : Math.max(0, 100 - budgetRatio * 20);
    }

    // Availability scoring
    availabilityScore = product.quantity > 0 ? 100 : 0;

    // Quality scoring based on product details
    const hasDescription = !!product.description;
    const hasImages = product.images && product.images.length > 0;
    qualityScore = (hasDescription ? 50 : 0) + (hasImages ? 50 : 0);

    const total = (distanceScore * 0.4 + budgetScore * 0.3 + availabilityScore * 0.2 + qualityScore * 0.1) / 100 * 100;

    return {
      total: Math.min(100, Math.max(0, total)),
      factors: {
        distanceScore,
        budgetScore,
        availabilityScore,
        qualityScore
      }
    };
  }

  /**
   * Calculate land match score
   */
  private _calculateLandScore(user: any, land: any) {
    let distanceScore = 50;
    let sizeScore = 100;
    let costScore = 100;
    let qualityScore = 50;

    // Distance scoring
    if (user.location && land.owner?.location) {
      const distance = this.calculateDistance(
        user.location.latitude,
        user.location.longitude,
        land.owner.location.latitude,
        land.owner.location.longitude
      );
      distanceScore = this.scoreDistance(distance);
    }

    // Size preference scoring
    const landSize = (land.width_m * land.height_m) / 10000; // hectares
    const preferredSize = user.profile?.preferredLandSize || 5;
    const sizeDiff = Math.abs(landSize - preferredSize) / preferredSize;
    sizeScore = Math.max(0, 100 - sizeDiff * 50);

    // Cost scoring
    if (user.profile?.monthlyBudget && land.monthly_rent) {
      const costRatio = land.monthly_rent / (user.profile.monthlyBudget || 1);
      costScore = costRatio <= 1.5 ? 100 : Math.max(0, 100 - costRatio * 20);
    }

    // Quality scoring
    const hasDescription = !!land.description;
    const hasBoundaries = !!land.boundaries;
    qualityScore = (hasDescription ? 50 : 0) + (hasBoundaries ? 50 : 0);

    const total = (distanceScore * 0.4 + sizeScore * 0.3 + costScore * 0.2 + qualityScore * 0.1) / 100 * 100;

    return {
      total: Math.min(100, Math.max(0, total)),
      factors: {
        distanceScore,
        budgetScore: costScore,
        availabilityScore: sizeScore,
        qualityScore
      }
    };
  }
}

export const smartMatchingService = new SmartMatchingService();
