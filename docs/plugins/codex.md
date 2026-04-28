# Codex for Telegram

The `@vibegram/codex` plugin adds `ctx.codex` to VibeGram handlers so a Telegram bot can talk to ChatGPT through a Codex session token.

::: warning Experimental
This package lives in `experimental/codex`. Its API, environment variables, and internal ChatGPT endpoint can change before a stable release.
:::

## Recommended Use

Use this plugin for personal bots, private experiments, and internal tools where you control every Telegram user that can trigger the bot.

Do not treat it like the official OpenAI API. `codexProvider()` talks to the ChatGPT/Codex backend with a ChatGPT session token, not to `api.openai.com` with an API key. It is best-effort and can stop working if OpenAI changes session rules, backend headers, sentinel checks, or anti-automation protections.

## How It Works

The plugin injects a `ctx.codex` helper into each update. For every prompt it:

1. Checks `allowedUserIds` and `allowedChatIds`
2. Builds a short conversation window from stored history
3. Adds the configured `systemPrompt` and optional per-user personality
4. Sends the request to `chatgpt.com/backend-api/codex/responses`
5. Parses the SSE stream response and returns text to Telegram

Usage counts against the Codex quota available to the signed-in ChatGPT account.

## Install

When this experimental package is published, install it from npm:

```bash
npm install vibegram @vibegram/codex
```

Until then, use the experimental package directly from this repository:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
npm run build

cd experimental/codex
npm install
npm run build
```

Then consume it from your bot project with a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/codex": "file:../vibegram/experimental/codex"
  }
}
```

## Server Setup

For a real bot, create the Codex session on a trusted machine, then deploy the resulting `auth.json` to the server as a secret file. The bot only needs to read that file at runtime.

Recommended server layout:

```text
/opt/my-telegram-bot/
  app/
  secrets/
    codex-auth.json
```

Example environment:

```bash
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
CODEX_ALLOWED_CHAT_IDS=123456,-1001234567890
TELEGRAM_BOT_USERNAME=my_bot
```

Keep the secret file outside the repository, set restrictive file permissions, and do not print it in logs.

```bash
chmod 600 /opt/my-telegram-bot/secrets/codex-auth.json
```

If your platform supports secret mounts, mount `codex-auth.json` as a file and point `CODEX_AUTH_JSON_PATH` to that mount path. This is the cleanest option because the provider can refresh the access token and persist the updated token back to disk.

## Getting `auth.json`

Run Codex login on a trusted local machine or on a temporary server shell:

```bash
codex login
```

Choose ChatGPT login mode, not API key mode.

Default local paths:

| OS | Default path |
| --- | --- |
| Windows | `%USERPROFILE%\.codex\auth.json` |
| macOS/Linux | `~/.codex/auth.json` |

Verify the file exists without printing tokens:

```bash
test -f "$HOME/.codex/auth.json"
```

Then copy it to your server secret path by your normal deployment method. Examples include `scp`, Docker/Kubernetes secrets, a private CI secret artifact, or a manually provisioned file on a VPS.

## Deployment Recipes

These examples assume your bot has already been built into a deployable Node.js app.

### VPS with systemd

Store runtime configuration in an environment file:

```bash
sudo install -d -m 700 /opt/my-telegram-bot/secrets
sudo cp ~/.codex/auth.json /opt/my-telegram-bot/secrets/codex-auth.json
sudo chmod 600 /opt/my-telegram-bot/secrets/codex-auth.json
```

```text
# /etc/vibegram-codex.env
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
TELEGRAM_BOT_USERNAME=my_bot
```

Minimal service unit:

```ini
[Unit]
Description=VibeGram Codex Telegram Bot
After=network-online.target

[Service]
WorkingDirectory=/opt/my-telegram-bot/app
EnvironmentFile=/etc/vibegram-codex.env
ExecStart=/usr/bin/node dist/bot.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Docker secret mount

Mount `codex-auth.json` as a file, then point `CODEX_AUTH_JSON_PATH` to the mounted path:

```yaml
services:
  bot:
    image: my-telegram-bot:latest
    environment:
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      CODEX_AUTH_JSON_PATH: /run/secrets/codex-auth.json
      CODEX_MODEL: gpt-5.3-codex
      CODEX_ALLOWED_USER_IDS: "123456,789012"
      TELEGRAM_BOT_USERNAME: my_bot
    volumes:
      - ./secrets/codex-auth.json:/run/secrets/codex-auth.json
    restart: unless-stopped
```

Make the mounted file writable if you want token auto-refresh to persist refreshed tokens across container restarts.

## Minimal Server Bot

```typescript
import { Bot } from 'vibegram';
import { codex, codexProvider } from '@vibegram/codex';

