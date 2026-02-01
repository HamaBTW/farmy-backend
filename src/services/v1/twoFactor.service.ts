import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';

class TwoFactorService {
    generateSecret(): string {
        return generateSecret();
    }

    generateOTPUri(email: string, issuer: string, secret: string): string {
        return generateURI({
            secret,
            label: email,
            issuer
        });
    }

    async generateQRCode(otpUri: string): Promise<string> {
        return await QRCode.toDataURL(otpUri);
    }

    verifyToken(token: string, secret: string): boolean {
        return Boolean(verifySync({ token, secret }));
    }
}

export const twoFactorService = new TwoFactorService();
