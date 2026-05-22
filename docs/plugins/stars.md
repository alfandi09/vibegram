# Stars

`@vibegram/stars` provides production-oriented helpers for Telegram Stars payments: invoice building, pre-checkout approval/decline, successful payment validation, refunds, gift/business workflows, and paid-update test fixtures.

Use it when a bot sells digital goods, paid media, premium access, gifts, or Mini App features through Telegram Stars.

## Official Telegram Mapping

This plugin wraps Telegram Bot API payment behavior without changing it.

Stars invoices are regular Telegram invoices with `currency: "XTR"`, an empty `provider_token`, and exactly one `prices` item. The plugin validates these rules before the request reaches Telegram.

Pre-checkout updates arrive as `Update.pre_checkout_query` and must be answered with `answerPreCheckoutQuery`. Completed payments arrive as `message.successful_payment`. Refunds are performed through `refundStarPayment`. Paid-media purchases arrive as `purchased_paid_media`.

References: [Payments](https://core.telegram.org/bots/api#payments), [sendInvoice](https://core.telegram.org/bots/api#sendinvoice), [createInvoiceLink](https://core.telegram.org/bots/api#createinvoicelink), [answerPreCheckoutQuery](https://core.telegram.org/bots/api#answerprecheckoutquery), [PreCheckoutQuery](https://core.telegram.org/bots/api#precheckoutquery), [SuccessfulPayment](https://core.telegram.org/bots/api#successfulpayment), [refundStarPayment](https://core.telegram.org/bots/api#refundstarpayment), [sendPaidMedia](https://core.telegram.org/bots/api#sendpaidmedia), and [BusinessConnection](https://core.telegram.org/bots/api#businessconnection).

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

## Setup

```typescript
import { Bot } from 'vibegram';
import { stars } from '@vibegram/stars';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(stars());
```

The middleware adds request-scoped `ctx.stars` helpers and restores any previous value after the handler finishes.

## Stars Invoice

```typescript
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

`ctx.stars.invoice()` sends `sendInvoice` to the current chat with this payload:

```typescript
{
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: 'Premium', amount: 100 }]
}
```

For subscriptions, pass Telegram's supported 30-day period:

```typescript
await ctx.stars.invoice({
    title: 'Premium subscription',
    description: 'Recurring 30-day premium access',
    payload: `sub:${ctx.from?.id}`,
    amount: 500,
    subscriptionPeriod: 2592000,
});
```

## Invoice Link

```typescript
const link = await ctx.stars.createInvoiceLink({
    title: 'Premium access',
    description: '30 days of premium access',
    payload: 'premium:42',
    amount: 100,
});
```

Store the `payload` in your own order table before sending the link.

## Pre-Checkout Guard

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

Validate:

- `currency` is `XTR`
- `total_amount` matches the server-side order
- `invoice_payload` exists in your database
- the order is still available and not already fulfilled

Telegram expects the pre-checkout answer quickly. Keep this handler lean.

## Successful Payment

```typescript
bot.on('message:successful_payment', async ctx => {
    const payment = ctx.stars.requireSuccessfulPayment({
        payloadPrefix: 'premium:',
    });

    await activatePremium({
        payload: payment.invoice_payload,
        chargeId: payment.telegram_payment_charge_id,
        amount: payment.total_amount,
    });

    await ctx.reply('Premium activated.');
});
```

Fulfill only after `successful_payment`, not after sending the invoice or approving pre-checkout.

## Refunds

```typescript
await ctx.stars.refund(ctx.from!.id, 'telegram-payment-charge-id');
```

When handling a successful-payment update:

```typescript
await ctx.stars.refundSuccessfulPayment();
```

Record refund status in your database so repeated commands do not attempt the same refund repeatedly.

## Paid Media

```typescript
await ctx.stars.paidMedia({
    starCount: 25,
    payload: `gallery:${ctx.from?.id}`,
    media: [
        { type: 'photo', media: 'https://example.com/photo.jpg' },
    ],
    caption: 'Premium gallery',
});
```

Paid-media purchase updates can be tested with fixtures:

```typescript
import { createPaidMediaPurchasedUpdate } from '@vibegram/stars';

const update = createPaidMediaPurchasedUpdate({
    userId: 42,
    paidMediaPayload: 'gallery:42',
});
```

## Gifts And Business Workflows

```typescript
await ctx.stars.gifts.send(ctx.from!.id, 'gift-id', {
    text: 'Thanks for supporting us',
});

await ctx.stars.gifts.premium(ctx.from!.id, 3, 1000, {
    text: 'Premium gift',
});
```

Business account helpers:

```typescript
await ctx.stars.business.getStarBalance('business-connection-id');
await ctx.stars.business.transferStars('business-connection-id', 250);
await ctx.stars.business.convertGiftToStars('business-connection-id', 'owned-gift-id');
await ctx.stars.business.upgradeGift('business-connection-id', 'owned-gift-id', {
    star_count: 0,
});
await ctx.stars.business.transferGift('business-connection-id', 'owned-gift-id', 123456789);
```

These methods require the matching Telegram business bot rights.

## Test Fixtures

```typescript
import {
    createPreCheckoutQueryUpdate,
    createSuccessfulPaymentUpdate,
} from '@vibegram/stars';

const preCheckout = createPreCheckoutQueryUpdate({
    payload: 'premium:42',
    totalAmount: 100,
});

const successful = createSuccessfulPaymentUpdate({
    payload: 'premium:42',
    totalAmount: 100,
    telegramPaymentChargeId: 'charge-1',
});
```

## Options And API

Exports include `stars()`, `buildStarsInvoice()`, `createPreCheckoutQueryUpdate()`, `createSuccessfulPaymentUpdate()`, `createPaidMediaPurchasedUpdate()`, `StarsPluginError`, `StarsFlavor`, and related TypeScript types.

`buildStarsInvoice(options)` accepts:

| Option | Type | Description |
| --- | --- | --- |
| `title` | `string` | Product name, max 32 characters |
| `description` | `string` | Product description, max 255 characters; defaults to title |
| `payload` | `string` | Server-side order payload, max 128 bytes |
| `amount` | `number` | Stars amount when using one generated price |
| `label` | `string` | Price label, defaults to `Stars` |
| `prices` | `LabeledPrice[]` | Explicit price list; Stars requires exactly one item |
| `subscriptionPeriod` | `2592000` | Optional 30-day subscription period |
| `extra` | object | Extra Telegram invoice fields |

## Security And Reconciliation

- Build invoices on the server.
- Treat `payload` as an opaque order ID, not as trusted user state.
- Persist the order before sending an invoice.
- Validate pre-checkout from your database.
- Fulfill only after `successful_payment`.
- Make fulfillment idempotent.
- Store `telegram_payment_charge_id` and refund state.
- Use `@vibegram/throttler` for broadcast-style paid offers and avoid blindly retrying `sendInvoice`.

## Validation

The plugin is covered by tests for Stars invoice payloads, pre-checkout handling, successful payment validation, refund helpers, gift/business helpers, and paid-media fixtures.

```bash
npm run plugins:validate
npm run docs:build
```
