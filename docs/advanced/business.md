# Business, Gifts, and Stories

VibeGram exposes Telegram business account, gift, and story methods as typed `Bot` wrappers. Use them when your bot manages a connected business account or needs direct access outside a `Context` handler.

## Business Account

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

await bot.setBusinessAccountName('business-connection-id', 'Acme Support');

await bot.setBusinessAccountGiftSettings('business-connection-id', true, {
    unlimited_gifts: true,
    limited_gifts: true,
    unique_gifts: true,
    premium_subscription: true,
});
```

## Gifts

```typescript
const gifts = await bot.getAvailableGifts();
const giftId = gifts.gifts[0]?.id;

if (giftId) {
    await bot.sendGift(123456789, giftId, {
        text: 'Thanks for your support!',
    });
}

const ownedGifts = await bot.getBusinessAccountGifts('business-connection-id', {
    limit: 10,
    sort_by_price: true,
});
```

## Stories

```typescript
await bot.postStory(
    'business-connection-id',
    { type: 'photo', photo: 'attach://launch-photo' },
    21600,
    {
        caption: 'Launch update',
        post_to_chat_page: true,
    }
);
```

For methods that are not wrapped yet, use `bot.callApi()` or `ctx.telegram.callApi()` with the official Telegram payload shape.
