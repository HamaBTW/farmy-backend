import {
    Client,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
    AccountId,
} from '@hashgraph/sdk';

export interface PurchaseRecord {
    type: 'item_purchase' | 'land_creation';
    user_id: string;
    item_id?: string;        // variant_id or land_id
    item_name?: string;
    asset_category?: string;
    land_id?: string;
    amount: number;
    currency: string;
    payment_method: 'credits' | 'stripe' | 'free';
    timestamp: string;
    metadata?: Record<string, any>;
}

class HederaService {
    private client: Client | null = null;
    private topicId: string | null = null;
    private initialized = false;

    private init() {
        if (this.initialized) return;

        const accountId = process.env.HEDERA_ACCOUNT_ID;
        const privateKey = process.env.HEDERA_PRIVATE_KEY;
        const network = process.env.HEDERA_NETWORK || 'testnet';

        if (!accountId || !privateKey) {
            console.warn('[HederaService] HEDERA_ACCOUNT_ID or HEDERA_PRIVATE_KEY not set. Hedera recording will be skipped.');
            this.initialized = true;
            return;
        }

        try {
            const client = network === 'mainnet'
                ? Client.forMainnet()
                : Client.forTestnet();

            client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
            this.client = client;
            this.topicId = process.env.HEDERA_TOPIC_ID || null;
            console.log(`[HederaService] Initialized on ${network}. Topic ID: ${this.topicId || 'Will be created on first use'}`);
        } catch (err) {
            console.error('[HederaService] Failed to initialize Hedera client:', err);
        }

        this.initialized = true;
    }

    /**
     * Ensures a HCS topic exists. Creates one if HEDERA_TOPIC_ID is not set.
     */
    private async ensureTopic(): Promise<string | null> {
        if (this.topicId) return this.topicId;
        if (!this.client) return null;

        try {
            const tx = await new TopicCreateTransaction()
                .setTopicMemo('Farmy - Purchase Transactions')
                .execute(this.client);

            const receipt = await tx.getReceipt(this.client);
            this.topicId = receipt.topicId!.toString();
            console.log(`[HederaService] Created new HCS topic: ${this.topicId}`);
            console.log(`[HederaService] ⚠️  Set HEDERA_TOPIC_ID=${this.topicId} in your .env to reuse this topic.`);
            return this.topicId;
        } catch (err) {
            console.error('[HederaService] Failed to create HCS topic:', err);
            return null;
        }
    }

    /**
     * Records a purchase on the Hedera Consensus Service.
     * Returns the transaction ID string, or null if Hedera is not configured.
     */
    async recordPurchase(record: PurchaseRecord): Promise<string | null> {
        this.init();

        if (!this.client) {
            console.log('[HederaService] Skipping Hedera recording (not configured).');
            return null;
        }

        const topicId = await this.ensureTopic();
        if (!topicId) return null;

        const message = JSON.stringify({
            platform: 'farmy',
            version: '1.0',
            ...record,
        });

        try {
            const tx = await new TopicMessageSubmitTransaction({
                topicId,
                message,
            }).execute(this.client);

            const receipt = await tx.getReceipt(this.client);
            const transactionId = tx.transactionId.toString();
            console.log(`[HederaService] ✅ Purchase recorded on Hedera. TxID: ${transactionId} | Status: ${receipt.status}`);
            return transactionId;
        } catch (err) {
            console.error('[HederaService] Failed to submit message to HCS topic:', err);
            return null;
        }
    }
}

export const hederaService = new HederaService();
