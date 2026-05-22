# WebApp Kit

`@vibegram/webapp-kit` membungkus workflow Telegram Mini App yang umum dipakai di bot VibeGram: validasi `initData`, parsing launch payload bertipe, parsing aman `web_app_data`, dan helper untuk mengirim tombol WebApp.

Gunakan plugin ini saat bot membuka Telegram Mini App atau menerima data dari `Telegram.WebApp.sendData()`.

## Mapping Resmi Telegram

Telegram mengirim data launch Mini App lewat `window.Telegram.WebApp.initData`. Server wajib memvalidasi raw query string ini sebelum dipakai. `initDataUnsafe` boleh membantu UI frontend, tapi jangan dipercaya di server.

Untuk Mini App dari keyboard button, `Telegram.WebApp.sendData()` mengirim service message dengan `message.web_app_data.data`. Telegram mendokumentasikan bahwa client buruk bisa mengirim data arbitrary di field ini, jadi plugin mem-parse sebagai JSON yang tidak tepercaya.

Referensi: [Telegram Mini Apps](https://core.telegram.org/bots/webapps), [WebAppInitData](https://core.telegram.org/bots/webapps#webappinitdata), [WebAppData](https://core.telegram.org/bots/api#webappdata), [WebAppInfo](https://core.telegram.org/bots/api#webappinfo), dan [answerWebAppQuery](https://core.telegram.org/bots/api#answerwebappquery).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/webapp-kit
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/webapp-kit": "file:../vibegram/plugins/webapp-kit"
  }
}
```

## Setup Bot

```typescript
import { Bot } from 'vibegram';
import { webAppKit } from '@vibegram/webapp-kit';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(webAppKit({
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    maxAgeSeconds: 3600,
}));

bot.command('app', ctx => {
    return ctx.webApp.replyWithInlineButton(
        'Buka Mini App',
        'Launch',
        'https://example.com/app'
    );
});

bot.on('message:web_app_data', async ctx => {
    const payload = ctx.webApp.parseData<{ action: 'save'; itemId: string }>();
    await ctx.reply(`Tersimpan ${payload.itemId}`);
});
```

`ctx.webApp` bersifat request-scoped dan dipulihkan setelah middleware chain selesai.

## Validasi initData

Kirim `Telegram.WebApp.initData` dari frontend ke backend. Validasi sebelum membuat session app.

```typescript
import { assertValidInitData } from '@vibegram/webapp-kit';

app.post('/api/webapp/session', express.json(), (req, res) => {
    const verified = assertValidInitData(req.body.initData, {
        botToken: process.env.TELEGRAM_BOT_TOKEN!,
        maxAgeSeconds: 3600,
    });

    res.json({
        userId: verified.data.user?.id,
        chatType: verified.data.chat_type,
        chatInstance: verified.data.chat_instance,
    });
});
```

Gunakan `validateInitData()` jika ingin result object, bukan exception:

```typescript
const result = validateInitData(initData, {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
});

if (!result.ok) {
    return res.status(401).json({ error: result.error.code });
}
```

Error dinormalisasi sebagai `WebAppKitError` dan tidak berisi bot token atau raw payload.

## Launch Payload

Telegram mengirim nilai direct-link dan main-app launch sebagai `start_param`. Pakai nilai ini sebagai metadata routing kecil, bukan sumber otorisasi.

```typescript
import { parseLaunchPayload } from '@vibegram/webapp-kit';

const launch = parseLaunchPayload<{ screen: string; id: string }>(
    verified.data.start_param,
    { format: 'base64json' }
);
```

Format yang didukung:

| Format | Arti |
| --- | --- |
| `raw` | Mengembalikan string `start_param` asli |
| `json` | Parse nilai sebagai JSON |
| `base64json` | Decode base64url lalu parse JSON |
| `urlsearchparams` | Parse `a=1&b=2` menjadi object |

Kamu juga bisa memakai `parser` custom.

## Integrasi Frontend

Masukkan script WebApp Telegram di entry HTML frontend:

```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### Vite

```typescript
const webApp = window.Telegram?.WebApp;
webApp?.ready();

await fetch('/api/webapp/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: webApp?.initData ?? '' }),
});
```

### React

