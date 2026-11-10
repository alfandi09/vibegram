# Fetch API & Edge Runtime

`createFetchHandler()` mengembalikan webhook handler standar Web
`(request: Request) => Promise<Response>`. Handler ini hanya memakai primitif Fetch
API, sehingga kode bot yang sama berjalan di Cloudflare Workers, Deno, Bun,
Vercel / Netlify Edge, route handler Next.js, dan Node.js 18+.

```typescript
import { Bot, createFetchHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.on(':text', ctx => ctx.reply(`Kamu bilang: ${ctx.message.text}`));

const handleWebhook = createFetchHandler(bot, {
    secretToken: process.env.WEBHOOK_SECRET,
    healthPath: '/healthz',
});
```

## Opsi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `secretToken` | — | Nilai `X-Telegram-Bot-Api-Secret-Token` yang wajib cocok. Sangat disarankan di production. |
| `healthPath` | — | Path `GET` yang membalas `200 OK` tanpa memproses update. |
| `maxBodySizeBytes` | `1_000_000` | Body yang lebih besar dibalas `413 Payload Too Large` (dicek saat streaming). |
| `waitUntil` | — | Balas Telegram segera lalu selesaikan update di background, misalnya `ctx.waitUntil` milik Cloudflare. Error kemudian hanya sampai ke `bot.catch()` dan hook observability. |

Respons: `200` berhasil · `403` secret salah · `405` bukan `POST` · `415` bukan JSON ·
`400` JSON atau update tidak valid · `413` terlalu besar · `500` error handler (tanpa `waitUntil`).

## Cloudflare Workers

Secret hanya tersedia di dalam `fetch()`, jadi buat bot secara lazy lalu pakai ulang:

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
            bot.command('start', ctx => ctx.reply('Halo dari edge!'));
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
bot.command('start', ctx => ctx.reply('Halo dari Deno!'));

Deno.serve(createFetchHandler(bot, { secretToken: Deno.env.get('WEBHOOK_SECRET') }));
```

## Bun

```typescript
import { Bot, createFetchHandler } from 'vibegram';

const bot = new Bot(Bun.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Halo dari Bun!'));

Bun.serve({ port: 3000, fetch: createFetchHandler(bot, { secretToken: Bun.env.WEBHOOK_SECRET }) });
```

## Next.js (App Router) / Vercel

```typescript
// app/api/telegram/route.ts
import { Bot, createFetchHandler } from 'vibegram';

export const runtime = 'edge'; // atau 'nodejs'

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Halo dari Next.js!'));

export const POST = createFetchHandler(bot, { secretToken: process.env.WEBHOOK_SECRET });
```

## Mendaftarkan webhook

Handler serverless hanya menerima update; daftarkan URL-nya sekali, misalnya dari
script deploy:

```typescript
await bot.setWebhook('https://example.com/api/telegram', {
    secret_token: process.env.WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
});
```

## Dukungan runtime

Entry point utama `vibegram` **tidak memuat modul bawaan Node.js** dan tidak
membutuhkan global `Buffer`; sebuah test CI memastikan hal ini untuk setiap import
yang terjangkau dari `src/index.ts`.

| Fitur | Node.js 18+ | Bun / Deno | Edge (Workers, Vercel Edge) |
| --- | --- | --- | --- |
| Panggilan Bot API, middleware, session, `createFetchHandler` | ✅ | ✅ | ✅ |
| Upload dari `Buffer` / `Uint8Array` / `{ source, filename }` | ✅ | ✅ | ✅ (`Uint8Array`) |
| `WebAppUtils.validate()` | ✅ | ✅ | ✅ |
| Long polling (`bot.launch()`) | ✅ | ✅ | ❌ tidak ada proses yang berjalan lama |
| Server webhook bawaan (`launch({ webhook })`), `createNativeHandler` | ✅ | ✅ lewat Node compat | ❌ pakai `createFetchHandler` |
| `downloadFile(id, destPath)` ke disk | ✅ | ✅ lewat Node compat | ❌ pakai `downloadFile(id)` atau `getFileLink()` |
| `vibegram/codex` | ✅ | ⚠️ butuh API Node | ❌ |

::: info Status verifikasi
Node.js dicakup oleh seluruh test suite. Bun, Deno, dan edge runtime ditargetkan
secara desain dan diverifikasi lewat simulasi (pelacak import dan pelacak akses
Buffer pada build ESM), tetapi belum lewat eksekusi otomatis di runtime tersebut.
:::
