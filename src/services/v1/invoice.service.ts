import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { LandRental } from '../../models/LandRental.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';
import { User } from '../../models/User.js';
import { Between } from 'typeorm';

export type InvoiceActivityType = 'item_purchase' | 'land_rental' | 'product_purchase';

export interface InvoiceLine {
    date: Date;
    description: string;
    type: string;
    paymentMethod: string;
    hederaTxId: string;
    amount: number;
    status: string;
}

export interface InvoiceData {
    investor: {
        name: string;
        email: string;
        city: string;
        country: string;
    };
    invoiceNumber: string;
    period: { from: Date; to: Date };
    lines: InvoiceLine[];
    subtotal: number;
    tax: number;
    total: number;
    generatedAt: Date;
}

export class InvoiceService {
    async buildInvoiceData(
        userId: string,
        from: Date,
        to: Date,
        types: InvoiceActivityType[],
    ): Promise<InvoiceData> {
        // Load user profile for invoice header
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: userId },
        });

        const investor = {
            name: user?.profile?.name ?? 'Investor',
            email: user?.email ?? '',
            city: user?.profile?.city ?? '',
            country: user?.profile?.country ?? '',
        };

        // Inclusive end-of-day for `to`
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);

        const lines: InvoiceLine[] = [];

        // ── 1. Item purchases (game assets) ──────────────────────────────────
        if (types.includes('item_purchase')) {
            const requests = await AppDataSource.getRepository(ItemRequest).find({
                where: {
                    user_id: userId,
                    createdAt: Between(from, toEnd),
                },
                order: { createdAt: 'ASC' },
            });

            for (const r of requests) {
                if (!r.hedera_transaction_id) continue;
                lines.push({
                    date: r.createdAt,
                    description: `${r.asset_category} Asset`,
                    type: 'Asset Purchase',
                    paymentMethod: r.price_paid > 0 ? 'Credits' : 'Free',
                    hederaTxId: r.hedera_transaction_id,
                    amount: Number(r.price_paid ?? 0),
                    status: r.status,
                });
            }
        }

        // ── 2. Land rentals ───────────────────────────────────────────────────
        if (types.includes('land_rental')) {
            const rentals = await AppDataSource.getRepository(LandRental).find({
                where: {
                    investor_id: userId,
                    createdAt: Between(from, toEnd),
                },
                relations: ['land'],
                order: { createdAt: 'ASC' },
            });

            for (const r of rentals) {
                if (!r.hedera_transaction_id) continue;
                lines.push({
                    date: r.createdAt,
                    description: `Land Rental – ${r.land?.name ?? 'Land'}`,
                    type: 'Land Rental',
                    paymentMethod: r.payment_status === 'paid' ? 'Credits / Stripe' : 'Pending',
                    hederaTxId: r.hedera_transaction_id,
                    amount: Number(r.monthly_rent ?? 0),
                    status: r.payment_status,
                });
            }
        }

        // ── 3. Product purchases (marketplace) ───────────────────────────────
        if (types.includes('product_purchase')) {
            const purchases = await AppDataSource.getRepository(ProductPurchase).find({
                where: {
                    buyer_id: userId,
                    createdAt: Between(from, toEnd),
                },
                order: { createdAt: 'ASC' },
            });

            for (const p of purchases) {
                if (!p.hedera_transaction_id) continue;
                lines.push({
                    date: p.createdAt,
                    description: `${p.product_name} (x${p.quantity})`,
                    type: 'Product Purchase',
                    paymentMethod: 'Credits',
                    hederaTxId: p.hedera_transaction_id,
                    amount: Number(p.total_price ?? 0),
                    status: 'paid',
                });
            }
        }

        // Sort combined lines by date ascending
        lines.sort((a, b) => a.date.getTime() - b.date.getTime());

        const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
        const tax = 0; // Placeholder — adjust if needed
        const total = subtotal + tax;

        const invoiceNumber = `INV-${userId.substring(0, 8).toUpperCase()}-${Date.now()}`;

        return {
            investor,
            invoiceNumber,
            period: { from, to: toEnd },
            lines,
            subtotal,
            tax,
            total,
            generatedAt: new Date(),
        };
    }
}

export const invoiceService = new InvoiceService();
