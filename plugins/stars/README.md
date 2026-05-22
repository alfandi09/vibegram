# @vibegram/stars

Telegram Stars workflow helpers for VibeGram bots: Stars invoices, pre-checkout handling, successful payment validation, refunds, paid-media fixtures, and gift/business wrappers.

## Official Telegram Mapping

This plugin wraps Bot API payment and Stars methods without changing Telegram behavior:

- Stars invoices use `sendInvoice` / `createInvoiceLink` with `currency: "XTR"`, empty `provider_token`, and exactly one price item.
- Pre-checkout updates must be answered with `answerPreCheckoutQuery` before Telegram times out the payment.
- Completed payments arrive as `message.successful_payment`.
- Stars refunds use `refundStarPayment`.
- Paid media purchases arrive as `purchased_paid_media`.
- Gift/business helpers map to Telegram gift and business-account methods.

References: [Payments](https://core.telegram.org/bots/api#payments), [sendInvoice](https://core.telegram.org/bots/api#sendinvoice), [createInvoiceLink](https://core.telegram.org/bots/api#createinvoicelink), [answerPreCheckoutQuery](https://core.telegram.org/bots/api#answerprecheckoutquery), [SuccessfulPayment](https://core.telegram.org/bots/api#successfulpayment), [refundStarPayment](https://core.telegram.org/bots/api#refundstarpayment), [sendPaidMedia](https://core.telegram.org/bots/api#sendpaidmedia), and [BusinessConnection](https://core.telegram.org/bots/api#businessconnection).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/stars
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/stars": "file:../vibegram/plugins/stars"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { stars } from '@vibegram/stars';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(stars());

bot.command('buy', ctx => {
    return ctx.stars.invoice({
        title: 'Premium access',
        description: '30 days of premium access',
        payload: `premium:${ctx.from?.id}`,
        amount: 100,
        label: 'Premium',
    });
});
```

## Pre-Checkout

```typescript
bot.on('pre_checkout_query', async ctx => {
    try {
        await ctx.stars.approvePreCheckout({
            payloadPrefix: 'premium:',
            totalAmount: 100,
        });
    } catch {
        await ctx.stars.declinePreCheckout('This order is no longer available.');
    }
});
```

Telegram requires a quick `answerPreCheckoutQuery` response. Keep expensive checks outside this handler or precompute order state.

## Fulfillment

```typescript
bot.on('message:successful_payment', async ctx => {
    const payment = ctx.stars.requireSuccessfulPayment({
        payloadPrefix: 'premium:',
    });

    await activatePremium(payment.invoice_payload);
    await ctx.reply('Premium activated.');
});
```

Store `invoice_payload`, `telegram_payment_charge_id`, and fulfillment status in your database. Make fulfillment idempotent because retries and redeploys can replay updates.

## Refunds

```typescript
bot.command('refund', async ctx => {
    await ctx.stars.refund(ctx.from!.id, 'telegram-charge-id');
});

bot.on('message:successful_payment', async ctx => {
    await ctx.stars.refundSuccessfulPayment();
});
```

## Gifts And Business Stars

```typescript
await ctx.stars.gifts.send(ctx.from!.id, 'gift-id', {
    text: 'Thanks for supporting us',
});

await ctx.stars.business.transferStars('business-connection-id', 250);
await ctx.stars.business.upgradeGift('business-connection-id', 'owned-gift-id', {
    star_count: 0,
});
```

Business helpers require the matching Telegram business bot rights.

## Test Fixtures

```typescript
import {
    createPreCheckoutQueryUpdate,
    createSuccessfulPaymentUpdate,
    createPaidMediaPurchasedUpdate,
} from '@vibegram/stars';

const update = createSuccessfulPaymentUpdate({
    userId: 42,
    payload: 'premium:42',
    totalAmount: 100,
});
```

## Security And Reconciliation

- Build invoices on the server.
- Use opaque order IDs in `payload`; do not trust client-supplied price state.
- Validate `pre_checkout_query.currency`, `total_amount`, and `invoice_payload`.
- Fulfill only after `successful_payment`.
- Record charge IDs before granting irreversible access.
- Make fulfillment and refunds idempotent.
- Do not retry `sendInvoice` blindly unless your order system can deduplicate.

## Validation

```bash
npm --prefix plugins/stars run typecheck
npm --prefix plugins/stars test
npm --prefix plugins/stars run build
```
