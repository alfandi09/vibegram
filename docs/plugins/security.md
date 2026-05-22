# Security

`@vibegram/security` provides practical guard middleware for production Telegram bots: user/chat allowlists, admin checks, spam burst protection, safe error replies, webhook secret verification, and reusable redaction helpers.

It is not a full authorization system. Treat it as a small set of boring, predictable building blocks you can place before expensive or sensitive handlers.

## Official Telegram Mapping

`requireAdmin()` uses Telegram `getChatMember` unless `@vibegram/chat-members` has already attached `ctx.chatMembers`. Admin status follows Telegram `ChatMember` statuses: `creator` and `administrator` pass.

`verifyWebhookSecret()` validates the `X-Telegram-Bot-Api-Secret-Token` header Telegram sends when `secret_token` is configured through `setWebhook`.

References: [getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMember](https://core.telegram.org/bots/api#chatmember), [setWebhook](https://core.telegram.org/bots/api#setwebhook), and [Update](https://core.telegram.org/bots/api#update).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/security
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/security": "file:../vibegram/plugins/security"
  }
}
```

## Private Bot

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

This blocks unlisted users before handlers run and catches downstream errors with a generic user-facing reply.

## Admin Commands

```typescript
import { requireAdmin } from '@vibegram/security';

bot.command('ban', requireAdmin({
    allowPrivate: false,
    onDenied: (ctx, reason) => ctx.reply(`Denied: ${reason}`),
}), async ctx => {
    await ctx.reply('Admin command accepted.');
});
```

For groups with repeated admin checks, install `@vibegram/chat-members` first:

```typescript
import { chatMembers } from '@vibegram/chat-members';
import { requireAdmin } from '@vibegram/security';

bot.use(chatMembers({ ttlMs: 60_000 }));
bot.command('mod', requireAdmin(), handler);
```

`requireAdmin()` will use the cached `ctx.chatMembers.get()` path when available.

## Webhook Hardening

Use VibeGram adapter `secretToken` options when possible. If you write custom HTTP glue, call `verifyWebhookSecret()`:

```typescript
import { verifyWebhookSecret } from '@vibegram/security';

if (!verifyWebhookSecret(req.headers, process.env.TELEGRAM_WEBHOOK_SECRET!)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
}
```

Use the same value in Telegram `setWebhook` as `secret_token`.

## Safe Error Replies

```typescript
import { safeErrors, redactError } from '@vibegram/security';

bot.use(safeErrors({
    reply: 'Something went wrong.',
    onError(_ctx, error) {
        console.error(redactError(error));
    },
}));
```

Set `rethrow: true` when your process-level supervisor must still receive the original error.

## Redaction

```typescript
import { redactValue } from '@vibegram/security';

const safeLog = redactValue({
    token: process.env.TELEGRAM_BOT_TOKEN,
    authorization: 'Bearer secret',
    update: ctx.update,
});
```

Default redacted keys include `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, and `prompt`.

## Options

### `security(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowUsers` | `number[]` | none | Only allow these Telegram user IDs |
| `allowChats` | `(number \| string)[]` | none | Only allow these chat IDs |
| `spam` | `boolean \| SpamGuardOptions` | disabled | Fixed-window burst protection |
| `safeErrors` | `boolean \| SafeErrorsOptions` | disabled | Catch errors and reply safely |
| `onDenied` | `(ctx, reason) => void` | none | Shared denied hook |

### `spamGuard(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | `number` | `5` | Allowed updates per window |
| `windowMs` | `number` | `10000` | Window length |
| `keyGenerator` | `(ctx) => string \| undefined` | user ID then chat ID | Bucket key |
| `onDenied` | `(ctx, reason) => void` | none | Called with `spam_burst` |

## TypeScript API

Exports include `security()`, `allowUsers()`, `allowChats()`, `requireAdmin()`, `spamGuard()`, `safeErrors()`, `verifyWebhookSecret()`, `redactValue()`, `redactError()`, `isAdministrator()`, `SecurityFlavor`, and `SecurityGuardReason`.

## Failure Modes

- `requireAdmin()` fails closed with `api_error` if Telegram member lookup fails.
- `allowUsers()` denies updates missing `ctx.from`.
- `allowChats()` denies updates missing `ctx.chat`.
- In-memory `spamGuard()` is process-local; use a shared rate-limit store for multi-instance deployments.
- `safeErrors()` hides details from users by default; log with `onError`.

## Security Notes

Use HTTPS and webhook `secret_token` for webhook deployments. Keep bot tokens and secret tokens in environment variables or a secret manager. Redaction helps protect logs, but do not log raw production updates without a clear retention policy.

## Validation

The plugin is covered by tests for allowlists, admin checks, chat-members composition, webhook secret verification, spam burst blocking, safe error replies, and redaction.

```bash
npm run plugins:validate
npm run docs:build
```
