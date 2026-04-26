# Installation

<PackageStats />

<InstallTabs />

<CompatibilityTable />

<SecurityNote title="Keep secrets outside the repository" variant="warning">
Install the package in your application project, then read bot tokens from environment
variables. Never commit `.env` files or real Telegram tokens.
</SecurityNote>

## Requirements

- [Node.js](https://nodejs.org/) v18.0 or later
- npm or yarn package manager

## Install

```bash
npm install vibegram
```

## TypeScript Setup

VibeGram is written in TypeScript and ships with built-in type declarations. No additional `@types` packages are required.

```json
// tsconfig.json (recommended settings)
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "CommonJS",
        "strict": true,
        "esModuleInterop": true
    }
}
```

## Project Structure

A typical VibeGram project:

```
my-bot/
├── src/
│   ├── index.ts        # Bot entry point
│   ├── commands/        # Command handlers
│   └── scenes/          # Scene definitions
├── package.json
└── tsconfig.json
```

## Verify Installation

```typescript
import { Bot } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.command('ping', ctx => ctx.reply('pong'));

bot.launch().then(() => console.log('Bot is running'));
```

Run with:

```bash
npx ts-node src/index.ts
```
