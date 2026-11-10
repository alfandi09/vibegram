# Inline Query Builder

In **inline mode**, users type `@yourbot something` in any chat and pick a result from
a list your bot returns, like a search box that works everywhere. `InlineResults`
builds that result list with typed options for each result kind.

## Enable Inline Mode First

Telegram only sends `inline_query` updates to bots with inline mode turned on. Open
[@BotFather](https://t.me/BotFather), send `/setinline`, choose your bot, and type the
placeholder text users see (for example `Search products...`). Without this step the
handlers below never run.

## Quick Start

```typescript
import { Bot, InlineResults } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.on('inline_query', async ctx => {
    const query = ctx.update.inline_query.query; // what the user typed after @yourbot

    const results = InlineResults.builder()
        .article({
            id: 'greeting',
            title: 'Send a greeting',
            description: `Says hello with "${query}"`,
            text: `Hello! You searched for: ${query}`,
        })
        .photo({
            id: 'random-photo',
            url: 'https://picsum.photos/400',
            caption: 'A random photo',
        })
        .build();

    await ctx.answerInlineQuery(results, { cache_time: 10 });
});
```

When the user taps a result, Telegram sends its content to the chat as a message
"via @yourbot". `answerInlineQuery` must be called within about 10 seconds.

## Rules Telegram Enforces

- At most **50 results** per answer. Load more with `next_offset` (see below).
- Each result `id` must be unique within the answer and at most 64 bytes.
- `cache_time` (seconds, default 300) lets Telegram reuse your answer for the same
  query. Set `is_personal: true` when results depend on who is asking.

## Result Types

| Method | Telegram type | Required options |
| --- | --- | --- |
| `.article(opts)` | `InlineQueryResultArticle` | `id`, `title`, `text` |
| `.photo(opts)` | `InlineQueryResultPhoto` | `id`, `url` (JPEG) |
| `.document(opts)` | `InlineQueryResultDocument` | `id`, `title`, `document_url`, `mime_type` |
| `.video(opts)` | `InlineQueryResultVideo` | `id`, `title`, `video_url`, `mime_type`, `thumbnail_url` |
| `.gif(opts)` | `InlineQueryResultGif` | `id`, `gif_url` |
| `.voice(opts)` | `InlineQueryResultVoice` | `id`, `title`, `voice_url` |
| `.location(opts)` | `InlineQueryResultLocation` | `id`, `title`, `latitude`, `longitude` |
| `.venue(opts)` | `InlineQueryResultVenue` | `id`, `title`, `latitude`, `longitude`, `address` |
| `.contact(opts)` | `InlineQueryResultContact` | `id`, `phone_number`, `first_name` |

Every builder method returns the builder, so calls chain; `.build()` returns the array
to pass to `ctx.answerInlineQuery()`.

## Article Options

An article sends a text message. It is the most common result kind.

```typescript
InlineResults.builder().article({
    id: 'faq-shipping', // unique, at most 64 bytes
    title: 'Shipping times', // bold first line in the result list
    description: '2-5 business days', // grey second line
    text: '<b>Shipping</b>: 2-5 business days.', // the message that gets sent
    parse_mode: 'HTML',
    url: 'https://example.com/shipping', // optional link shown with the result
    thumbnail_url: 'https://example.com/icons/truck.png',
    reply_markup: { inline_keyboard: [[{ text: 'Track order', url: 'https://example.com/track' }]] },
});
```

## Photo Options

```typescript
InlineResults.builder().photo({
    id: 'cat-1',
    url: 'https://example.com/cat.jpg', // a JPEG; also used as the thumbnail by default
    title: 'Cat',
    caption: 'A very good cat',
    photo_width: 800,
    photo_height: 600,
});
```

## Example: Product Search with Paging

User input and database values must be escaped before they go into HTML; a product
named `Salt & Pepper` would otherwise make Telegram reject the message.

```typescript
import { InlineResults, Markup } from 'vibegram';

const PAGE_SIZE = 20;

bot.on('inline_query', async ctx => {
    const { query, offset } = ctx.update.inline_query;
    const page = Number(offset) || 0; // Telegram sends back the next_offset you returned

    const products = await db.products.findMany({
        where: { name: { contains: query } },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
    });

    const builder = InlineResults.builder();
    for (const product of products) {
        builder.article({
            id: `product_${product.id}`,
            title: product.name,
            description: `$${product.price} · ${product.stock} in stock`,
            text: `<b>${Markup.escapeHTML(product.name)}</b>\nPrice: $${product.price}`,
            parse_mode: 'HTML',
            thumbnail_url: product.imageUrl,
        });
    }

    await ctx.answerInlineQuery(builder.build(), {
        cache_time: 30,
        is_personal: false,
        next_offset: products.length === PAGE_SIZE ? String(page + 1) : '', // '' = no more pages
    });
});
```

## Knowing Which Result Was Chosen

To learn which result a user sent (for analytics or to count usage), turn on inline
feedback with `/setinlinefeedback` in @BotFather and handle `chosen_inline_result`:

```typescript
bot.on('chosen_inline_result', ctx => {
    const { result_id, query } = ctx.update.chosen_inline_result;
    console.log(`Sent ${result_id} for "${query}"`);
});
```
