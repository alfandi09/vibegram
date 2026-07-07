# Installation

<PackageStats />

<InstallTabs />

<CompatibilityTable />

<SecurityNote title="Keep secrets outside the repository" variant="warning">
Install the package in your application project, then read bot tokens from environment
variables. Never commit `.env` files or real Telegram tokens.
</SecurityNote>

## Requirements

- Node.js v18.0 or later
- npm or yarn
- A Telegram bot token from BotFather

Check your Node.js version:

```bash
node --version
```

## Install

```bash
npm install vibegram
```

Or with yarn:

```bash
yarn add vibegram
```

## TypeScript Setup

VibeGram is written in TypeScript and ships type declarations. No extra `@types`
package is required for VibeGram itself.

For a new TypeScript project:

```bash
mkdir my-bot && cd my-bot
npm init -y
npm install vibegram
npm install -D typescript ts-node @types/node
npx tsc --init
```

Recommended `tsconfig.json`:

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "CommonJS",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"]
}
```

## Environment Token

Create the bot in Telegram via `@BotFather`, then store the token in your runtime
environment:

```bash
BOT_TOKEN=1234567890:replace-me
```

For local `.env` loading:

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';
```

## First Bot

Create `src/index.ts`:

```typescript
import 'dotenv/config';
import { Bot } from 'vibegram';

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN is required');
}

const bot = new Bot(token);

bot.start(async ctx => {
    const name = ctx.from?.first_name ?? 'friend';
    await ctx.reply(`Hello ${name}. Welcome to the bot.`);
});

bot.hears(/hello|hi/i, ctx => ctx.reply('Hi. How can I help?'));

await bot.launch();
```

Run it:

```bash
npx ts-node src/index.ts
```

## Project Structure

A production-shaped VibeGram project commonly starts like this:

```text
my-bot/
  src/
    index.ts
    handlers/
      commands.ts
      actions.ts
    middlewares/
      auth.ts
    scenes/
      checkout.ts
  .env
  package.json
  tsconfig.json
```

## Verify Installation

Send `/start` to your bot in Telegram. If the bot replies, package installation,
token loading, and polling are working.

## Next Steps

- [Bot Instance & Polling](/basics/instance) - configure launch options.
- [Middleware Pipeline](/core/middleware) - understand middleware order.
- [Sessions](/state/session) - store per-user or per-chat state.
