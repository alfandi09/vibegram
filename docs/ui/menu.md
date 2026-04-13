# Menu Builder

The Menu builder creates stateful inline menus with automatic callback handling, sub-menu navigation, and dynamic button visibility.

## Quick Start

```typescript
import { Bot, Menu, session } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(session());

const menu = new Menu('main');

menu.text('📢 News', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Latest news...');
});

menu.text('💰 Balance', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Balance: $100.00');
});

bot.use(menu.middleware());

bot.command('menu', async (ctx) => {
    await ctx.reply('Main Menu:', { reply_markup: await menu.render(ctx) });
});
```

## API

| Method | Description |
|--------|-------------|
| `menu.text(label, handler)` | Add a callback button |
| `menu.url(label, url)` | Add a URL button |
| `menu.row()` | Start a new button row |
| `menu.submenu(id, label)` | Create a child sub-menu |
| `menu.back(label?)` | Add a "Back to parent" button |
| `menu.render(ctx)` | Generate the keyboard markup |
| `menu.middleware()` | Get the callback handling middleware |

## Sub-Menus

```typescript
const mainMenu = new Menu('main');
mainMenu.text('Home', ctx => ctx.answerCbQuery('Home'));

mainMenu.row();

// Create sub-menu — returns a new Menu instance
const settingsMenu = mainMenu.submenu('settings', '⚙️ Settings');
settingsMenu.text('🌙 Dark Mode', ctx => ctx.answerCbQuery('Toggled'));
settingsMenu.text('🔔 Notifications', ctx => ctx.answerCbQuery('Toggled'));
settingsMenu.row();
settingsMenu.back('← Back to Main');

bot.use(mainMenu.middleware());
```

When the user taps "⚙️ Settings", the keyboard auto-edits to show the sub-menu. Tapping "← Back" returns to the parent.

## Dynamic Visibility

Hide buttons conditionally:

```typescript
menu.text('🔐 Admin Panel', adminHandler, {
    hide: (ctx) => !isUserAdmin(ctx.from?.id)
});
```

## Menu vs Manual Keyboards

| Feature | Manual `Markup.inlineKeyboard` | `Menu` |
|---------|-------------------------------|--------|
| Button handlers | Separate `bot.action()` calls | Inline with `menu.text()` |
| Sub-menus | Manual edit logic | Automatic |
| Back navigation | Manual | Built-in |
| Dynamic visibility | Manual conditionals | `hide` option |
