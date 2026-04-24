<h1 align="center">VibeGram</h1>

<p align="center">
  <b>Modern, modular, production-ready Telegram Bot Framework for Node.js.</b>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
  <img alt="Bot API" src="https://img.shields.io/badge/Bot%20API-v9.6-blue?style=for-the-badge" />
  <img alt="Lightweight" src="https://img.shields.io/badge/Footprint-Lightweight-success?style=for-the-badge" />
  <img alt="Node.js version" src="https://img.shields.io/badge/Node.js-%E2%89%A518-brightgreen?style=for-the-badge&logo=node.js&logoColor=white" />
  <a href="https://www.npmjs.com/package/vibegram"><img alt="npm version" src="https://img.shields.io/npm/v/vibegram?style=for-the-badge" /></a>
  <a href="https://www.npmjs.com/package/vibegram"><img alt="npm downloads" src="https://img.shields.io/npm/dm/vibegram?style=for-the-badge" /></a>
  <a href="https://github.com/alfandi09/vibegram/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/alfandi09/vibegram/ci.yml?branch=main&style=for-the-badge" /></a>
</p>

---

VibeGram is a lightweight Telegram Bot framework built entirely in TypeScript. It gives you the core pieces for production bots in one package: middleware, typed context helpers, state management, pagination, rate limiting, WebApp validation, and webhook adapters.

## Key Features

- **Middleware Pipeline** - Koa.js-style async middleware with onion-model routing
- **Broad Bot API v9.6 Support** - 60+ context methods and typed support for major Telegram Bot API objects
- **Scene, Wizard, and Conversation Flows** - Multiple approaches for structured multi-step interactions
- **Auto Pagination and Menu Utilities** - Build interactive inline UIs with less boilerplate
- **Built-in Security** - Rate limiting, HMAC-SHA256 WebApp validation, and webhook secret tokens
- **Keyboard Builder** - Declarative inline, reply, and force-reply keyboard construction
- **Smart Command Parsing** - Parse `/command arg1 arg2` via `ctx.command.args`
- **I18n Support** - Locale-aware middleware with auto-detection
- **Observability Hooks** - Request logging, timing metrics, and lifecycle hooks for retries and failures
- **Verified Release Pipeline** - Automated tests, typechecks, example validation, dual CJS/ESM build, and docs generation

---

## What's Included

This table highlights built-in VibeGram capabilities, not a ranking of other bot frameworks.

| Capability            | Included |
| --------------------- | :------: |
| Middleware Pipeline   |   Yes    |
| Pagination Utilities  |   Yes    |
| Broadcast Queue       |   Yes    |
| API Response Cache    |   Yes    |
| Job Scheduler         |   Yes    |
| Conversation Engine   |   Yes    |
| Menu Builder          |   Yes    |
| Inline Result Builder |   Yes    |
| TypeScript Types      |   Yes    |
| Plugin System         |   Yes    |

---

## Installation

Requires [Node.js](https://nodejs.org/) v18.0 or later.

```bash
npm install vibegram
```

---

## Quick Start

```typescript
import { Bot } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.command('start', async ctx => {
    const name = ctx.from?.first_name || 'there';
    await ctx.reply(`Hello ${name}! Welcome to VibeGram.`);
});

bot.hears(/hello|hi/i, async ctx => {
    await ctx.reply('Hey! How can I help you?');
});

bot.launch().then(() => console.log('Bot is running'));
```

---

## Feature Highlights

### Pagination

```typescript
import { Markup } from 'vibegram';

const products = [...Array(100)].map((_, i) => ({
    text: `Product #${i + 1}`,
    callback_data: `buy_${i + 1}`,
}));

const keyboard = Markup.pagination(products, {
    currentPage: 1,
    itemsPerPage: 5,
    actionNext: 'page_2',
    actionPrev: 'page_0',
    pageIndicatorPattern: 'Page {current}/{total}',
});

await ctx.reply('Browse products:', { reply_markup: keyboard });
```

### Wizard (Multi-Step Forms)

```typescript
import { Wizard, session } from 'vibegram';

bot.use(session());

const checkout = new Wizard('checkout', [
    async ctx => {
        await ctx.reply('What is the recipient name?');
        ctx.wizard?.next();
    },
    async ctx => {
        const name = ctx.message?.text;
        await ctx.reply(`Package for ${name} will be shipped. Done!`);
        ctx.wizard?.leave();
    },
]);

bot.use(checkout.middleware());
bot.command('buy', ctx => checkout.enter(ctx));
```

### Rate Limiter

```typescript
import { rateLimit } from 'vibegram';

// Auto-tuned to Telegram's rate limits (1 msg/sec private, 20/min group)
bot.use(rateLimit());
```

### Scene Manager

```typescript
import { Scene, Stage, session } from 'vibegram';

const adminRoom = new Scene('admin');
adminRoom.hears('exit', ctx => ctx.scene?.leave());
adminRoom.on('message', ctx => ctx.reply('You are in admin mode. Type "exit" to leave.'));

const stage = new Stage([adminRoom]);
bot.use(session());
bot.use(stage.middleware());

bot.command('admin', ctx => ctx.scene?.enter('admin'));
```

### WebApp Validation

```typescript
// In your Express.js API handler
const data = bot.validateWebAppData(initData, { maxAgeSeconds: 300 });
```

### Webhook with Framework Adapters

VibeGram ships with first-class adapters for major Node.js frameworks:

```typescript
import { createExpressMiddleware, createFastifyPlugin, createHonoHandler } from 'vibegram';
import express from 'express';

// Express
const app = express();
app.use(express.json());
app.post('/webhook', createExpressMiddleware(bot, { secretToken: 'my-secret' }));

// Fastify
fastify.register(createFastifyPlugin(bot, { path: '/webhook', secretToken: 'my-secret' }));

// Hono
app.post('/webhook', createHonoHandler(bot, { secretToken: 'my-secret' }));
```

### Grid Keyboard - `Markup.grid()`

```typescript
import { Markup } from 'vibegram';

// Automatically arranges flat buttons into rows
await ctx.reply('Choose a day:', {
    reply_markup: Markup.grid(
        [
            Markup.button.callback('Mon', 'mon'),
            Markup.button.callback('Tue', 'tue'),
            Markup.button.callback('Wed', 'wed'),
            Markup.button.callback('Thu', 'thu'),
            Markup.button.callback('Fri', 'fri'),
        ],
        2
    ), // 2 buttons per row
});
```

### RegExp Capture Groups - `ctx.match`

```typescript
// ctx.match is populated automatically for RegExp triggers
bot.hears(/^order (\d+)$/, async ctx => {
    const orderId = ctx.match![1];
    await ctx.reply(`Looking up order #${orderId}...`);
});

bot.action(/^item_(\d+)$/, async ctx => {
    const itemId = ctx.match![1];
    await ctx.answerCbQuery(`Item #${itemId} selected`);
});
```

---

## Documentation

Full documentation lives in `docs/` and can be served locally with VitePress:

```bash
npm run docs:dev
```

Generate API reference with TypeDoc:

```bash
npm run docs:api
```

Generated API HTML is written to `generated/api/`.

Maintainer references:

- `docs/core/observability.md`
- `CONTRIBUTING.md`

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md) for supported versions and disclosure guidance.

---

<p align="center">
  <b>Built for the Open Source community.</b>
  <br>
  ISC License
</p>
