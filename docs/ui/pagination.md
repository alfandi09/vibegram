# Pagination

`Markup.pagination()` converts an array of inline keyboard items into a paged
inline keyboard with previous/next navigation.

## Quick Start

```ts
import { Markup, type PaginationItem } from 'vibegram';

const products: PaginationItem[] = Array.from({ length: 50 }).map((_, i) => ({
    text: `Product #${i + 1}`,
    callback_data: `buy_${i + 1}`,
}));

const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 5,
    actionNext: 'page_next',
    actionPrev: 'page_prev',
    pageIndicatorPattern: 'Page {current} of {total}',
});

await ctx.reply('Browse products:', { reply_markup: keyboard });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `currentPage` | `number` | `1` | Current page number. |
| `itemsPerPage` | `number` | `1` inside implementation guard | Items per page. |
| `columns` | `number` | `1` | Items per row. |
| `actionNext` | `string` | Required | Callback data for the next button. |
| `actionPrev` | `string` | Required | Callback data for the previous button. |
| `pageIndicatorPattern` | `string` | `'{current}/{total}'` | Page indicator label pattern. |

`currentPage` and `itemsPerPage` are clamped to at least `1`.

## Handling Navigation

```ts
bot.use(session({ initial: () => ({ page: 1 }) }));

bot.action(/page_(next|prev)/, async ctx => {
    const direction = ctx.match?.[1] === 'next' ? 1 : -1;
    ctx.session.page = Math.max(1, ctx.session.page + direction);

    const keyboard = Markup.pagination(products, {
        currentPage: ctx.session.page,
        itemsPerPage: 5,
        actionNext: 'page_next',
        actionPrev: 'page_prev',
        pageIndicatorPattern: 'Page {current} of {total}',
    });

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(keyboard);
});
```

Track the current page in session, a database, or callback data depending on how
long the navigation state must survive.

## Grid Layout

Use `columns` for multi-column pages.

```ts
const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3,
    actionNext: 'page_next',
    actionPrev: 'page_prev',
});
```

This renders up to three item buttons per row, then appends the navigation row.

## Markup.grid() for Simple Grids

If you do not need pagination, use `Markup.grid()`.

```ts
const categories = ['Electronics', 'Clothing', 'Food', 'Sports'];

await ctx.reply('Choose a category:', {
    reply_markup: Markup.grid(
        categories.map(category => {
            return Markup.button.callback(category, `cat_${category.toLowerCase()}`);
        }),
        2
    ),
});
```

`Markup.grid()` only arranges buttons. It does not add navigation controls.

## Complete Product Catalog Example

```ts
bot.use(session({ initial: () => ({ page: 1 }) }));

function productKeyboard(page: number) {
    return Markup.pagination(allProducts, {
        currentPage: page,
        itemsPerPage: 8,
        columns: 2,
        actionNext: 'products_next',
        actionPrev: 'products_prev',
        pageIndicatorPattern: '{current}/{total}',
    });
}

bot.command('catalog', ctx => {
    ctx.session.page = 1;
    return ctx.reply('Product catalog:', {
        reply_markup: productKeyboard(ctx.session.page),
    });
});

bot.action(/products_(next|prev)/, async ctx => {
    const direction = ctx.match?.[1] === 'next' ? 1 : -1;
    ctx.session.page = Math.max(1, ctx.session.page + direction);

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(productKeyboard(ctx.session.page));
});

bot.action(/^buy_(\d+)$/, async ctx => {
    const id = ctx.match?.[1];
    await ctx.answerCbQuery(`Product #${id} added`);
});
```
