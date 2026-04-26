# Bisnis, Hadiah, dan Stories

VibeGram menyediakan wrapper typed untuk metode akun bisnis, hadiah, dan stories Telegram. Gunakan wrapper ini saat bot mengelola akun bisnis yang terhubung atau saat butuh akses langsung di luar handler `Context`.

## Akun Bisnis

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

## Hadiah

```typescript
const gifts = await bot.getAvailableGifts();
const giftId = gifts.gifts[0]?.id;

if (giftId) {
    await bot.sendGift(123456789, giftId, {
        text: 'Terima kasih atas dukungannya!',
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
        caption: 'Update peluncuran',
        post_to_chat_page: true,
    }
);
```

Untuk metode yang belum punya wrapper, gunakan `bot.callApi()` atau `ctx.telegram.callApi()` dengan bentuk payload resmi Telegram.
