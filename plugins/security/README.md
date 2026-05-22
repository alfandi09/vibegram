# @vibegram/security

Practical security middleware for VibeGram bots: user/chat allowlists, admin guards, spam burst protection, safe error replies, Telegram webhook secret verification, and reusable redaction helpers.

This package is intentionally small and dependency-free. It does not replace application authorization, but it gives production bots safer defaults for common Telegram risks.

## Official Telegram Mapping

`requireAdmin()` checks Telegram chat membership through the official `getChatMember` method unless a `ctx.chatMembers` manager is already installed by `@vibegram/chat-members`.

`verifyWebhookSecret()` validates Telegram's official `X-Telegram-Bot-Api-Secret-Token` header, which Telegram sends when `secret_token` is configured via `setWebhook`.

References:

- [getChatMember](https://core.telegram.org/bots/api#getchatmember)
- [ChatMember](https://core.telegram.org/bots/api#chatmember)
- [setWebhook](https://core.telegram.org/bots/api#setwebhook)
- [Update](https://core.telegram.org/bots/api#update)

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

## Private Bot Allowlist

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

Denied updates are stopped before downstream handlers run.

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

For better performance in groups, install `@vibegram/chat-members` before `requireAdmin()`. The guard will use `ctx.chatMembers.get(chatId, userId)` when available and fall back to `ctx.client.callApi('getChatMember', ...)` otherwise.

## Webhook Secret Verification

Most VibeGram adapters can validate webhook secrets for you. Use `verifyWebhookSecret()` when writing custom server glue:

```typescript
import { verifyWebhookSecret } from '@vibegram/security';

if (!verifyWebhookSecret(req.headers, process.env.TELEGRAM_WEBHOOK_SECRET!)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
}
```

Configure the same value in Telegram `setWebhook` as `secret_token`.

## Safe Errors

```typescript
import { safeErrors, redactError } from '@vibegram/security';

bot.use(safeErrors({
    reply: 'Something went wrong.',
    onError(ctx, error) {
        console.error('[bot:error]', redactError(error));
    },
}));
```

`safeErrors()` catches downstream errors, optionally sends a generic reply, and does not expose stack traces to Telegram users. Set `rethrow: true` if your process-level error handler must still see the original exception.

## Redaction

```typescript
import { redactValue } from '@vibegram/security';

console.log(redactValue({
    token: process.env.TELEGRAM_BOT_TOKEN,
    authorization: 'Bearer secret',
    payload: { ok: true },
}));
```

Default redacted keys include `token`, `bot_token`, `access_token`, `authorization`, `secret_token`, `cookie`, `password`, `api_key`, `secret`, and `prompt`.

## Options

### `security(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowUsers` | `number[]` | none | Only allow these Telegram user IDs |
| `allowChats` | `(number \| string)[]` | none | Only allow these Telegram chat IDs |
| `spam` | `boolean \| SpamGuardOptions` | disabled | Enable fixed-window burst protection |
| `safeErrors` | `boolean \| SafeErrorsOptions` | disabled | Catch downstream errors and reply safely |
| `onDenied` | `(ctx, reason) => void` | none | Shared denied hook for composed guards |

### `spamGuard(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | `number` | `5` | Allowed updates per window |
| `windowMs` | `number` | `10000` | Window length |
| `keyGenerator` | `(ctx) => string \| undefined` | user ID then chat ID | Bucket key |
| `onDenied` | `(ctx, reason) => void` | none | Called with `spam_burst` |

### `safeErrors(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `reply` | `string \| false \| function` | `'Something went wrong.'` | Safe reply text |
| `onError` | `(ctx, error) => void` | none | Server-side error hook |
| `rethrow` | `boolean` | `false` | Rethrow after safe handling |

## TypeScript API

Main exports:

- `security()`
- `allowUsers()`
- `allowChats()`
- `requireAdmin()`
- `spamGuard()`
- `safeErrors()`
- `verifyWebhookSecret()`
- `redactValue()`
- `redactError()`
- `isAdministrator()`
- `SecurityFlavor`
- `SecurityGuardReason`

## Failure Modes

- `requireAdmin()` fails closed when `getChatMember` errors and emits `api_error`.
- `allowUsers()` denies updates without `ctx.from`.
- `allowChats()` denies updates without `ctx.chat`.
- In-memory `spamGuard()` state is process-local; use an external rate-limit store for multi-instance deployments.
- `safeErrors()` hides errors from users by default; use `onError` for server logs and `rethrow` for process-level supervision.

## Security Notes

- Allowlist IDs must be treated as configuration. Do not hardcode production-only secrets or token values.
- Use Telegram webhook `secret_token` plus HTTPS for webhook deployments.
- Admin checks depend on Telegram `getChatMember`; for some groups, the bot may need administrator permissions to inspect members reliably.
- Redaction is a safety net, not a privacy policy. Avoid logging raw updates unless you have retention and data-handling rules.

## Validation

The package includes tests for allowlists, admin guard behavior, `@vibegram/chat-members` composition, webhook secret checks, spam burst blocking, safe error replies, and redaction.

```bash
npm run plugins:validate
npm run docs:build
```
