# WebApp Kit

`@vibegram/webapp-kit` packages the common Telegram Mini App workflow for VibeGram bots: validating `initData`, parsing typed launch payloads, safely reading `web_app_data`, and sending WebApp buttons from bot handlers.

Use it when your bot opens a Telegram Mini App or receives data from `Telegram.WebApp.sendData()`.

## Official Telegram Mapping

Telegram sends Mini App launch data through `window.Telegram.WebApp.initData`. The server must validate this raw query string before using it. `initDataUnsafe` is convenient on the frontend, but Telegram explicitly warns that it must not be trusted on the server.

For keyboard-button Mini Apps, `Telegram.WebApp.sendData()` sends a service message containing `message.web_app_data.data`. Telegram documents that bad clients can send arbitrary data in this field, so the plugin parses it as untrusted JSON.

References: [Telegram Mini Apps](https://core.telegram.org/bots/webapps), [WebAppInitData](https://core.telegram.org/bots/webapps#webappinitdata), [WebAppData](https://core.telegram.org/bots/api#webappdata), [WebAppInfo](https://core.telegram.org/bots/api#webappinfo), and [answerWebAppQuery](https://core.telegram.org/bots/api#answerwebappquery).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/webapp-kit
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/webapp-kit": "file:../vibegram/plugins/webapp-kit"
  }
}
```

## Bot Setup

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
        'Open the Mini App',
        'Launch',
        'https://example.com/app'
    );
});

bot.on('message:web_app_data', async ctx => {
    const payload = ctx.webApp.parseData<{ action: 'save'; itemId: string }>();
    await ctx.reply(`Saved ${payload.itemId}`);
});
```

`ctx.webApp` is request-scoped and restored after the middleware chain finishes.

## Validate initData

Send `Telegram.WebApp.initData` from the frontend to your backend. Validate it before creating an app session.

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

Use `validateInitData()` if you prefer a result object instead of exceptions:

```typescript
const result = validateInitData(initData, {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
});

if (!result.ok) {
    return res.status(401).json({ error: result.error.code });
}
```

Errors are normalized as `WebAppKitError` and do not include the bot token or raw payload.

## Launch Payload

Telegram passes direct-link and main-app launch values as `start_param`. Keep this value small and treat it as routing metadata, not an authorization source.

```typescript
import { parseLaunchPayload } from '@vibegram/webapp-kit';

const launch = parseLaunchPayload<{ screen: string; id: string }>(
    verified.data.start_param,
    { format: 'base64json' }
);
```

Supported formats:

| Format | Meaning |
| --- | --- |
| `raw` | Return the raw `start_param` string |
| `json` | Parse the value as JSON |
| `base64json` | Decode base64url then parse JSON |
| `urlsearchparams` | Parse `a=1&b=2` into an object |

You can also pass a custom `parser`.

## Frontend Integration

Include Telegram's WebApp script in your frontend entry HTML:

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
    'Open checkout',
    'Checkout',
    'https://example.com/checkout'
);
```

Reply keyboard button:

```typescript
await ctx.webApp.replyWithKeyboardButton(
    'Open settings',
    'Settings',
    'https://example.com/settings'
);
```

Build markup without replying:

```typescript
const reply_markup = ctx.webApp.inlineKeyboard('Open', 'https://example.com/app');
```

The helpers require HTTPS URLs because Telegram `WebAppInfo` requires an HTTPS Mini App URL.

## answerWebAppQuery

Inline-button Mini Apps can return a result with `answerWebAppQuery`.

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

Only use this when the validated `initData` includes `query_id`.

## CSRF And Session Binding

`initData` proves that Telegram created the launch data. It is not a replacement for your app session.

Recommended server flow:

1. Frontend sends raw `initData` to `/api/webapp/session`.
2. Server validates `initData` with `assertValidInitData()`.
3. Server creates its own session bound to `verified.data.user.id`.
4. Server returns a SameSite cookie or a CSRF token for later mutations.
5. Every state-changing API route checks the session and CSRF token.

For group/shared Mini Apps, also store `chat_instance` or your own room ID from `start_param` so concurrent chats do not share state accidentally.

## Options

### `webAppKit(options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `botToken` | `string` | required | Bot token used for Telegram HMAC validation |
| `maxAgeSeconds` | `number` | `86400` | Maximum accepted `auth_date` age |
| `futureSkewSeconds` | `number` | `30` | Clock skew tolerance for future `auth_date` |
| `now` | `() => number` | current Unix time | Test clock |

### `parseWebAppData(data, options)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxBytes` | `number` | `4096` | Telegram `sendData()` string size limit |
| `validate` | type guard | none | Optional runtime shape validation |

## TypeScript API

Exports include `webAppKit()`, `validateInitData()`, `assertValidInitData()`, `parseWebAppData()`, `parseLaunchPayload()`, `buildWebAppInlineKeyboard()`, `buildWebAppReplyKeyboard()`, `normalizeWebAppKitError()`, `WebAppKitError`, `WebAppFlavor`, `WebAppInitData`, and related option/result types.

## Security Checklist

- Keep the bot token only on the server.
- Validate raw `initData`; do not trust `initDataUnsafe`.
- Use short `maxAgeSeconds` for login/session exchange endpoints.
- Bind your server session to the validated Telegram `user.id`.
- Add CSRF protection or SameSite cookies to state-changing WebApp API routes.
- Validate the parsed shape of `web_app_data.data`.
- Do not log raw `initData`, bot tokens, or user payloads in production.

## Validation

The plugin is covered by tests for HMAC validation, expired `auth_date`, safe `web_app_data` parsing, typed launch payload parsing, helper attachment, reply payloads, and secret-safe errors.

```bash
npm run plugins:validate
npm run docs:build
```