function parseNumberList(value: string | undefined): number[] {
    if (!value) return [];

    return value
        .split(',')
        .map(item => Number(item.trim()))
        .filter(Number.isFinite);
}

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const authJsonPath = process.env.CODEX_AUTH_JSON_PATH;

if (!telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

if (!authJsonPath) {
    throw new Error('CODEX_AUTH_JSON_PATH is required');
}

const bot = new Bot(telegramToken);

bot.use(
    codex({
        provider: codexProvider({
            authJsonPath,
            accountId: process.env.CODEX_ACCOUNT_ID,
            deviceId: process.env.CODEX_DEVICE_ID,
            model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
            reasoningEffort: process.env.CODEX_REASONING_EFFORT as
                | 'low'
                | 'medium'
                | 'high'
                | 'xhigh'
                | undefined,
        }),
        systemPrompt: process.env.CODEX_SYSTEM_PROMPT ?? 'You are a concise Telegram assistant.',
        allowedUserIds: parseNumberList(process.env.CODEX_ALLOWED_USER_IDS),
        allowedChatIds: parseNumberList(process.env.CODEX_ALLOWED_CHAT_IDS),
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        autoReply: process.env.CODEX_AUTO_REPLY !== 'false',
        groupMentionOnly: true,
        maxHistory: 20,
        timeoutMs: 60_000,
        onAudit: event => {
            console.log('[codex]', {
                userId: event.userId,
                chatId: event.chatId,
                provider: event.provider,
                model: event.model,
                success: event.success,
                durationMs: event.durationMs,
                error: event.error,
            });
        },
    })
);

bot.start(ctx => ctx.reply('Send a message or use /codex ask <text>.'));

await bot.launch();
```

## Local Development

For local testing, you can point the bot directly to the Codex CLI default file:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CODEX_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:CODEX_MODEL="gpt-5.3-codex"
```

Or on macOS/Linux:

```bash
export TELEGRAM_BOT_TOKEN="123456:replace-me"
export CODEX_AUTH_JSON_PATH="$HOME/.codex/auth.json"
export CODEX_MODEL="gpt-5.3-codex"
```

The live smoke-test example is intentionally local and lives at:

```text
experimental/codex/examples/live-telegram-bot.ts
```

Run it from the experimental package:

```bash
cd experimental/codex
npm run build
npm run test:live
```

## Built-in Commands

The plugin automatically provides commands with the default `/codex` prefix.

| Command | Purpose |
| --- | --- |
| `/codex help` | Show help |
| `/codex status` | Check provider, model, token expiry, usage stats, and personality |
| `/codex models` | List provider models |
| `/codex reset` | Clear the current user/chat conversation history |
| `/codex ask <text>` | Send an explicit prompt |
| `/codex personality <text>` | Set custom instructions for your user |
| `/codex personality` | View current personality |
| `/codex personality reset` | Reset to default personality |

## Group Chats

For groups and supergroups, set `botUsername` so the plugin only replies to exact bot mentions.

```typescript
bot.use(
    codex({
        provider,
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        groupMentionOnly: true,
    })
);
```

If `botUsername` is omitted, group auto-reply is disabled to avoid answering messages that were not addressed to the bot.

## Custom Personality

Each Telegram user can set their own instructions. The plugin prepends those instructions to the configured `systemPrompt`.

```text
/codex personality Reply in Indonesian and keep answers concise
/codex personality You are a coding expert. Always provide code examples.
/codex personality reset
```

Details:

- Stored per user in the configured memory store
- Limited to 2000 characters
- Shown in `/codex status`

## Usage Tracking

The plugin tracks session-wide usage statistics since the bot process started:

- Total requests
- Input, output, and total tokens
- Per-user request and token counts

View current stats with `/codex status`.

This is local process telemetry only. It does not query your remaining ChatGPT/Codex subscription quota.

## Auto Refresh

When the access token expires, the provider can refresh it using the `refresh_token` in `auth.json`.

This works best when you use `authJsonPath`, because the provider can update the same file on disk after refresh. If you pass only a direct access token, there is no refresh token available and the bot will require re-authentication after expiry.

Refresh behavior:

1. The provider checks the JWT `exp` claim before requests
2. If expired, it sends a refresh request to `auth.openai.com/oauth/token`
3. The new access token is stored in memory
4. If an auth file path is available, the refreshed tokens are written back to disk

## Persistence

By default, the plugin uses an in-memory store. That is fine for local testing and simple personal bots, but it means these values disappear when the process restarts:

- Conversation history
- Per-user personality instructions
- In-process usage counters

For long-running server bots, pass a custom `memoryStore` backed by your own database or cache.

```typescript
import type { CodexMemoryStore, CodexMessage } from '@vibegram/codex';

class DatabaseCodexStore implements CodexMemoryStore {
    async append(key: string, message: CodexMessage): Promise<void> {
        // Insert { key, role: message.role, content: message.content } into your store.
    }

    async list(key: string): Promise<CodexMessage[]> {
        // Return messages ordered from oldest to newest.
        return [];
    }

    async clear(key: string): Promise<void> {
        // Delete all messages for this key.
    }
}

bot.use(
    codex({
        provider,
        memoryStore: new DatabaseCodexStore(),
    })
);
```

The store key is already scoped by user, chat, and group thread where possible. Keep the same ordering when returning messages from `list()`.

## Advanced Auth Loading

Use `authJsonPath` for most server deployments because it gives the provider access to both `access_token` and `refresh_token`, and lets refreshed tokens be written back to disk.

If your platform stores secrets as JSON objects rather than files, you can build the provider with `codexProviderFromJson()`:

```typescript
import { codexProviderFromJson } from '@vibegram/codex';

const authJson = JSON.parse(process.env.CODEX_AUTH_JSON_JSON ?? '{}');

const provider = codexProviderFromJson(authJson, {
    model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
    accountId: process.env.CODEX_ACCOUNT_ID,
    deviceId: process.env.CODEX_DEVICE_ID,
});
```

This is useful for secret managers or test environments, but it does not persist refreshed tokens back to the original secret source. For long-running bots, prefer a writable `authJsonPath` unless your deployment system can rotate and reload the secret.

## Plugin Options

| Option | Default | Description |
| --- | --- | --- |
| `provider` | required | Codex provider returned by `codexProvider()` |
| `systemPrompt` | `You are a helpful assistant.` | System instruction for every conversation |
| `maxPromptLength` | `4000` | Maximum user prompt length |
| `maxResponseLength` | `4096` | Maximum reply length before truncation |
| `maxHistory` | `20` | Conversation history sliding window |
| `timeoutMs` | `30000` | Provider request timeout |
| `allowedUserIds` | all | Telegram user allowlist |
| `allowedChatIds` | all | Telegram chat allowlist |
| `commandPrefix` | `codex` | Command prefix, for example `/codex` |
| `autoReply` | `true` | Auto-reply to text messages in DMs |
| `groupMentionOnly` | `true` | In groups, only reply when mentioned |
| `botUsername` | empty | Bot username for precise group mention detection |
| `memoryStore` | in-memory | Conversation history store adapter |
| `onAudit` | empty | Safe audit callback without prompt body |

## codexProvider Options

| Option | Default | Description |
| --- | --- | --- |
| `accessToken` | none | Direct bearer token. This skips `auth.json` loading and disables refresh unless you rebuild the provider with a fresh token. |
| `authJsonPath` | `~/.codex/auth.json` | Path to the Codex auth JSON file |
| `model` | `gpt-5.3-codex` | Model to request |
| `reasoningEffort` | none | `low`, `medium`, `high`, or `xhigh` |
| `timeoutMs` | `60000` | Provider request timeout |
| `maxRetries` | `2` | Retry attempts on transient 5xx errors |
| `baseUrl` | `https://chatgpt.com/backend-api/codex` | Backend API base URL |
| `accountId` | auto-detected | ChatGPT account ID header |
| `deviceId` | random UUID | `oai-device-id` header |
| `autoRefresh` | `true` when `refresh_token` exists | Auto-refresh expired tokens via OAuth2 |

## Troubleshooting

| Error | Common cause | Fix |
| --- | --- | --- |
| `auth JSON not found` | Wrong server secret path | Set `CODEX_AUTH_JSON_PATH` to an absolute readable path |
| `No access_token found` | Login file is incomplete or API-key mode was used | Run `codex login` again with ChatGPT login mode |
| `access_token has expired` | JWT expired and refresh was unavailable or failed | Check the `refresh_token` or run `codex login` again |
| `Token refresh failed` | Refresh token expired or revoked | Replace the server secret with a fresh `auth.json` |
| `401` while token is not expired | Backend requires extra client behavior this provider cannot reproduce | Refresh login and retry |
| `403` | Model unavailable or plan mismatch | Try another model listed by `/codex models` |
| `429` | Codex rate limit | Wait and retry |
| `503 Cloudflare` | Automated access blocked | This plugin does not bypass Cloudflare |
| `Empty response` | SSE stream returned no text events | Check model access and retry |

## Security Checklist

- Store `TELEGRAM_BOT_TOKEN` and `codex-auth.json` in a secret manager or private server path.
- Never commit `.env`, `auth.json`, token logs, screenshots of tokens, or copied `.codex` files.
- Use `allowedUserIds` or `allowedChatIds`; otherwise anyone who reaches the bot can consume your quota.
- Keep `onAudit` metadata-only. Do not log full prompts by default.
- Rotate the Telegram bot token if it was ever shared in chat or logs.
- Treat this plugin as experimental and private-use only.
