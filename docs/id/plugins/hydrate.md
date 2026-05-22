# Hydrate

`@vibegram/hydrate` menambahkan helper method langsung ke object Telegram yang sudah memiliki ID yang tepat. Daripada mengisi `chat_id`, `message_id`, atau `callback_query_id` secara manual berulang kali, kamu bisa memanggil method pada message, callback query, chat, user, dan message result dari API call.

## Mapping Resmi Telegram

Hydrate adalah lapisan developer-experience tipis di atas method resmi Telegram Bot API:

| Helper | Method Bot API |
| --- | --- |
| `message.reply(text, extra?)` | `sendMessage` |
| `message.editText(text, extra?)` | `editMessageText` |
| `message.delete()` | `deleteMessage` |
| `message.pin(options?)` | `pinChatMessage` |
| `message.unpin(extra?)` | `unpinChatMessage` |
| `callbackQuery.answer(text?, showAlert?, extra?)` | `answerCallbackQuery` |
| `callbackQuery.editMessageText(text, extra?)` | `editMessageText` |
| `chat.sendMessage(text, extra?)` | `sendMessage` |
| `chat.get()` | `getChat` |
| `user.getProfilePhotos(extra?)` | `getUserProfilePhotos` |

Aturan normal Telegram tetap berlaku. Contohnya, penghapusan message memiliki limit waktu dan permission dari Telegram, pin message memerlukan admin right yang sesuai di group/channel, dan callback query sebaiknya dijawab agar loading indicator di client Telegram berhenti.

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/hydrate
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/hydrate": "file:../vibegram/plugins/hydrate"
  }
}
```

## Penggunaan Minimal

```typescript
import { Bot, type Context } from 'vibegram';
import { hydrate, type HydrateFlavor } from '@vibegram/hydrate';

type MyContext = HydrateFlavor<Context>;

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot<MyContext>(token);

bot.use(hydrate());

bot.on('message:text', async ctx => {
    const status = await ctx.reply('Memproses...');
    await status.editText('Selesai');
    await status.delete();
});

await bot.launch();
```

## Sebelum dan Sesudah

Tanpa hydrate:

```typescript
bot.on('message:text', async ctx => {
    const status = await ctx.reply('Memproses...');

    await ctx.client.callApi('editMessageText', {
        chat_id: ctx.chat?.id,
        message_id: status.message_id,
        text: 'Selesai',
    });

    await ctx.client.callApi('deleteMessage', {
        chat_id: status.chat.id,
        message_id: status.message_id,
    });
});
```

Dengan hydrate:

```typescript
bot.on('message:text', async ctx => {
    const status = await ctx.reply('Memproses...');

    await status.editText('Selesai');
    await status.delete();
});
```

## Incoming Message

Incoming message di-hydrate selama update saat ini:

```typescript
bot.on('message:text', async ctx => {
    await ctx.message?.reply('Diterima');
    await ctx.message?.pin(true);
});
```

`message.reply()` mengirim message ke chat yang sama dan mempertahankan `business_connection_id` serta `message_thread_id` jika tersedia. Method ini tidak otomatis quote message. Gunakan `reply_parameters` Telegram jika ingin quoted reply:

```typescript
await ctx.message?.reply('Quoted', {
    reply_parameters: { message_id: ctx.message.message_id },
});
```

## Callback Query

Callback query mendapat helper untuk flow tombol yang umum:

```typescript
bot.action('save', async ctx => {
    const query = ctx.update.callback_query;
    if (!query) return;

    await query.answer('Tersimpan');
    await query.editMessageText('Berhasil disimpan');
});
```

Jika `inline_message_id` tersedia, `editMessageText()` akan memakainya. Jika tidak, method ini memakai `chat.id` dan `message_id` dari message callback query.

## Helper Chat dan User

Hydrate juga menambahkan helper kecil yang aman ke nested object:

```typescript
await ctx.message?.chat.sendMessage('Halo dari chat ini');
const chat = await ctx.message?.chat.get();
const photos = await ctx.from?.getProfilePhotos({ limit: 3 });
```

## Hydration Hasil API

Secara default, object mirip message yang dikembalikan dari `ctx.client.callApi()` saat middleware aktif akan di-hydrate:

```typescript
bot.on('message:text', async ctx => {
    const sent = await ctx.client.callApi('sendMessage', {
        chat_id: ctx.chat?.id,
        text: 'Working...',
    });

    await sent.editText('Selesai');
});
```

Jika tidak ingin hydration untuk hasil API, matikan:

```typescript
bot.use(hydrate({ hydrateApiResults: false }));
```

## Serialization

Helper dibuat non-enumerable:

```typescript
Object.keys(ctx.message ?? {}); // tidak ada nama helper
JSON.stringify(ctx.message); // tidak ada nama helper
```

Plugin hanya memutasi object pada update saat ini dan object hasil API. Plugin ini tidak melakukan patch ke prototype global.

## TypeScript

Gunakan `HydrateFlavor` agar helper terbaca oleh TypeScript:

```typescript
import type { Context } from 'vibegram';
import type { HydrateFlavor } from '@vibegram/hydrate';

type MyContext = HydrateFlavor<Context>;
```

## Validasi

Package ini punya test untuk hydration hasil API, helper incoming message, helper callback query, wrapper chat/user, mapping ID yang benar, serialization, dan type augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
