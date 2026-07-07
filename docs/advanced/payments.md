# Telegram Stars & Payments

<SecurityNote title="Payment safety" variant="warning">
Validate prices, payloads, pre-checkout queries, and fulfillment state on the
server. Never trust client state when unlocking paid content.
</SecurityNote>

<FeatureGrid title="Payment surfaces" description="Use Telegram payments for invoices and Stars for digital content flows.">
  <FeatureCard title="Invoices" description="Create payment flows with Telegram invoice APIs." href="#invoices" />
  <FeatureCard title="Paid media" description="Sell digital content with Stars-backed paid media." href="#sending-paid-media" />
  <FeatureCard title="Checkout" description="Answer pre-checkout queries before fulfillment." href="#pre-checkout" />
</FeatureGrid>

VibeGram supports Telegram invoices, pre-checkout validation, successful payment
updates, Telegram Stars paid media, refunds, gifts, and transaction history.

## Sending Paid Media

```ts
bot.command('premium', async ctx => {
    await ctx.replyWithPaidMedia(
        15,
        [{ type: 'photo', media: 'https://example.com/premium-content.jpg' }],
        { caption: 'Premium content - 15 Stars' }
    );
});
```

Use paid media for digital content that is fulfilled inside Telegram.

## Invoices

```ts
bot.command('buy', async ctx => {
    await ctx.replyWithInvoice(
        'Pro Membership',
        '30-day access to premium features',
        'pro_membership_30d',
        'USD',
        [{ label: 'Pro Membership', amount: 999 }],
        { provider_token: process.env.PAYMENT_PROVIDER_TOKEN! }
    );
});
```

Amounts use the smallest currency unit for normal currencies. For Stars flows,
follow Telegram's `XTR` rules and provider requirements.

## Pre-Checkout

```ts
bot.on('pre_checkout_query', async ctx => {
    const payload = ctx.update.pre_checkout_query?.invoice_payload;

    if (payload === 'pro_membership_30d') {
        await ctx.answerPreCheckoutQuery(true);
    } else {
        await ctx.answerPreCheckoutQuery(false, 'Product not found.');
    }
});
```

Always validate the payload, price, user, and availability before approving the
charge.

## Successful Payment

```ts
bot.on('message', async ctx => {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    await activatePremium(ctx.from!.id, payment.telegram_payment_charge_id);

    await ctx.reply(
        `Payment received: ${payment.total_amount} ${payment.currency}`
    );
});
```

Make fulfillment idempotent by storing the Telegram payment charge ID before
unlocking paid features.

## Refund Telegram Stars

```ts
bot.command('refund', async ctx => {
    const chargeId = ctx.command?.args?.[0];
    if (!chargeId || !ctx.from) return ctx.reply('Send a transaction ID.');

    await ctx.refundStarPayment(ctx.from.id, chargeId);
    await ctx.reply('Stars refunded.');
});
```

Only expose refund commands to trusted operators or protected admin flows.

## Gift Stars

```ts
bot.command('gift', async ctx => {
    if (!ctx.from) return;

    const gifts = await ctx.getAvailableGifts();
    const giftId = gifts.gifts[0]?.id;
    if (!giftId) return ctx.reply('No gifts available.');

    await ctx.sendGift(ctx.from.id, giftId, {
        text: 'Thanks for using the bot.',
    });
});

bot.command('balance', async ctx => {
    const balance = await ctx.getMyStarBalance();
    await ctx.reply(`Bot Stars balance: ${balance.amount}`);
});
```

Use `getAvailableGifts()` before sending a gift because available gifts can
change over time.

## Transaction History

```ts
bot.command('transactions', async ctx => {
    const history = await ctx.getStarTransactions({ limit: 10 });
    const lines = history.transactions.map(transaction => {
        return `${transaction.id}: ${transaction.amount.amount} Stars`;
    });

    await ctx.reply(lines.join('\n') || 'No transactions yet.');
});
```

Keep transaction IDs in your own database when fulfillment or refund workflows
depend on them.

## Payment Buttons

```ts
import { Markup } from 'vibegram';

await ctx.reply('Continue checkout:', {
    reply_markup: Markup.inlineKeyboard([[Markup.button.pay('Pay now')]]),
});
```

Telegram payment buttons are only valid in invoice messages and must follow
Telegram's placement rules.
