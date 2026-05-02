import { createRequire } from 'module';
import type { InvoiceData, InvoiceLine } from './invoice.service.js';

// pdfkit is CommonJS-only — use createRequire to load it inside an ESM project
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as new (
    options?: any
) => any;

// ── Brand colours ────────────────────────────────────────────────────────────
const GREEN_DARK = '#1B4332';
const GREEN_MID = '#2D6A4F';
const GREEN_LIGHT = '#95D5B2';
const GREEN_PALE = '#D8F3DC';
const HEDERA_PURPLE = '#8259EF';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const WHITE = '#FFFFFF';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtMoney(n: number): string {
    return `$${n.toFixed(2)}`;
}

function shortTx(tx: string): string {
    return tx.length > 30 ? `${tx.substring(0, 30)}...` : tx;
}

// ── PDF generator ─────────────────────────────────────────────────────────────
export class PdfInvoiceService {
    async generate(data: InvoiceData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            this.renderHeader(doc, data);
            this.renderBillingSection(doc, data);
            this.renderLineTable(doc, data);
            this.renderTotals(doc, data);
            this.renderBlockchainSection(doc, data);
            this.renderFooter(doc);

            doc.end();
        });
    }

    // ── Header ────────────────────────────────────────────────────────────────
    private renderHeader(doc: any, data: InvoiceData) {
        // Background bar
        doc.rect(0, 0, doc.page.width, 110).fill(GREEN_DARK);

        // Farmy logo text
        doc.font('Helvetica-Bold').fontSize(28).fillColor(GREEN_LIGHT).text('FARMY', 50, 30);
        doc.font('Helvetica').fontSize(10).fillColor(GREEN_LIGHT).text('farmy.app', 50, 62);
        doc.font('Helvetica').fontSize(10).fillColor(GREEN_LIGHT).text('support@farmy.app', 50, 76);

        // INVOICE label
        doc.font('Helvetica-Bold').fontSize(32).fillColor(WHITE).text('INVOICE', 350, 28, { align: 'right', width: 200 });
        doc.font('Helvetica').fontSize(10).fillColor(GREEN_LIGHT)
            .text(`#${data.invoiceNumber}`, 350, 68, { align: 'right', width: 200 })
            .text(`Generated: ${fmtDate(data.generatedAt)}`, 350, 82, { align: 'right', width: 200 });

        doc.moveDown(5);
    }

    // ── Billed To / Period ────────────────────────────────────────────────────
    private renderBillingSection(doc: any, data: InvoiceData) {
        const y = 130;

        // BILLED TO box
        doc.rect(50, y, 240, 90).fill(GREEN_PALE).stroke(GREEN_LIGHT);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN_MID).text('BILLED TO', 62, y + 10);
        doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT_DARK).text(data.investor.name, 62, y + 24);
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_MUTED)
            .text(data.investor.email, 62, y + 40)
            .text([data.investor.city, data.investor.country].filter(Boolean).join(', '), 62, y + 54);

        // PERIOD box
        doc.rect(310, y, 240, 90).fill(GREEN_PALE).stroke(GREEN_LIGHT);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN_MID).text('PERIOD', 322, y + 10);
        doc.font('Helvetica').fontSize(11).fillColor(TEXT_DARK)
            .text(`From: ${fmtDate(data.period.from)}`, 322, y + 26)
            .text(`To:      ${fmtDate(data.period.to)}`, 322, y + 42);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(GREEN_MID)
            .text(`${data.lines.length} blockchain record${data.lines.length !== 1 ? 's' : ''}`, 322, y + 60);

        doc.y = y + 110;
    }

    // ── Line item table ───────────────────────────────────────────────────────
    private renderLineTable(doc: any, data: InvoiceData) {
        const startY = doc.y + 10;
        const colX = { date: 50, desc: 115, type: 285, pm: 370, amount: 460 };
        const rowH = 24;

        // Table header
        doc.rect(50, startY, doc.page.width - 100, rowH).fill(GREEN_MID);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE);
        doc.text('DATE', colX.date, startY + 8);
        doc.text('DESCRIPTION', colX.desc, startY + 8);
        doc.text('TYPE', colX.type, startY + 8);
        doc.text('PAYMENT', colX.pm, startY + 8);
        doc.text('AMOUNT', colX.amount, startY + 8, { width: 80, align: 'right' });

        let currentY = startY + rowH;

        if (data.lines.length === 0) {
            doc.rect(50, currentY, doc.page.width - 100, rowH).fill('#F9FAFB');
            doc.font('Helvetica').fontSize(10).fillColor(TEXT_MUTED)
                .text('No records found for this period.', 50, currentY + 7, { width: doc.page.width - 100, align: 'center' });
            doc.y = currentY + rowH + 10;
            return;
        }

        data.lines.forEach((line: InvoiceLine, i: number) => {
            // Page break check
            if (currentY + rowH > doc.page.height - 150) {
                doc.addPage();
                currentY = 50;
            }

            const bg = i % 2 === 0 ? WHITE : GREEN_PALE;
            doc.rect(50, currentY, doc.page.width - 100, rowH).fill(bg);

            doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);
            doc.text(fmtDate(line.date), colX.date, currentY + 8, { width: 60 });
            doc.text(line.description, colX.desc, currentY + 8, { width: 165, ellipsis: true });
            doc.text(line.type, colX.type, currentY + 8, { width: 80 });
            doc.text(line.paymentMethod, colX.pm, currentY + 8, { width: 80 });

            // Amount in green
            doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN_MID);
            doc.text(fmtMoney(line.amount), colX.amount, currentY + 8, { width: 80, align: 'right' });

            currentY += rowH;
        });

        // Bottom border
        doc.rect(50, currentY, doc.page.width - 100, 1).fill(GREEN_LIGHT);
        doc.y = currentY + 10;
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    private renderTotals(doc: any, data: InvoiceData) {
        const x = 360;
        let y = doc.y + 10;
        const w = 190;

        const row = (label: string, value: string, bold = false, highlight = false) => {
            if (highlight) {
                doc.rect(x - 10, y - 4, w + 20, 24).fill(GREEN_MID);
                doc.font('Helvetica-Bold').fontSize(11).fillColor(WHITE);
            } else {
                doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(TEXT_DARK);
            }
            doc.text(label, x, y, { width: w - 70 });
            doc.font(bold || highlight ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(highlight ? 11 : 10)
                .fillColor(highlight ? WHITE : GREEN_MID)
                .text(value, x + w - 70, y, { width: 70, align: 'right' });
            y += 24;
        };

        row('Subtotal', fmtMoney(data.subtotal));
        row('Tax (0%)', fmtMoney(data.tax));
        row('TOTAL DUE', fmtMoney(data.total), true, true);

        doc.y = y + 20;
    }

    // ── Blockchain verification section ───────────────────────────────────────
    private renderBlockchainSection(doc: any, data: InvoiceData) {
        if (data.lines.length === 0) return;

        // Page break if needed
        if (doc.y + 80 > doc.page.height - 60) {
            doc.addPage();
        }

        const y = doc.y + 10;
        doc.rect(50, y, doc.page.width - 100, 22).fill(HEDERA_PURPLE);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(WHITE)
            .text('BLOCKCHAIN VERIFICATION -- Hedera Consensus Service', 62, y + 6);

        let currentY = y + 28;
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED)
            .text('All transactions below are immutably anchored on the Hedera network. Verify at hashscan.io', 50, currentY);
        currentY += 14;

        // List each TX
        for (const line of data.lines) {
            if (currentY + 14 > doc.page.height - 60) {
                doc.addPage();
                currentY = 50;
            }
            doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_DARK)
                .text(`${fmtDate(line.date)} · ${line.description}`, 50, currentY, { continued: true, width: 280 });
            doc.font('Helvetica').fontSize(7).fillColor(HEDERA_PURPLE)
                .text(`  ${shortTx(line.hederaTxId)}`, { width: 260 });
            currentY += 13;
        }

        doc.y = currentY + 10;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    private renderFooter(doc: any) {
        const pageHeight = doc.page.height;
        doc.rect(0, pageHeight - 40, doc.page.width, 40).fill(GREEN_DARK);
        doc.font('Helvetica').fontSize(8).fillColor(GREEN_LIGHT)
            .text(
                'This invoice is auto-generated by Farmy · farmy.app · Powered by Hedera Consensus Service',
                50,
                pageHeight - 26,
                { align: 'center', width: doc.page.width - 100 },
            );
    }
}

export const pdfInvoiceService = new PdfInvoiceService();
