# Installation

## Requirements

- [Node.js](https://nodejs.org/) v14.0 or later
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
    "target": "ES2020",
    "module": "commonjs",
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
