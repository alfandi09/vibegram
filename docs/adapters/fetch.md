# Fetch API & Edge Runtimes

`createFetchHandler()` returns a Web-standard `(request: Request) => Promise<Response>`
webhook handler. It uses only Fetch API primitives, so the same bot code runs on
Cloudflare Workers, Deno, Bun, Vercel / Netlify Edge, Next.js route handlers, and
Node.js 20+.

```typescript
import { Bot, createFetchHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.on(':text', ctx => ctx.reply(`You said: ${ctx.message.text}`));

const handleWebhook = createFetchHandler(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `secretToken` | — | Required `X-Telegram-Bot-Api-Secret-Token` value. Strongly recommended in production. |
| `healthPath` | — | `GET` path that returns `200 OK` without processing updates. |
| `maxBodySizeBytes` | `1_000_000` | Larger bodies get `413 Payload Too Large` (checked while streaming). |
| `waitUntil` | — | Acknowledge Telegram immediately and finish the update in the background, e.g. Cloudflare's `ctx.waitUntil`. Errors then only reach `bot.catch()` and observability hooks. |

Responses: `200` handled · `403` wrong secret · `405` not `POST` · `415` not JSON ·
`400` invalid JSON or update · `413` too large · `500` handler error (without `waitUntil`).

## Cloudflare Workers

Secrets are only available inside `fetch()`, so create the bot lazily and reuse it:

```typescript
import { Bot, createFetchHandler } from 'vibegram';

interface Env {
    BOT_TOKEN: string;
    WEBHOOK_SECRET: string;
}

let handler: ((request: Request) => Promise<Response>) | undefined;

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        handler ??= (() => {
            const bot = new Bot(env.BOT_TOKEN);
            bot.command('start', ctx => ctx.reply('Hello from the edge!'));
            return createFetchHandler(bot, {
                secretToken: env.WEBHOOK_SECRET,
                waitUntil: promise => ctx.waitUntil(promise),
            });
        })();
        return handler(request);
    },
};
```

## Deno

```typescript
import { Bot, createFetchHandler } from 'npm:vibegram';

const bot = new Bot(Deno.env.get('BOT_TOKEN')!);
bot.command('start', ctx => ctx.reply('Hello from Deno!'));

Deno.serve(createFetchHandler(bot, { secretToken: Deno.env.get('WEBHOOK_SECRET') }));
```

## Bun

```typescript
import { Bot, createFetchHandler } from 'vibegram';

const bot = new Bot(Bun.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Hello from Bun!'));

Bun.serve({ port: 3000, fetch: createFetchHandler(bot, { secretToken: Bun.env.WEBHOOK_SECRET }) });
```

## Next.js (App Router) / Vercel

```typescript
// app/api/telegram/route.ts
import { Bot, createFetchHandler } from 'vibegram';

export const runtime = 'edge'; // or 'nodejs'

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Hello from Next.js!'));

export const POST = createFetchHandler(bot, { secretToken: process.env.WEBHOOK_SECRET });
```

## Registering the webhook

Serverless handlers only receive updates; register the URL once, for example from a
deploy script:

```typescript
await bot.setWebhook('https://example.com/api/telegram', {
    secret_token: process.env.WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
});
```

## Runtime support

The main `vibegram` entry point loads **no Node.js built-in modules** and does not
require the `Buffer` global; a CI test enforces this for every import reachable from
`src/index.ts`.

| Feature | Node.js 20+ | Bun / Deno | Edge (Workers, Vercel Edge) |
| --- | --- | --- | --- |
| Bot API calls, middleware, sessions, `createFetchHandler` | ✅ | ✅ | ✅ |
| Uploads from `Buffer` / `Uint8Array` / `{ source, filename }` | ✅ | ✅ | ✅ (`Uint8Array`) |
| `WebAppUtils.validate()` | ✅ | ✅ | ✅ |
| Long polling (`bot.launch()`) | ✅ | ✅ | ❌ no long-running process |
| Built-in webhook server (`launch({ webhook })`), `createNativeHandler` | ✅ | ✅ via Node compat | ❌ use `createFetchHandler` |
| `downloadFile(id, destPath)` to disk | ✅ | ✅ via Node compat | ❌ use `downloadFile(id)` or `getFileLink()` |
| `@vibegram/codex` | ✅ | ⚠️ needs Node APIs | ❌ |

::: info Verification status
Node.js is covered by the full test suite. Bun, Deno, and edge runtimes are targeted by
design and verified by simulation (an import tracer and Buffer-access tracer over the
ESM build), but not yet by an automated run on those runtimes.
:::
