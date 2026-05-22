# @vibegram/webapp-kit

Telegram Mini App helpers for VibeGram bots: `initData` validation, typed launch payload parsing, safe `web_app_data` parsing, and reply helpers for WebApp buttons.

## Official Telegram Mapping

This package follows Telegram Mini App and Bot API behavior:

- `window.Telegram.WebApp.initData` must be sent to your backend and validated before use.
- `message.web_app_data.data` is a string and can be arbitrary client input.
- Mini App buttons use Telegram `web_app` button payloads and require HTTPS URLs.
- Inline Mini App sessions can be completed with `answerWebAppQuery`.

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

## Bot Usage

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
    const payload = ctx.webApp.parseData<{ action: string }>();
    await ctx.reply(`Received ${payload.action}`);
});
```

## Server Validation

Your frontend should send `Telegram.WebApp.initData` to your backend. Never trust `initDataUnsafe`.

```typescript
import { assertValidInitData, parseLaunchPayload } from '@vibegram/webapp-kit';

app.post('/api/webapp/session', express.json(), (req, res) => {
    const verified = assertValidInitData(req.body.initData, {
        botToken: process.env.TELEGRAM_BOT_TOKEN!,
        maxAgeSeconds: 3600,
    });

    const launch = verified.data.start_param
        ? parseLaunchPayload<{ screen: string }>(verified.data.start_param, {
              format: 'base64json',
          })
        : undefined;

    res.json({
        userId: verified.data.user?.id,
        launch,
    });
});
```

## Framework Snippets

Vite:

```typescript
const tg = window.Telegram?.WebApp;
tg?.ready();

await fetch('/api/webapp/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData: tg?.initData ?? '' }),
});
```

React:

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

Vue:

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

## API

Exports include `webAppKit()`, `validateInitData()`, `assertValidInitData()`, `parseWebAppData()`, `parseLaunchPayload()`, `buildWebAppInlineKeyboard()`, `buildWebAppReplyKeyboard()`, `WebAppKitError`, `WebAppFlavor`, and related TypeScript types.

## Security Checklist

- Keep the bot token only on the server.
- Validate `initData` on every session creation request.
- Keep `maxAgeSeconds` short for login/session exchange endpoints.
- Bind your own server session to the validated Telegram `user.id`.
- Use SameSite cookies or a CSRF token for state-changing WebApp API routes.
- Treat `message.web_app_data.data` as untrusted JSON and validate its shape.
- Do not log raw `initData`, bot tokens, or user payloads in production.

## Validation

```bash
npm --prefix plugins/webapp-kit run typecheck
npm --prefix plugins/webapp-kit test
npm --prefix plugins/webapp-kit run build
```
