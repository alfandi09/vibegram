# Telegram Stars & Payments

<SecurityNote title="Payment safety" variant="warning">
Validate prices, payloads, and pre-checkout queries on the server side. Do not trust client
state when fulfilling paid content.
</SecurityNote>

<FeatureGrid title="Payment surfaces" description="Use Telegram payments for invoices and Stars for digital content flows.">
  <FeatureCard title="Invoices" description="Create payment flows with Telegram invoice APIs." href="#invoices" />
  <FeatureCard title="Stars" description="Handle digital content monetization with Stars methods." href="#telegram-stars" />
  <FeatureCard title="Checkout" description="Answer pre-checkout queries before completing fulfillment." href="#pre-checkout" />
</FeatureGrid>

VibeGram supports Telegram's built-in payment system, including Telegram Stars for digital content monetization.

## Sending Paid Media

```typescript
bot.command('premium', async ctx => {
    await ctx.replyWithPaidMedia(
        15, // Price in Telegram Stars
        [{ type: 'photo', media: 'https://example.com/premium-content.jpg' }],
        { caption: 'Premium content — 15 Stars' }
    );
});
```

## Invoices

```typescript
bot.command('buy', async ctx => {
    await ctx.replyWithInvoice({
        title: 'Pro Membership',
        description: '30-day access to premium features',
        payload: 'pro_membership_30d',
        provider_token: 'YOUR_PAYMENT_PROVIDER_TOKEN',
        currency: 'USD',
        prices: [{ label: 'Pro Membership', amount: 999 }], // $9.99
    });
});
```

## Pre-Checkout

```typescript
bot.on('pre_checkout_query', async ctx => {
    // Validate the order before charging
    await ctx.answerPreCheckoutQuery(true);
});
```

## Successful Payment

```typescript
bot.on('message', async ctx => {
    if (ctx.message?.successful_payment) {
        const payment = ctx.message.successful_payment;
        await ctx.reply(`Payment of ${payment.total_amount} ${payment.currency} received!`);
    }
});
```
