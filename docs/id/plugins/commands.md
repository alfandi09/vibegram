# Commands

`@vibegram/commands` menyediakan registry command terpusat, sync menu command Telegram, command per-scope, deskripsi per bahasa, dan output `/help` otomatis.

## Aturan Resmi Telegram

Plugin ini langsung memetakan fitur ke method Telegram Bot API:

| Fitur plugin | Method Bot API |
| --- | --- |
| Sync menu command | `setMyCommands` |
| Baca menu command | `getMyCommands` lewat core VibeGram |
| Hapus menu command | `deleteMyCommands` lewat core VibeGram |

Constraint command Telegram tetap berlaku:

- Command harus 1-32 karakter.
- Command hanya boleh berisi huruf kecil Inggris, angka, dan underscore.
- Description harus 1-256 karakter.
- Telegram menerima maksimal 100 command untuk satu scope/language set.
- `scope` memakai Telegram `BotCommandScope`.
- `language_code` adalah kode bahasa ISO 639-1 dua huruf.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/commands
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/commands": "file:../vibegram/plugins/commands"
  }
}
```

## Penggunaan Minimal

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

## Sync Saat Launch

`bot.use()` hanya memasang middleware. Jika ingin `syncOnLaunch`, install command kit sebagai plugin VibeGram:

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

Ini hanya mem-patch instance bot saat ini dan memanggil Telegram `setMyCommands` sebelum launch masuk polling atau webhook mode.

Untuk kontrol manual:

```typescript
await commandKit.sync(bot.client);
```

## `/help` Otomatis

Plugin menambahkan handler `/help` otomatis secara default:

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

Sembunyikan command dari help tanpa menyembunyikannya dari sync Telegram:

```typescript
{ command: 'admin', description: 'Admin tools', hidden: true }
```

Matikan generated help:

```typescript
commands({
    includeHelpCommand: false,
    commands: [{ command: 'start', description: 'Start the bot' }],
});
```

## Scope

Gunakan Telegram `BotCommandScope` untuk menu command per-scope:

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

Plugin melakukan sync setiap scope sebagai panggilan `setMyCommands` terpisah.

## Command Per Bahasa

Tambahkan deskripsi lokal dengan `descriptions`:

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

Command set default memakai `description`. Setiap language set memakai deskripsi lokal dan fallback ke default jika command belum punya terjemahan.

## Registry di Context

Middleware menyediakan registry selama downstream middleware:

```typescript
bot.use(commandKit);

bot.use(async (ctx, next) => {
    const help = ctx.commands.helpText({ languageCode: ctx.from?.language_code });
    await next();
});
```

Gunakan `CommandsFlavor` agar `ctx.commands` terbaca oleh TypeScript.

## Validasi

Package ini punya test untuk registration, launch sync, scope, deskripsi lokal, duplicate validation, generated help, dan TypeScript context augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
