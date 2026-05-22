# Commands

`@vibegram/commands` gives bots a central command registry, Telegram command-menu sync, scoped command sets, language-specific descriptions, and generated `/help` output.

## Official Telegram Rules

This plugin maps directly to Telegram Bot API command methods:

| Plugin feature | Bot API method |
| --- | --- |
| Sync command menu | `setMyCommands` |
| Read command menu | `getMyCommands` through VibeGram core |
| Remove command menu | `deleteMyCommands` through VibeGram core |

Telegram command constraints still apply:

- A command must be 1-32 characters.
- A command can contain only lowercase English letters, digits, and underscores.
- A description must be 1-256 characters.
- Telegram accepts at most 100 commands for one scope/language set.
- `scope` uses Telegram `BotCommandScope`.
- `language_code` is a two-letter ISO 639-1 language code.

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/commands
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/commands": "file:../vibegram/plugins/commands"
  }
}
```

## Minimal Usage

```typescript
import { Bot, type Context } from 'vibegram';
import { commands, type CommandsFlavor } from '@vibegram/commands';

type MyContext = CommandsFlavor<Context>;

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot<MyContext>(token);

const commandKit = commands({
    commands: [
        { command: 'start', description: 'Start the bot' },
        { command: 'profile', description: 'Show your profile' },
    ],
});

bot.use(commandKit);

bot.command('start', ctx => ctx.reply('Welcome'));
bot.command('profile', ctx => ctx.reply('Profile'));

await bot.launch();
```

## Sync on Launch

`bot.use()` only mounts middleware. If you want `syncOnLaunch`, install the command kit as a VibeGram plugin:

```typescript
const commandKit = commands({
    syncOnLaunch: true,
    commands: [
        { command: 'start', description: 'Start the bot' },
        { command: 'profile', description: 'Show your profile' },
    ],
});

bot.plugin(commandKit);

await bot.launch();
```

This patches only the current bot instance and calls Telegram `setMyCommands` before launch starts polling or webhook mode.

For fully manual control:

```typescript
await commandKit.sync(bot.client);
```

## Generated `/help`

The plugin adds a generated `/help` handler by default:

```typescript
const commandKit = commands({
    commands: [
        {
            command: 'profile',
            description: 'Show your profile',
            help: 'Open your profile and usage summary',
        },
    ],
});
```

Output:

```text
Available commands
/profile - Open your profile and usage summary
/help - Show available commands
```

Hide commands from help without hiding them from Telegram sync:

```typescript
{ command: 'admin', description: 'Admin tools', hidden: true }
```

Disable generated help:

```typescript
commands({
    includeHelpCommand: false,
    commands: [{ command: 'start', description: 'Start the bot' }],
});
```

## Scopes

Use Telegram `BotCommandScope` for scoped command menus:

```typescript
const commandKit = commands({
    syncOnLaunch: true,
    commands: [
        { command: 'start', description: 'Start the bot' },
        {
            command: 'ban',
            description: 'Ban a user',
            scope: { type: 'all_chat_administrators' },
            hidden: true,
        },
    ],
});
```

The plugin syncs each scope as a separate `setMyCommands` call.

## Language-Specific Commands

Add localized command descriptions with `descriptions`:

```typescript
const commandKit = commands({
    syncOnLaunch: true,
    commands: [
        {
            command: 'start',
            description: 'Start the bot',
            descriptions: {
                id: 'Mulai bot',
            },
            help: 'Open the main menu',
            helpDescriptions: {
                id: 'Buka menu utama',
            },
        },
    ],
});
```

The default command set uses `description`. Each language set uses the localized description and falls back to the default when a command has no translation.

## Context Registry

The middleware exposes the registry during downstream middleware:

```typescript
bot.use(commandKit);

bot.use(async (ctx, next) => {
    const help = ctx.commands.helpText({ languageCode: ctx.from?.language_code });
    await next();
});
```

Use `CommandsFlavor` for typed `ctx.commands` access.

## Validation

The package includes tests for registration, launch sync, scopes, localized descriptions, duplicate validation, generated help, and TypeScript context augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
