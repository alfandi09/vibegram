import { describe, expect, it } from 'vitest';
import {
    StarsPluginError,
    buildStarsInvoice,
    createPaidMediaPurchasedUpdate,
    createPreCheckoutQueryUpdate,
    createSuccessfulPaymentUpdate,
    stars,
} from '../src/index';

describe('buildStarsInvoice()', () => {
    it('should build valid Stars invoice payloads', () => {
        expect(buildStarsInvoice({
            title: 'Premium access',
            description: 'One month of premium access',
            payload: 'premium:42',
            amount: 100,
            label: 'Premium',
        })).toEqual({
            title: 'Premium access',
            description: 'One month of premium access',
            payload: 'premium:42',
            provider_token: '',
            currency: 'XTR',
            prices: [{ label: 'Premium', amount: 100 }],
        });
    });

    it('should reject invalid Stars invoice payloads before Telegram does', () => {
        expect(() => buildStarsInvoice({
            title: 'Premium access',
            description: 'One month of premium access',
            payload: 'premium:42',
            prices: [
                { label: 'Base', amount: 50 },
                { label: 'Tax', amount: 50 },
            ],
        })).toThrow(StarsPluginError);
    });
});

describe('stars()', () => {
    it('should handle pre-checkout query', async () => {
        const calls: Array<[string, Record<string, unknown> | undefined]> = [];
        const ctx = {
            update: createPreCheckoutQueryUpdate({
                id: 'pcq-1',
                userId: 42,
                payload: 'premium:42',
                totalAmount: 100,
            }),
            client: {
                async callApi(method: string, data?: Record<string, unknown>) {
                    calls.push([method, data]);
                    return true;
                },
            },
        };

        await stars()(ctx, async () => {
            const query = await ctx.stars.approvePreCheckout({
                payloadPrefix: 'premium:',
                totalAmount: 100,
            });

            expect(query.invoice_payload).toBe('premium:42');
        });

        expect(calls).toEqual([
            [
                'answerPreCheckoutQuery',
                {
                    pre_checkout_query_id: 'pcq-1',
                    ok: true,
                },
            ],
        ]);
        expect(ctx.stars).toBeUndefined();
    });

    it('should validate successful payment payload', async () => {
        const ctx = {
            update: createSuccessfulPaymentUpdate({
                userId: 42,
                payload: 'premium:42',
                totalAmount: 100,
                telegramPaymentChargeId: 'charge-1',
            }),
            message: createSuccessfulPaymentUpdate({
                userId: 42,
                payload: 'premium:42',
                totalAmount: 100,
                telegramPaymentChargeId: 'charge-1',
            }).message,
            from: { id: 42 },
            client: {
                async callApi() {
                    return true;
                },
            },
        };

        await stars()(ctx, async () => {
            const payment = ctx.stars.requireSuccessfulPayment({
                payloadPrefix: 'premium:',
                totalAmount: 100,
            });

            expect(payment.telegram_payment_charge_id).toBe('charge-1');
        });
    });

    it('should expose refund helpers', async () => {
        const calls: Array<[string, Record<string, unknown> | undefined]> = [];
        const update = createSuccessfulPaymentUpdate({
            userId: 42,
            payload: 'premium:42',
            totalAmount: 100,
            telegramPaymentChargeId: 'charge-1',
        });
        const ctx = {
            update,
            message: update.message,
            from: { id: 42 },
            client: {
                async callApi(method: string, data?: Record<string, unknown>) {
                    calls.push([method, data]);
                    return true;
                },
            },
        };

        await stars()(ctx, async () => {
            await ctx.stars.refundSuccessfulPayment();
        });

        expect(calls).toEqual([
            [
                'refundStarPayment',
                {
                    user_id: 42,
                    telegram_payment_charge_id: 'charge-1',
                },
            ],
        ]);
    });

    it('should expose gift and business helper workflows', async () => {
        const calls: Array<[string, Record<string, unknown> | undefined]> = [];
        const ctx = {
            client: {
                async callApi(method: string, data?: Record<string, unknown>) {
                    calls.push([method, data]);
                    return true;
                },
            },
        };

        await stars()(ctx, async () => {
            await ctx.stars.gifts.send(42, 'gift-1', { text: 'Thanks' });
            await ctx.stars.business.transferStars('bc-1', 250);
            await ctx.stars.business.upgradeGift('bc-1', 'owned-1', { star_count: 0 });
        });

        expect(calls).toEqual([
            ['sendGift', { user_id: 42, gift_id: 'gift-1', text: 'Thanks' }],
            ['transferBusinessAccountStars', { business_connection_id: 'bc-1', star_count: 250 }],
            [
                'upgradeGift',
                {
                    business_connection_id: 'bc-1',
                    owned_gift_id: 'owned-1',
                    star_count: 0,
                },
            ],
        ]);
    });
});

describe('paid update fixtures', () => {
    it('should include paid media fixtures', () => {
        const update = createPaidMediaPurchasedUpdate({
            userId: 42,
            paidMediaPayload: 'gallery:42',
        });

        expect(update.purchased_paid_media?.paid_media_payload).toBe('gallery:42');
        expect(update.purchased_paid_media?.from.id).toBe(42);
    });
});
