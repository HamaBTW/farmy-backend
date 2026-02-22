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

const PIXAZO_API_KEY = process.env.PIXAZO_API_KEY || '';
const PIXAZO_IMAGE_TO_IMAGE_URL = 'https://gateway.pixazo.ai/flux-dev/v1/dev/imageToImage';
const PIXAZO_STATUS_URL = 'https://gateway.pixazo.ai/flux-dev-polling/dev/getFluxDevStatus';

// Base upload directory (relative to this file's location to shift between src and dist automatically)
const baseUploadDir = path.join(__dirname, '../../uploads');
const AVATAR_UPLOAD_DIR = path.join(baseUploadDir, 'avatar');

// Ensure avatar upload directory exists
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
    fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
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

    /**
     * Verifies a profile picture URL is a human photo using Gemma, then generates
     * an avatar using the Flux Dev image-to-image API. The avatar is generated with
     * a solid green background, then the background is removed and saved as PNG.
     */
    async generateAvatar(pictureUrl: string): Promise<AvatarGenerationResult> {
        try {
            if (!process.env.GEMINI_API_KEY) {
                return { success: false, error: 'GEMINI_API_KEY is not configured.' };
            }
            if (!PIXAZO_API_KEY) {
                return { success: false, error: 'PIXAZO_API_KEY is not configured.' };
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

            console.log('[AiService] Image verified as human. Generating avatar...');

            // --- Step 2: Generate avatar via Pixazo Flux Dev ---
            const avatarPrompt =
                'Professional digital avatar portrait, vibrant illustration style, clean solid bright green (#00FF00) background only, detailed face, modern look, soft lighting, centered subject, no shadows on background, the background must be a completely uniform solid green color';

            const submitResponse = await axios.post(
                PIXAZO_IMAGE_TO_IMAGE_URL,
                {
                    image_url: pictureUrl,
                    prompt: avatarPrompt,
                    strength: 0.65,
                    num_inference_steps: 30,
                    guidance_scale: 7.5,
                    num_images: 1,
                    enable_safety_checker: true,
                    output_format: 'png',
                    acceleration: 'regular',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Ocp-Apim-Subscription-Key': PIXAZO_API_KEY,
                    },
                }
            );

            const requestId: string = submitResponse.data.request_id;
            if (!requestId) {
                return { success: false, error: 'Pixazo API did not return a request_id.' };
            }

            console.log('[AiService] Flux Dev request submitted, request_id:', requestId);

            // --- Step 3: Poll for result (max 60 retries × 3s = 3 minutes) ---
            let generatedImageUrl: string | null = null;
            for (let i = 0; i < 60; i++) {
                await new Promise(resolve => setTimeout(resolve, 3000));

                const statusResponse = await axios.post(
                    PIXAZO_STATUS_URL,
                    { request_id: requestId },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                        },
                    }
                );

                const statusData = statusResponse.data;
                console.log(`[AiService] Poll attempt ${i + 1}:`, JSON.stringify(statusData).substring(0, 100));

                if (statusData.images && statusData.images.length > 0 && statusData.images[0].url) {
                    generatedImageUrl = statusData.images[0].url;
                    break;
                }
            }

            if (!generatedImageUrl) {
                return { success: false, error: 'Avatar generation timed out. Please try again.' };
            }

            console.log('[AiService] Generated avatar URL:', generatedImageUrl);

            // --- Step 4: Download and remove green background ---
            const generatedImageResponse = await axios.get(generatedImageUrl, { responseType: 'arraybuffer' });
            const generatedBuffer = Buffer.from(generatedImageResponse.data);

            const image = await Jimp.read(generatedBuffer);

            // Chroma key: remove pixels that are "green enough"
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

            // --- Step 5: Save PNG to uploads/avatar directory ---
            const filename = `avatar_${Date.now()}.png`;
            const outputPath = path.join(AVATAR_UPLOAD_DIR, filename);
            await new Promise<void>((resolve, reject) => {
                (image as any).write(outputPath, (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            const avatarUrl = `/uploads/avatar/${filename}`;
            console.log('[AiService] Avatar saved to:', avatarUrl);

            return { success: true, avatarUrl };
        } catch (error) {
            console.error('[AiService] Error generating avatar:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown avatar generation error'
            };
        }
    }
}

export const aiService = new AiService();
