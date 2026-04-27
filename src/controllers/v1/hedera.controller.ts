import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../config/db.config.js';
import { ItemRequest } from '../../models/ItemRequest.js';
import { LandRental } from '../../models/LandRental.js';
import { ProductPurchase } from '../../models/ProductPurchase.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getMyHederaRegistry = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        // 1. Fetch item purchases with Hedera TxID
        const itemRequests = await AppDataSource.getRepository(ItemRequest).find({
            where: { user_id: userId },
            order: { createdAt: 'DESC' },
        });

        const itemEntries = itemRequests
            .filter((r) => r.hedera_transaction_id)
            .map((r) => ({
                type: 'item_purchase',
                id: r.id,
                label: `${r.asset_category} Purchase`,
                sublabel: r.variant_id,
                amount: r.price_paid ? Number(r.price_paid) : null,
                currency: 'usd',
                payment_method: 'credits',
                status: r.status,
                hedera_transaction_id: r.hedera_transaction_id,
                timestamp: r.createdAt,
            }));

        // 2. Fetch land rentals with Hedera TxID
        const rentals = await AppDataSource.getRepository(LandRental).find({
            where: { investor_id: userId },
            relations: ['land'],
            order: { createdAt: 'DESC' },
        });

        const rentalEntries = rentals
            .filter((r) => r.hedera_transaction_id)
            .map((r) => ({
                type: 'land_rental',
                id: r.id,
                label: `Land Rental`,
                sublabel: r.land?.name ?? 'Unknown Land',
                amount: Number(r.monthly_rent),
                currency: 'usd',
                payment_method: r.payment_status === 'paid' ? 'credits/stripe' : 'pending',
                status: r.payment_status,
                hedera_transaction_id: r.hedera_transaction_id,
                timestamp: r.createdAt,
            }));

        // 3. Fetch product purchases with Hedera TxID
        const productPurchases = await AppDataSource.getRepository(ProductPurchase).find({
            where: { buyer_id: userId },
            order: { createdAt: 'DESC' },
        });

        const productEntries = productPurchases
            .filter((p) => p.hedera_transaction_id)
            .map((p) => ({
                type: 'product_purchase',
                id: p.id,
                label: `Product Purchase`,
                sublabel: `${p.product_name} (x${p.quantity})`,
                amount: Number(p.total_price),
                currency: 'usd',
                payment_method: 'credits',
                status: 'paid',
                hedera_transaction_id: p.hedera_transaction_id,
                timestamp: p.createdAt,
            }));

        // 4. Combine and sort by timestamp desc
        let all = [...itemEntries, ...rentalEntries, ...productEntries].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // 5. Optional date range filter (used by invoice preview)
        const { from, to } = req.query as { from?: string; to?: string };
        if (from || to) {
            const fromDate = from ? new Date(from) : null;
            const toDate = to ? new Date(to) : null;
            if (toDate) toDate.setHours(23, 59, 59, 999);
            all = all.filter((e) => {
                const t = new Date(e.timestamp).getTime();
                if (fromDate && t < fromDate.getTime()) return false;
                if (toDate && t > toDate.getTime()) return false;
                return true;
            });
        }

        res.status(200).json({
            success: true,
            total: all.length,
            data: all,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/hedera/invoice?from=YYYY-MM-DD&to=YYYY-MM-DD&types=land_rental,...
// Generates and streams a branded PDF invoice for the authenticated investor.
// ─────────────────────────────────────────────────────────────────────────────
export const generateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { from, to, types } = req.query as { from?: string; to?: string; types?: string };

        // ── Validate required params ──────────────────────────────────────────
        if (!from || !to) {
            res.status(400).json({ success: false, message: '`from` and `to` query parameters are required (YYYY-MM-DD).' });
            return;
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            res.status(400).json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' });
            return;
        }

        if (fromDate > toDate) {
            res.status(400).json({ success: false, message: '`from` must be before or equal to `to`.' });
            return;
        }

        // Max 12-month range to prevent abuse
        const diffMs = toDate.getTime() - fromDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 366) {
            res.status(400).json({ success: false, message: 'Date range cannot exceed 12 months.' });
            return;
        }

        // ── Parse activity types ──────────────────────────────────────────────
        const validTypes = ['item_purchase', 'land_rental', 'product_purchase'] as const;
        type ActivityType = typeof validTypes[number];

        let requestedTypes: ActivityType[] = [...validTypes]; // default: all
        if (types) {
            const parsed = types.split(',').map((t) => t.trim()) as ActivityType[];
            const invalid = parsed.filter((t) => !validTypes.includes(t));
            if (invalid.length > 0) {
                res.status(400).json({ success: false, message: `Invalid type(s): ${invalid.join(', ')}` });
                return;
            }
            requestedTypes = parsed;
        }

        // ── Build invoice data ────────────────────────────────────────────────
        const { invoiceService } = await import('../../services/v1/invoice.service.js');
        const invoiceData = await invoiceService.buildInvoiceData(userId, fromDate, toDate, requestedTypes);

        // ── Generate PDF ──────────────────────────────────────────────────────
        const { pdfInvoiceService } = await import('../../services/v1/pdfInvoice.service.js');
        const pdfBuffer = await pdfInvoiceService.generate(invoiceData);

        const filename = `farmy-invoice-${invoiceData.invoiceNumber}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        next(error);
    }
};
