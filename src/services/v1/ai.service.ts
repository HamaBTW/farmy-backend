import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { Jimp } from 'jimp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AIImageVerificationResult {
    success: boolean;
    verified?: boolean;
    reasoning?: string;
    error?: string;
}

export interface AvatarGenerationResult {
    success: boolean;
    avatarUrl?: string;
    reasoning?: string;
    error?: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Base upload directory (relative to this file's location to shift between src and dist automatically)
const baseUploadDir = path.join(__dirname, '../../uploads');
const AVATAR_UPLOAD_DIR = path.join(baseUploadDir, 'avatar');

// Ensure avatar upload directory exists
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
    fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

class AiService {
    private ai: GoogleGenAI;
    private verifyModel = 'gemma-3-27b-it'; // Optimized for fast verification
    private generateModel = 'gemini-2.5-flash-lite'; // Multimodal generation capabilities

    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: GEMINI_API_KEY,
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
            if (!GEMINI_API_KEY) {
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
                model: this.verifyModel,
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

    /**
     * Generates an avatar using Gemini's native image generation.
     * Renames the previous Pixazo implementation to generateAvatarLegacy.
     */
    async generateAvatar(pictureUrl: string): Promise<AvatarGenerationResult> {
        try {
            if (!GEMINI_API_KEY) {
                return { success: false, error: 'GEMINI_API_KEY is not configured.' };
            }

            // --- Step 1: Fetch the profile picture and verify it's a human ---
            console.log('[AiService] Fetching profile picture for verification:', pictureUrl);
            const imageResponse = await axios.get(pictureUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            const contentType = (imageResponse.headers['content-type'] as string) || 'image/jpeg';

            const verification = await this.verifyImage(
                imageBuffer,
                contentType,
                'This image contains a clear, recognizable photo of a real human person (face clearly visible, selfie, portrait, or photo). Animals, cartoons, landscapes, objects, or AI-generated avatars do NOT count.'
            );

            if (!verification.success) {
                return { success: false, error: verification.error };
            }

            if (!verification.verified) {
                return {
                    success: false,
                    reasoning: verification.reasoning,
                    error: `Your profile picture does not appear to show a human person. ${verification.reasoning}`
                };
            }

            console.log('[AiService] Image verified as human. Generating avatar with Gemini...');

            const avatarPrompt = "Professional digital avatar portrait of the person in the image, vibrant illustration style, clean solid bright green (#00FF00) background only, detailed face, modern look, soft lighting, centered subject, no shadows on background, the background must be a completely uniform solid green color";

            const contents = [
                {
                    role: 'user',
                    parts: [
                        { text: avatarPrompt },
                        {
                            inlineData: {
                                mimeType: contentType,
                                data: imageBuffer.toString('base64'),
                            },
                        },
                    ],
                },
            ];

            const response = await this.ai.models.generateContent({
                model: this.generateModel,
                contents,
            });

            let generatedBuffer: Buffer | null = null;

            if (response.candidates && response.candidates.length > 0) {
                const parts = response.candidates[0].content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        generatedBuffer = Buffer.from(part.inlineData.data, 'base64');
                        break;
                    }
                }
            }

            if (!generatedBuffer) {
                return { success: false, error: 'Gemini did not return an image part.' };
            }

            console.log('[AiService] Gemini image generated successfully. Buffer size:', generatedBuffer.length);

            // --- Step 4: Background removal with Jimp ---
            const image = await Jimp.read(generatedBuffer);
            console.log('[AiService] Image read successfully. Dimensions:', image.bitmap.width, 'x', image.bitmap.height);

            // Chroma key: remove pixels that are "green enough"
            console.log('[AiService] Starting chroma key background removal...');
            const startScan = Date.now();
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (this: any, x: number, y: number, idx: number) {
                const r = this.bitmap.data[idx + 0];
                const g = this.bitmap.data[idx + 1];
                const b = this.bitmap.data[idx + 2];

                // Green dominance check: green channel significantly higher than red and blue
                const isGreen = g > 100 && g > r * 1.4 && g > b * 1.4;
                if (isGreen) {
                    this.bitmap.data[idx + 3] = 0; // set alpha to 0 (transparent)
                }
            });
            console.log('[AiService] Background removal finished in:', Date.now() - startScan, 'ms');

            // --- Step 5: Save PNG to uploads/avatar directory ---
            const filename = `avatar_${Date.now()}.png`;
            const outputPath = path.join(AVATAR_UPLOAD_DIR, filename);
            console.log('[AiService] Saving processed avatar to:', outputPath);

            await (image as any).write(outputPath);

            const avatarUrl = `/uploads/avatar/${filename}`;
            console.log('[AiService] Avatar saved successfully:', avatarUrl);

            return { success: true, avatarUrl };
        } catch (error) {
            console.error('[AiService] Error generating avatar with Gemini:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown generation error'
            };
        }
    }
}

export const aiService = new AiService();
