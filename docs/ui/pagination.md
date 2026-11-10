# Pagination

Telegram keyboards get unwieldy past a dozen buttons. `Markup.pagination()` shows a
long list a page at a time: it takes all your items plus the current page number and
returns an inline keyboard with that page's buttons and a navigation row
(`⬅️ Prev`, a page indicator, `Next ➡️`).

The function only **draws** the keyboard. Your bot keeps track of the page and redraws
the keyboard when a navigation button is pressed.

## Quick Start

```ts
import { Bot, Markup, type PaginationItem } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const products: PaginationItem[] = Array.from({ length: 50 }, (_, i) => ({
    text: `Product #${i + 1}`,
    callback_data: `buy:${i + 1}`,
}));

const productPage = (page: number) =>
    Markup.pagination(products, {
        currentPage: page,
        itemsPerPage: 5,
        actionPrev: `products:${page - 1}`, // the target page lives in the button itself
        actionNext: `products:${page + 1}`,
        pageIndicatorPattern: 'Page {current} of {total}',
    });

bot.command('catalog', ctx => ctx.reply('Browse products:', { reply_markup: productPage(1) }));

bot.action(/^products:(\d+)$/, async ctx => {
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(productPage(Number(ctx.match![1])));
});

bot.action('ignore_nav', ctx => ctx.answerCbQuery()); // the page indicator button

bot.action(/^buy:(\d+)$/, ctx => ctx.answerCbQuery(`Product #${ctx.match![1]} added`));
```

Putting the target page in the navigation buttons' callback data keeps every message
independent: two catalogs open at once, or a button pressed on an old message, still
show the right page, and nothing needs to be stored.

## Options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `currentPage` | `number` | Yes | Page to show, starting at 1 (values below 1 become 1). |
| `itemsPerPage` | `number` | Yes | Buttons per page (values below 1 become 1). |
| `actionPrev` | `string` | Yes | Callback data of the `⬅️ Prev` button (hidden on page 1). |
| `actionNext` | `string` | Yes | Callback data of the `Next ➡️` button (hidden on the last page). |
| `columns` | `number` | No | Item buttons per row. Default `1`. |
| `pageIndicatorPattern` | `string` | No | Indicator label; `{current}` and `{total}` are replaced. Default `'{current}/{total}'`. |

## The Page Indicator Button

The middle button shows the page number. Its callback data is always `ignore_nav`.
Answer it once, as in the Quick Start; otherwise pressing it shows a loading spinner
on the button for a few seconds.

## Keeping the Page in a Session Instead

Storing the page in a [session](/state/session) also works when callback data must stay
fixed. Clamp the value: buttons on older messages can still be pressed.

```ts
import { session } from 'vibegram';

bot.use(session({ initial: () => ({ page: 1 }) }));

const PER_PAGE = 5;
const totalPages = Math.ceil(products.length / PER_PAGE);

bot.action(/^page_(next|prev)$/, async ctx => {
    const step = ctx.match![1] === 'next' ? 1 : -1;
    ctx.session.page = Math.min(totalPages, Math.max(1, ctx.session.page + step));

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(
        Markup.pagination(products, {
            currentPage: ctx.session.page,
            itemsPerPage: PER_PAGE,
            actionNext: 'page_next',
            actionPrev: 'page_prev',
        })
    );
});
```

The session holds one page per user, so two lists open in the same chat share it.

## Grid Layout

Set `columns` to show several item buttons per row:

```ts
const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 6,
    columns: 3,
    actionPrev: 'products:0',
    actionNext: 'products:2',
});
```

This renders two rows of three items, then the navigation row.

## Markup.grid() for Simple Grids

If the list fits on one screen, `Markup.grid()` arranges buttons into rows without any
navigation:

```ts
const categories = ['Electronics', 'Clothing', 'Food', 'Sports'];

await ctx.reply('Choose a category:', {
    reply_markup: Markup.grid(
        categories.map(category => Markup.button.callback(category, `cat:${category.toLowerCase()}`)),
        2
    ),
});
```

## Limits

Each `callback_data` is at most 64 bytes, and Telegram accepts up to 100 buttons per
keyboard. Keep pages small (5-10 items) so they fit on a phone screen.
