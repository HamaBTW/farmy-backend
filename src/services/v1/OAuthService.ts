import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
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
                audience: process.env.GOOGLE_CLIENT_ID,
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
}

export const oAuthService = new OAuthService();
