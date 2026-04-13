# Pagination

VibeGram's automatic pagination system converts any array into paginated inline keyboards with navigation buttons.

## Quick Start

```typescript
import { Markup, PaginationItem } from 'vibegram';

const products: PaginationItem[] = Array.from({ length: 50 }).map((_, i) => ({
    text: `Product #${i + 1}`,
    callback_data: `buy_${i + 1}`
}));

const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 5,
    actionNext: 'page_next',
    actionPrev: 'page_prev',
    pageIndicatorPattern: 'Page {current} of {total}'
});

await ctx.reply('Browse products:', { reply_markup: keyboard });
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `currentPage` | `number` | `1` | Current page number |
| `itemsPerPage` | `number` | `5` | Items per page |
| `columns` | `number` | `1` | Items per row |
| `actionNext` | `string` | — | Callback data for "Next" button |
| `actionPrev` | `string` | — | Callback data for "Prev" button |
| `pageIndicatorPattern` | `string` | — | Pattern for page indicator text |

## Handling Navigation

```typescript
bot.action(/page_(next|prev)/, async (ctx) => {
    ctx.session.page = ctx.session.page || 1;
    const direction = ctx.update.callback_query?.data?.includes('next') ? 1 : -1;
    ctx.session.page += direction;
    if (ctx.session.page < 1) ctx.session.page = 1;

    const keyboard = Markup.pagination(products, {
        currentPage: ctx.session.page,
        itemsPerPage: 5,
        actionNext: 'page_next',
        actionPrev: 'page_prev'
    });

    await ctx.answerCbQuery();
    await bot.callApi('editMessageReplyMarkup', {
        chat_id: ctx.chat?.id,
        message_id: ctx.update.callback_query?.message?.message_id,
        reply_markup: keyboard.inline_keyboard
    });
});
```

## Grid Layout

Use `columns` for multi-column grids:

```typescript
const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3, // 3 items per row × 2 rows
    actionNext: 'page_next',
    actionPrev: 'page_prev'
});
```
