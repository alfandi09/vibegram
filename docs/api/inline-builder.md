# Inline Query Builder

The `InlineResults` builder provides a fluent API for constructing inline query result arrays — typed and clean.

## Quick Start

```typescript
import { Bot, InlineResults } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.on('inline_query', async (ctx) => {
    const query = ctx.update.inline_query?.query || '';

    const results = InlineResults.builder()
        .article({
            id: '1',
            title: 'Hello World',
            text: `You searched for: ${query}`,
            description: 'Send a greeting'
        })
        .photo({
            id: '2',
            url: 'https://picsum.photos/400',
            caption: 'Random photo'
        })
        .build();

    await ctx.answerInlineQuery(results, { cache_time: 10 });
});
```

## Result Types

| Method | Telegram Type | Description |
|--------|--------------|-------------|
| `.article(opts)` | `InlineQueryResultArticle` | Text article with title |
| `.photo(opts)` | `InlineQueryResultPhoto` | Photo by URL |
| `.document(opts)` | `InlineQueryResultDocument` | Document file |
| `.video(opts)` | `InlineQueryResultVideo` | Video by URL |
| `.gif(opts)` | `InlineQueryResultGif` | Animated GIF |
| `.voice(opts)` | `InlineQueryResultVoice` | Voice note |
| `.location(opts)` | `InlineQueryResultLocation` | Geographic location |
| `.venue(opts)` | `InlineQueryResultVenue` | Venue with address |
| `.contact(opts)` | `InlineQueryResultContact` | Phone contact |

## Article Options

```typescript
.article({
    id: string,           // Unique result ID
    title: string,        // Result title
    text: string,         // Message text to send
    description?: string, // Subtitle shown in results
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2',
    url?: string,         // URL shown in results
    thumbnail_url?: string,
    reply_markup?: any    // Inline keyboard
})
```

## Photo Options

```typescript
.photo({
    id: string,
    url: string,            // Photo URL
    thumbnail_url?: string, // Defaults to url
    title?: string,
    caption?: string,
    parse_mode?: string,
    photo_width?: number,
    photo_height?: number,
    reply_markup?: any
})
```

## Chaining

All methods return `this` for fluent chaining:

```typescript
const results = InlineResults.builder()
    .article({ id: '1', title: 'First', text: 'Message 1' })
    .article({ id: '2', title: 'Second', text: 'Message 2' })
    .photo({ id: '3', url: 'https://example.com/img.jpg' })
    .gif({ id: '4', gif_url: 'https://example.com/anim.gif' })
    .build();

console.log(results.length); // 4
```
