# @vibegram/codex

Connect a VibeGram Telegram bot to ChatGPT through a Codex session. Adds `ctx.codex`
to handlers with conversation memory, allow-lists, and an audit hook.

> **Experimental.** `codexProvider()` talks to the ChatGPT/Codex backend with a
> ChatGPT session token, not to the official OpenAI API. Use it for personal bots and
> internal tools where you control every Telegram user.

Until vibegram 3.0 this plugin was bundled as the `vibegram/codex` subpath. The API is
unchanged; only the import path moved.

## Install

```bash
npm install vibegram @vibegram/codex
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { codex, codexProvider } from '@vibegram/codex';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(
    codex({
        provider: codexProvider({ authJsonPath: process.env.CODEX_AUTH_JSON_PATH }),
        allowedUserIds: [Number(process.env.OWNER_ID)],
    })
);
```

Full guide: <https://alfandi09.github.io/vibegram/plugins/codex>

## Upgrading from `vibegram/codex`

```diff
- import { codex, codexProvider } from 'vibegram/codex';
+ import { codex, codexProvider } from '@vibegram/codex';
```

## Development

Inside the vibegram repository the `vibegram` peer dependency resolves to the core
build (`../../dist/types`) for typechecking and to `../../src` for tests:

```bash
npm run build        # in the repository root first
npm run typecheck && npm test && npm run build   # in plugins/codex
```
