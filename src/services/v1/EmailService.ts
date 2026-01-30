import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
    private transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    async sendVerificationCode(email: string, code: string) {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Farmy" <noreply@farmy.com>',
            to: email,
            subject: 'Verify your Farmy account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4CAF50; text-align: center;">Welcome to Farmy!</h2>
                    <p>Thank you for registering. Please use the following code to verify your email address:</p>
                    <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 5px; letter-spacing: 5px;">
                        ${code}
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you did not request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Farmy. All rights reserved.</p>
                </div>
            `,
        };

        return this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetCode(email: string, code: string) {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Farmy" <noreply@farmy.com>',
            to: email,
            subject: 'Reset your Farmy password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #f44336; text-align: center;">Password Reset Request</h2>
                    <p>You requested to reset your password. Please use the following code to proceed:</p>
                    <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 5px; letter-spacing: 5px;">
                        ${code}
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 Farmy. All rights reserved.</p>
                </div>
            `,
        };

        return this.transporter.sendMail(mailOptions);
    }
}

export const emailService = new EmailService();
