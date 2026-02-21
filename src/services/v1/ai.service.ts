import { GoogleGenAI } from '@google/genai';

export interface AIImageVerificationResult {
    success: boolean;
    verified?: boolean;
    reasoning?: string;
    error?: string;
}

class AiService {
    private ai: GoogleGenAI;
    private model = 'gemma-3-27b-it';

    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY || '',
        });
    }

    /**
     * Analyzes an image using Gemma to determine if it meets a specific condition.
     * Expects the AI to return a JSON object with `verified` (boolean) and `reasoning` (string).
     */
    async verifyImage(
        imageBuffer: Buffer,
        imageType: string,
        condition: string
    ): Promise<AIImageVerificationResult> {
        try {
            if (!process.env.GEMINI_API_KEY) {
                return { success: false, error: 'GEMINI_API_KEY is not configured.' };
            }

            const base64Image = imageBuffer.toString('base64');
            const prompt = `Analyze this image to verify the following condition: "${condition}"

You are an automated verification system. You must return EXACTLY this JSON format and nothing else:
{
  "verified": true or false,
  "reasoning": "A concise explanation of why it is verified or rejected based on the image contents."
}

Do not include markdown blocks, just raw JSON. Be lenient but accurate; if the image reasonably shows the required action/item, mark it as true.`;

            const contents = [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                data: base64Image,
                                mimeType: imageType,
                            },
                        },
                        {
                            text: prompt,
                        },
                    ],
                },
            ];

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents,
            });

            const responseText = response.text || '';

            // Clean up potential markdown formatting around JSON
            const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const parsed = JSON.parse(cleanJsonString);
                if (typeof parsed.verified === 'boolean' && typeof parsed.reasoning === 'string') {
                    return {
                        success: true,
                        verified: parsed.verified,
                        reasoning: parsed.reasoning
                    };
                } else {
                    return { success: false, error: 'AI returned invalid JSON structure.' };
                }
            } catch (e) {
                return { success: false, error: 'Failed to parse AI response as JSON.' };
            }

        } catch (error) {
            console.error('[AiService] Error analyzing image:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown AI verification error'
            };
        }
    }
}

export const aiService = new AiService();
