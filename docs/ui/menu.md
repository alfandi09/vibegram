# Menu Builder

`Menu` builds inline keyboards whose buttons carry their own handlers. You do not
write a separate `bot.action()` for every button, and sub-menus with a "Back" button
work out of the box: pressing them edits the keyboard in place.

Use `Menu` for settings screens, store fronts, and any navigation that lives in one
message. For one-off buttons, plain [keyboards](/ui/keyboards) with `bot.action()` are
simpler.

## Quick Start

```typescript
import { Bot, Menu } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const menu = new Menu('main');

menu.text('📢 News', async ctx => {
    await ctx.answerCbQuery(); // stop the loading spinner on the button
    await ctx.reply('Latest news...');
});

menu.text('💰 Balance', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Balance: $100.00');
});

bot.use(menu.middleware()); // register once, before other handlers

bot.command('menu', async ctx => {
    await ctx.reply('Main menu:', { reply_markup: await menu.render(ctx) });
});
```

Three steps: add buttons, register `menu.middleware()`, and send the keyboard from
`menu.render(ctx)`. Button handlers must call `ctx.answerCbQuery()`, otherwise
Telegram keeps a loading spinner on the button for a few seconds.

## API

| Method | Description |
| --- | --- |
| `menu.text(label, handler, { hide? })` | Add a button that runs `handler` when pressed |
| `menu.url(label, url)` | Add a button that opens a link |
| `menu.row()` | Start a new row of buttons |
| `menu.submenu(id, label)` | Add a button that opens a child menu; returns the child |
| `menu.back(label?)` | In a sub-menu, add a button back to the parent |
| `menu.render(ctx)` | Build the `InlineKeyboardMarkup` to send or edit |
| `menu.middleware()` | Handle presses of this menu and all of its sub-menus |

## Sub-Menus

`submenu()` returns a new `Menu`. Fill it like any menu and add `back()` to return.
Opening a sub-menu and going back both edit the current message's keyboard and answer
the button press for you.

```typescript
const mainMenu = new Menu('main');
mainMenu.text('Home', ctx => ctx.answerCbQuery('You are home'));
mainMenu.row();

const settings = mainMenu.submenu('settings', '⚙️ Settings');
settings.text('🌙 Dark mode', ctx => ctx.answerCbQuery('Dark mode toggled'));
settings.text('🔔 Notifications', ctx => ctx.answerCbQuery('Notifications toggled'));
settings.row();
settings.back('← Back');

bot.use(mainMenu.middleware()); // the root middleware also handles every sub-menu
```

Give every menu and sub-menu a unique id: the id is part of each button's callback data.

## Hiding Buttons

`hide` is checked each time the menu is rendered. Return `true` to leave the button
out, for example to show an admin entry only to admins:

```typescript
import { isAdmin, not } from 'vibegram';

menu.text(
    '🔐 Admin panel',
    async ctx => {
        // Check again here: hiding a button does not protect its handler.
        if (!(await isAdmin()(ctx))) return ctx.answerCbQuery('Admins only.');
        await ctx.answerCbQuery();
        await ctx.reply('Admin panel');
    },
    { hide: not(isAdmin()) }
);
```

::: warning Hidden is not protected
A modified Telegram client can send any callback data, including the data of a hidden
button. Always repeat permission checks inside the handler.
:::

## Changing a Menu Safely

Each button's callback data is built from the menu id and the button's position, such
as `menu:main:1_0`. Buttons on messages that were sent earlier keep their old data. If
you reorder or insert buttons and redeploy, an old message's button may now run a
different handler.

To change a live menu safely, add new buttons at the end, or give the changed menu a
new id (`new Menu('main-v2')`) so old buttons no longer match anything.

## Example: Store Menu

```typescript
const store = new Menu('store');

store.text('🛍️ Catalog', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Opening the catalog...');
});

store.text('🛒 Cart', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Your cart is empty.');
});

store.row();
store.url('💬 Support', 'https://example.com/support');

bot.use(store.middleware());
bot.command('store', async ctx => {
    await ctx.reply('Welcome to the store!', { reply_markup: await store.render(ctx) });
});
```

## Menu vs Manual Keyboards

| Feature | `Markup.inlineKeyboard` + `bot.action()` | `Menu` |
| --- | --- | --- |
| Button handlers | A separate `bot.action()` per button | Next to the button in `menu.text()` |
| Sub-menus | Write the edit logic yourself | Built in |
| Back navigation | Write it yourself | `menu.back()` |
| Conditional buttons | `if` statements while building | `hide` option |
| Stable callback data across deploys | You choose the data | Based on position (see above) |
