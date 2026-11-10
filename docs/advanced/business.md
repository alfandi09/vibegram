# Business, Gifts, and Stories

<ApiMethodCard title="Business wrappers" endpoint="bot.*Business*" since="1.2.0" returns="Telegram API result" method="BOT">
  These methods are Bot-level wrappers for connected business accounts, gifts, and story
  operations that do not belong to one incoming update.
</ApiMethodCard>

<SecurityNote title="Business account scope" variant="tip">
Only call business methods when Telegram has provided a valid business connection or owned
gift/story identifier for the account you are managing.
</SecurityNote>

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

Stories are posted on behalf of a business account, so they need its `business_connection_id`. Telegram sends it when the account connects the bot (the `business_connection` update); store it then. Inside business updates it is also available as `ctx.businessConnectionId`.

Pass the file itself (a `Buffer`, or `{ source, filename }`); vibegram uploads it and fills in the `attach://` reference for you:

```typescript
import { readFile } from 'node:fs/promises';

bot.on('business_connection', async ctx => {
    const connection = ctx.update.business_connection!;
    await db.saveConnection(connection.user.id, connection.id); // keep it for later
});

await bot.postStory(
    connectionId,
    { type: 'photo', photo: await readFile('./launch.jpg') },
    21600, // visible for 6 hours
    {
        caption: 'Launch update',
        post_to_chat_page: true,
    }
);
```

For methods that are not wrapped yet, use `bot.callApi()` or `ctx.telegram.callApi()` with the official Telegram payload shape.
