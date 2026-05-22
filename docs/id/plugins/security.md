# Security

`@vibegram/security` menyediakan middleware guard praktis untuk bot Telegram production: allowlist user/chat, admin check, proteksi spam burst, safe error reply, verifikasi webhook secret, dan helper redaction reusable.

Ini bukan sistem authorization penuh. Anggap sebagai building block kecil dan mudah diprediksi yang diletakkan sebelum handler mahal atau sensitif.

## Mapping Resmi Telegram

`requireAdmin()` memakai Telegram `getChatMember` kecuali `@vibegram/chat-members` sudah memasang `ctx.chatMembers`. Status admin mengikuti `ChatMember` Telegram: `creator` dan `administrator` lolos.

`verifyWebhookSecret()` memvalidasi header `X-Telegram-Bot-Api-Secret-Token` yang dikirim Telegram saat `secret_token` dikonfigurasi melalui `setWebhook`.

Referensi: [getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMember](https://core.telegram.org/bots/api#chatmember), [setWebhook](https://core.telegram.org/bots/api#setwebhook), dan [Update](https://core.telegram.org/bots/api#update).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/security
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/security": "file:../vibegram/plugins/security"
  }
}
```

## Bot Private

```typescript
import { Bot } from 'vibegram';
import { security } from '@vibegram/security';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(security({
    allowUsers: [123456789],
    safeErrors: true,
    spam: {
        limit: 8,
        windowMs: 10_000,
    },
}));

bot.on('message:text', ctx => ctx.reply('Allowed.'));
```

User yang tidak masuk daftar akan diblok sebelum handler berjalan, dan error downstream dibalas dengan pesan generik.

## Command Admin

```typescript
import { requireAdmin } from '@vibegram/security';

bot.command('ban', requireAdmin({
    allowPrivate: false,
    onDenied: (ctx, reason) => ctx.reply(`Denied: ${reason}`),
}), async ctx => {
    await ctx.reply('Admin command accepted.');
});
```

Untuk grup dengan admin check berulang, pasang `@vibegram/chat-members` terlebih dahulu:

```typescript
import { chatMembers } from '@vibegram/chat-members';
import { requireAdmin } from '@vibegram/security';

bot.use(chatMembers({ ttlMs: 60_000 }));
bot.command('mod', requireAdmin(), handler);
```

`requireAdmin()` akan memakai cache `ctx.chatMembers.get()` saat tersedia.

## Hardening Webhook

Gunakan opsi `secretToken` adapter VibeGram jika memungkinkan. Jika kamu menulis glue HTTP custom, panggil `verifyWebhookSecret()`:

```typescript
import { verifyWebhookSecret } from '@vibegram/security';

if (!verifyWebhookSecret(req.headers, process.env.TELEGRAM_WEBHOOK_SECRET!)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
}
```

Gunakan value yang sama di Telegram `setWebhook` sebagai `secret_token`.

## Safe Error Reply

```typescript
import { safeErrors, redactError } from '@vibegram/security';

bot.use(safeErrors({
    reply: 'Something went wrong.',
    onError(_ctx, error) {
        console.error(redactError(error));
    },
}));
```

Set `rethrow: true` jika process-level supervisor masih perlu menerima error asli.

## Redaction

```typescript
import { redactValue } from '@vibegram/security';

const safeLog = redactValue({
    token: process.env.TELEGRAM_BOT_TOKEN,
    authorization: 'Bearer secret',
    update: ctx.update,
});
```

Key default yang di-redact mencakup `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, dan `prompt`.

## Options

### `security(options)`

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `allowUsers` | `number[]` | none | Hanya izinkan user ID Telegram ini |
| `allowChats` | `(number \| string)[]` | none | Hanya izinkan chat ID ini |
| `spam` | `boolean \| SpamGuardOptions` | disabled | Proteksi burst fixed-window |
| `safeErrors` | `boolean \| SafeErrorsOptions` | disabled | Catch error dan reply aman |
| `onDenied` | `(ctx, reason) => void` | none | Hook denied bersama |

### `spamGuard(options)`

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `limit` | `number` | `5` | Update yang diizinkan per window |
| `windowMs` | `number` | `10000` | Durasi window |
| `keyGenerator` | `(ctx) => string \| undefined` | user ID lalu chat ID | Key bucket |
| `onDenied` | `(ctx, reason) => void` | none | Dipanggil dengan `spam_burst` |

## API TypeScript

Export utama: `security()`, `allowUsers()`, `allowChats()`, `requireAdmin()`, `spamGuard()`, `safeErrors()`, `verifyWebhookSecret()`, `redactValue()`, `redactError()`, `isAdministrator()`, `SecurityFlavor`, dan `SecurityGuardReason`.

## Failure Mode

- `requireAdmin()` fail closed dengan `api_error` jika lookup member Telegram gagal.
- `allowUsers()` menolak update tanpa `ctx.from`.
- `allowChats()` menolak update tanpa `ctx.chat`.
- `spamGuard()` in-memory bersifat process-local; gunakan store rate-limit shared untuk multi-instance deployment.
- `safeErrors()` menyembunyikan detail dari user secara default; log dengan `onError`.

## Catatan Keamanan

Gunakan HTTPS dan webhook `secret_token` untuk deployment webhook. Simpan bot token dan secret token di environment variable atau secret manager. Redaction membantu melindungi log, tetapi jangan log raw production updates tanpa retention policy yang jelas.

## Validasi

Plugin ini punya test untuk allowlist, admin check, komposisi chat-members, verifikasi webhook secret, blocking spam burst, safe error reply, dan redaction.

```bash
npm run plugins:validate
npm run docs:build
```
