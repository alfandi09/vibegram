# Router

`@vibegram/router` mengarahkan update ke middleware tree bernama. Plugin ini berguna saat bot mulai besar dan kamu ingin memisahkan flow berdasarkan session state, tipe chat, tipe update, atau key aplikasi lain.

## Mapping Resmi Telegram

Plugin ini tidak memanggil Telegram API. Router hanya membaca data update Telegram yang sudah diterima bot:

- Root field `update` seperti `message`, `edited_message`, `channel_post`, `callback_query`, atau `inline_query`.
- Nilai `chat.type` dari Telegram `Chat`: `private`, `group`, `supergroup`, atau `channel`.

Router mengikuti bentuk update Telegram, tetapi routing tetap behavior middleware lokal. Plugin ini tidak mengubah `allowed_updates`, konfigurasi webhook, atau polling.

Referensi: [Telegram Bot API Update](https://core.telegram.org/bots/api#update) dan [Telegram Bot API Chat](https://core.telegram.org/bots/api#chat).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/router
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/router": "file:../vibegram/plugins/router"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot } from 'vibegram';
import { router } from '@vibegram/router';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token);

bot.use(router(ctx => ctx.session?.flow ?? 'main', {
    main: async (ctx, next) => {
        await ctx.reply('Flow utama');
        await next();
    },
    checkout: async ctx => {
        await ctx.reply('Flow checkout');
    },
    fallback: async (ctx, next) => {
        await ctx.reply('Flow tidak dikenal');
        await next();
    },
}));

await bot.launch();
```

## Routing Berdasarkan Session

Gunakan `sessionRouter()` saat route key berada di `ctx.session`:

```typescript
import { session, Composer } from 'vibegram';
import { sessionRouter } from '@vibegram/router';

const main = new Composer();
const checkout = new Composer();
const support = new Composer();

bot.use(session({ initial: () => ({ flow: 'main' }) }));

bot.use(sessionRouter('flow', {
    main,
    checkout,
    support,
    fallback: ctx => ctx.reply('Flow tidak dikenal'),
}));
```

Route bisa berupa middleware function atau object seperti composer dengan `middleware()`.

## Routing Berdasarkan Tipe Chat

Gunakan `chatTypeRouter()` untuk struktur khusus private/group/channel:

```typescript
import { chatTypeRouter } from '@vibegram/router';

bot.use(chatTypeRouter({
    private: privateComposer,
    group: groupComposer,
    supergroup: groupComposer,
    channel: channelComposer,
    fallback: ctx => ctx.reply('Chat tidak didukung'),
}));
```

Tipe chat Telegram adalah `private`, `group`, `supergroup`, dan `channel`.

## Routing Berdasarkan Tipe Update

Gunakan `updateTypeRouter()` untuk routing berdasarkan root field update:

```typescript
import { updateTypeRouter } from '@vibegram/router';

bot.use(updateTypeRouter({
    message: messageComposer,
    callback_query: callbackComposer,
    inline_query: inlineComposer,
    fallback: async (_ctx, next) => next(),
}));
```

`getUpdateType(update)` mengembalikan root key pertama selain `update_id`.

## Async Resolver

Resolver bisa async, berguna untuk mengambil state routing kecil dari custom store:

```typescript
bot.use(router(async ctx => {
    const state = await flowStore.get(String(ctx.from?.id));
    return state?.flow ?? 'main';
}, {
    main,
    checkout,
    fallback: ctx => ctx.reply('Flow tidak dikenal'),
}));
```

Jaga resolver tetap cepat. Lookup berat sebaiknya di-cache atau dipindahkan ke middleware khusus sebelum router.

## Urutan Middleware

Route handler menerima `next()` yang sama seperti middleware VibeGram biasa:

```typescript
bot.use(router(() => 'main', {
    main: async (ctx, next) => {
        await ctx.reply('Sebelum downstream');
        await next();
        await ctx.reply('Sesudah downstream');
    },
}));
```

Jika route tidak memanggil `next()`, downstream middleware tidak berjalan.

## TypeScript

Gunakan literal route key untuk type checking:

```typescript
type Flow = 'main' | 'checkout' | 'support';

bot.use(router<Context, Flow>(ctx => ctx.session.flow, {
    main,
    checkout,
    support,
}));
```

## Validasi

Package ini punya test untuk custom route key, session routing, chat/update routing, fallback routing, urutan middleware, async resolver, handler seperti composer, deteksi update type, dan typed route key.

```bash
npm run plugins:validate
npm run docs:build
```
