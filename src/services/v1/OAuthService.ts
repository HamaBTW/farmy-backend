import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { AppError } from '../../middlewares/error.middleware.js';

class OAuthService {
    private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
}

export const oAuthService = new OAuthService();
