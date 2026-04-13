# Scenes

Scenes isolate portions of your bot's conversation logic into independent routers. When a user enters a scene, only the scene's handlers are active — global handlers are bypassed.

## Quick Start

```typescript
import { Bot, session, Scene, Stage } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(session());

// Define a scene
const settingsScene = new Scene('settings');

settingsScene.command('theme', ctx => ctx.reply('Choose: light or dark?'));
settingsScene.hears('back', ctx => {
    ctx.reply('Exiting settings.');
    ctx.scene?.leave();
});
settingsScene.on('message', ctx => ctx.reply('You are in settings. Type "back" to exit.'));

// Register and activate
const stage = new Stage([settingsScene]);
bot.use(stage.middleware());

// Enter the scene
bot.command('settings', ctx => ctx.scene?.enter('settings'));
```

## Scene API

| Method | Description |
|--------|-------------|
| `ctx.scene?.enter(name)` | Enter a scene by name |
| `ctx.scene?.leave()` | Exit the current scene |

## How It Works

1. When `ctx.scene?.enter('name')` is called, the session records the current scene
2. On subsequent updates, the Stage middleware checks if the user is in a scene
3. If yes, only that scene's handlers run — global handlers are skipped
4. When `ctx.scene?.leave()` is called, normal routing resumes

## Multiple Scenes

```typescript
const faqScene = new Scene('faq');
faqScene.on('message', ctx => ctx.reply('FAQ: Ask a question or type "back".'));
faqScene.hears('back', ctx => ctx.scene?.leave());

const contactScene = new Scene('contact');
contactScene.on('message', ctx => ctx.reply('Contact: Send your message or type "back".'));
contactScene.hears('back', ctx => ctx.scene?.leave());

const stage = new Stage([faqScene, contactScene]);
bot.use(stage.middleware());

bot.command('faq', ctx => ctx.scene?.enter('faq'));
bot.command('contact', ctx => ctx.scene?.enter('contact'));
```

::: tip
Register `bot.use(session())` **before** `bot.use(stage.middleware())` — the Stage depends on session data.
:::
