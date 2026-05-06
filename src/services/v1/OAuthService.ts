import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AppError } from '../../middlewares/error.middleware.js';

class OAuthService {
    private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    private pendingLogins = new Map<string, any>();

    storeLogin(requestId: string, data: any) {
        this.pendingLogins.set(requestId, { ...data, timestamp: Date.now() });
    }

    retrieveLogin(requestId: string) {
        const data = this.pendingLogins.get(requestId);
        if (data) {
            this.pendingLogins.delete(requestId);
            return data;
        }
        return null;
    }

    async verifyGoogleToken(idToken: string) {
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken,
                audience: [
                    process.env.GOOGLE_CLIENT_ID!,
                    process.env.GOOGLE_IOS_CLIENT_ID!
                ],
            });
            const payload = ticket.getPayload();
            if (!payload) throw new AppError(401, 'Invalid Google token');

            return {
                id: payload.sub,
                email: payload.email!,
                name: payload.name,
                picture: payload.picture,
            };
        } catch (error) {
            console.error('Verify Google Token Error:', error);
            throw new AppError(401, 'Google authentication failed');
        }
    }

    async verifyGithubToken(accessToken: string) {
        try {
            // Get user info from GitHub
            const response = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `token ${accessToken}`,
                },
            });

            const { id, email, name, avatar_url } = response.data;

            // GitHub might not return email if it's private
            let userEmail = email;
            if (!userEmail) {
                const emailsResponse = await axios.get('https://api.github.com/user/emails', {
                    headers: {
                        Authorization: `token ${accessToken}`,
                    },
                });
                const primaryEmail = emailsResponse.data.find((e: any) => e.primary && e.verified);
                userEmail = primaryEmail ? primaryEmail.email : null;
            }

            if (!userEmail) throw new AppError(401, 'GitHub email not found or not verified');

            return {
                id: id.toString(),
                email: userEmail,
                name: name || response.data.login,
                picture: avatar_url,
            };
        } catch (error) {
            throw new AppError(401, 'GitHub authentication failed');
        }
    }

    async getGithubAccessToken(code: string) {
        try {
            console.log('DEBUG: Exchanging GitHub code:', code);
            console.log('DEBUG: Using Redirect URI:', 'farmyapp://auth');
            const response = await axios.post(
                'https://github.com/login/oauth/access_token',
                {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: 'farmyapp://auth',
                },
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );

            if (response.data.error) {
                console.error('DEBUG: GitHub Token Response Error Data:', response.data);
                throw new AppError(401, `GitHub OAuth error: ${response.data.error_description}`);
            }

            return response.data.access_token;
        } catch (error: any) {
            console.error('GitHub Token Exchange Error:', error.response?.data || error.message);
            if (error.response) {
                console.error('DEBUG: Full Error Response:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    headers: error.response.headers,
                    data: error.response.data
                });
            }
            if (error instanceof AppError) throw error;
            throw new AppError(401, 'Failed to exchange GitHub code');
        }
    }

    async getGoogleAccessToken(code: string, redirectUri: string = 'farmyapp://auth') {
        try {
            const response = await axios.post(
                'https://oauth2.googleapis.com/token',
                {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri,
                }
            );

            return response.data.access_token;
        } catch (error: any) {
            console.error('Google Token Exchange Error:', error.response?.data || error.message);
            throw new AppError(401, 'Failed to exchange Google code');
        }
    }

    async verifyAppleToken(idToken: string, rawNonce?: string) {
        try {
            console.log('🍎 [OAuthService] Verifying Apple token...');
            console.log('🍎 [OAuthService] Token length:', idToken.length);
            console.log('🍎 [OAuthService] Has nonce:', !!rawNonce);
            console.log('🍎 [OAuthService] APPLE_CLIENT_ID:', process.env.APPLE_CLIENT_ID);
            console.log('🍎 [OAuthService] APPLE_KEY_ID:', process.env.APPLE_KEY_ID ? 'configured' : 'not configured');
            console.log('🍎 [OAuthService] APPLE_PRIVATE_KEY:', process.env.APPLE_PRIVATE_KEY ? 'configured' : 'not configured');

            // Enhanced verification options for Apple Sign-In
            const verifyOptions: any = {};
            
            // Use nonce if provided
            if (rawNonce) {
                verifyOptions.nonce = rawNonce;
                console.log('🍎 [OAuthService] Using nonce for verification');
            }

            // Use client secret if APPLE_PRIVATE_KEY and APPLE_KEY_ID are available
            if (process.env.APPLE_PRIVATE_KEY && process.env.APPLE_KEY_ID) {
                try {
                    const rawKey = process.env.APPLE_PRIVATE_KEY || '';
                    let privateKey: string;
                    
                    if (rawKey.includes('-----BEGIN PRIVATE KEY-----')) {
                        // It's the key content itself, handle potential newline issues from .env
                        privateKey = rawKey.replace(/\\n/g, '\n');
                        console.log('🍎 [OAuthService] Using private key from environment variable string');
                    } else {
                        // It's a file path
                        const privateKeyPath = path.resolve(rawKey);
                        privateKey = fs.readFileSync(privateKeyPath, 'utf8');
                        console.log('🍎 [OAuthService] Using private key from file path:', privateKeyPath);
                    }
                    
                    verifyOptions.clientId = process.env.APPLE_CLIENT_ID;
                    verifyOptions.keyId = process.env.APPLE_KEY_ID;
                    verifyOptions.teamId = process.env.APPLE_TEAM_ID;
                    verifyOptions.privateKey = privateKey;
                    
                    console.log('🍎 [OAuthService] Using enhanced verification with private key');
                } catch (keyError: any) {
                    console.warn('🍎 [OAuthService] Failed to load private key, falling back to basic verification:', keyError.message);
                    // Continue with basic verification if private key loading fails
                }
            }

            console.log('🍎 [OAuthService] Calling apple-signin-auth verifyIdToken...');
            const claims = await appleSignin.verifyIdToken(idToken, verifyOptions);
            console.log('🍎 [OAuthService] Token verified successfully');

            // Extract user info from claims
            const { sub, email, email_verified } = claims;
            console.log('🍎 [OAuthService] Claims - sub:', sub ? 'present' : 'missing');
            console.log('🍎 [OAuthService] Claims - email:', email ? 'present' : 'missing');
            console.log('🍎 [OAuthService] Claims - email_verified:', email_verified);

            if (!sub) {
                throw new AppError(401, 'Invalid Apple token: missing subject');
            }

            // Apple only returns email on first sign-in
            // If email is null/undefined, user has signed in before or uses private relay
            const userEmail = email as string | undefined;

            return {
                id: sub as string,
                email: userEmail,
                emailVerified: email_verified === 'true' || email_verified === true,
            };
        } catch (error: any) {
            console.error('🍎 [OAuthService] Token Verification Error:', error);
            if (error instanceof AppError) throw error;
            throw new AppError(401, 'Apple authentication failed: ' + (error.message || 'Invalid token'));
        }
    }
}

export const oAuthService = new OAuthService();