```tsx
import { useEffect, useState } from 'react';

export function useTelegramInitData() {
    const [initData, setInitData] = useState('');

    useEffect(() => {
        const webApp = window.Telegram?.WebApp;
        webApp?.ready();
        setInitData(webApp?.initData ?? '');
    }, []);

    return initData;
}
```

### Vue

```typescript
import { ref, onMounted } from 'vue';

export function useTelegramInitData() {
    const initData = ref('');

    onMounted(() => {
        const webApp = window.Telegram?.WebApp;
        webApp?.ready();
        initData.value = webApp?.initData ?? '';
    });

    return { initData };
}
```

## Reply Helpers

Inline button:

```typescript
await ctx.webApp.replyWithInlineButton(
    'Buka checkout',
    'Checkout',
    'https://example.com/checkout'
);
```

Reply keyboard button:

```typescript
await ctx.webApp.replyWithKeyboardButton(
    'Buka settings',
    'Settings',
    'https://example.com/settings'
);
```

Build markup tanpa langsung membalas:

```typescript
const reply_markup = ctx.webApp.inlineKeyboard('Open', 'https://example.com/app');
```

Helper mewajibkan URL HTTPS karena Telegram `WebAppInfo` membutuhkan URL Mini App HTTPS.

## answerWebAppQuery

Mini App dari inline button bisa mengembalikan result dengan `answerWebAppQuery`.

```typescript
await ctx.webApp.answerQuery(verified.data.query_id!, {
    type: 'article',
    id: 'done',
    title: 'Done',
    input_message_content: {
        message_text: 'Order confirmed',
    },
});
```

Gunakan hanya saat `initData` tervalidasi berisi `query_id`.

## CSRF Dan Session Binding

`initData` membuktikan bahwa Telegram membuat data launch tersebut. Ini bukan pengganti session app milik server kamu.

Flow server yang direkomendasikan:

1. Frontend mengirim raw `initData` ke `/api/webapp/session`.
2. Server memvalidasi `initData` dengan `assertValidInitData()`.
3. Server membuat session sendiri yang diikat ke `verified.data.user.id`.
4. Server mengembalikan SameSite cookie atau CSRF token untuk mutasi berikutnya.
5. Setiap API route yang mengubah state memeriksa session dan CSRF token.

Untuk Mini App grup/shared, simpan juga `chat_instance` atau room ID dari `start_param` agar chat berbeda tidak sengaja berbagi state.

## Options

### `webAppKit(options)`

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `botToken` | `string` | required | Bot token untuk validasi HMAC Telegram |
| `maxAgeSeconds` | `number` | `86400` | Umur maksimal `auth_date` yang diterima |
| `futureSkewSeconds` | `number` | `30` | Toleransi clock skew untuk `auth_date` masa depan |
| `now` | `() => number` | Unix time saat ini | Clock untuk test |

### `parseWebAppData(data, options)`

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `maxBytes` | `number` | `4096` | Limit string Telegram `sendData()` |
| `validate` | type guard | none | Validasi runtime shape opsional |

## API TypeScript

Export utama: `webAppKit()`, `validateInitData()`, `assertValidInitData()`, `parseWebAppData()`, `parseLaunchPayload()`, `buildWebAppInlineKeyboard()`, `buildWebAppReplyKeyboard()`, `normalizeWebAppKitError()`, `WebAppKitError`, `WebAppFlavor`, `WebAppInitData`, dan type option/result terkait.

## Checklist Keamanan

- Simpan bot token hanya di server.
- Validasi raw `initData`; jangan percaya `initDataUnsafe`.
- Pakai `maxAgeSeconds` pendek untuk endpoint login/session exchange.
- Ikat session server ke Telegram `user.id` yang sudah tervalidasi.
- Tambahkan proteksi CSRF atau SameSite cookie untuk API route WebApp yang mengubah state.
- Validasi shape hasil parse `web_app_data.data`.
- Jangan log raw `initData`, bot token, atau payload user di production.

## Validasi

Plugin ini punya test untuk validasi HMAC, `auth_date` expired, parsing aman `web_app_data`, parsing typed launch payload, attachment helper, payload reply, dan error yang aman dari secret leakage.

```bash
npm run plugins:validate
npm run docs:build
```
