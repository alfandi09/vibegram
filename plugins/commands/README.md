# @vibegram/commands

Command registry, Telegram command menu sync, and generated `/help` output for VibeGram bots.

## Install

```bash
npm install vibegram @vibegram/commands
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/commands": "file:../vibegram/plugins/commands"
  }
}
```

## Usage

```typescript
import { Bot, type Context } from 'vibegram';
import { commands, type CommandsFlavor } from '@vibegram/commands';

type MyContext = CommandsFlavor<Context>;

const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN!);

const commandKit = commands({
    syncOnLaunch: true,
    commands: [
        { command: 'start', description: 'Start the bot' },
        { command: 'profile', description: 'Show your profile' },
    ],
});

bot.plugin(commandKit);

bot.command('start', ctx => ctx.reply('Welcome'));
bot.command('profile', ctx => ctx.reply('Profile'));
```

Use `bot.plugin(commandKit)` when `syncOnLaunch` is enabled. Use `bot.use(commandKit)` when you only want the middleware registry and generated `/help`.

## Exports

| Export | Purpose |
| --- | --- |
| `commands(options)` | Middleware/plugin with registry, `/help`, and optional launch sync |
| `commandRegistry(options)` | Standalone command registry for manual sync/help generation |
| `CommandRegistryError` | Validation error for duplicate or invalid commands |
| `CommandsFlavor<C>` | Optional TypeScript flavor for `ctx.commands` |

## Validation

```bash
npm run typecheck
npm test
npm run build
```
