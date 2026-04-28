# Codex for Telegram

The `@vibegram/codex` plugin adds `ctx.codex` to every VibeGram handler so your Telegram bot can talk to ChatGPT via a Codex session token.

::: warning Experimental
This package lives in `experimental/codex`. Its API surface, environment variables, and internal endpoint may change before stable release.
:::

## How It Works

The plugin injects a `ctx.codex` helper into every update. When a user sends a message, the plugin:

1. Checks permissions (`allowedUserIds` / `allowedChatIds`)
2. Builds a conversation from the message history (sliding window)
3. Injects per-user personality/custom instructions if set
4. Sends the conversation to `chatgpt.com/backend-api/codex/responses`
5. Parses the SSE stream response and returns the text as a Telegram reply

Usage counts towards your **Codex quota** — separate from the ChatGPT web chat quota.

## Limitations

`codexProvider()` targets the internal ChatGPT backend. The provider is best-effort and may fail if OpenAI changes auth rules, sentinel checks, or anti-automation protection. Use it for personal experiments, private bots, and learning — not production workloads.

## Install

If `@vibegram/codex` has been published:

```bash
npm install vibegram @vibegram/codex
```

If you are using the experimental package from this repository:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
npm run build

cd experimental/codex
npm install
npm run build
```

To consume the local package from your bot project:

```json
{
  "dependencies": {
    "vibegram": "^2.0.0",
    "@vibegram/codex": "file:../vibegram/experimental/codex"
  }
}
```

Then run:

```bash
npm install
```

## Getting `auth.json`

`auth.json` is created by the Codex CLI after you sign in with your ChatGPT account. Treat this file as a secret — it contains session tokens that grant access to your subscription.

### 1. Sign in to Codex

```bash
codex login
```

Make sure you sign in with ChatGPT mode (not API key mode).

### 2. Locate `auth.json`

| OS | Default path |
| --- | --- |
| Windows | `%USERPROFILE%\.codex\auth.json` |
| macOS/Linux | `~/.codex/auth.json` |

Verify the file exists without printing tokens:

```powershell
Test-Path "$env:USERPROFILE\.codex\auth.json"
```

Never commit `auth.json`, upload it to logs, or paste `tokens.access_token` in public chats.

## Environment Variables

Windows PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CHATGPT_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:GPT_MODEL="gpt-5.3-codex"
```

macOS/Linux:

```bash
export TELEGRAM_BOT_TOKEN="123456:replace-me"
export CHATGPT_AUTH_JSON_PATH="$HOME/.codex/auth.json"
export GPT_MODEL="gpt-5.3-codex"
```

Optional:

```bash
TELEGRAM_BOT_USERNAME=my_bot
CHATGPT_ACCOUNT_ID=acct_xxx
CHATGPT_DEVICE_ID=stable-device-id
GPT_REASONING_EFFORT=low
GPT_ALLOWED_USER_IDS=123456,789012
GPT_ALLOWED_CHAT_IDS=123456,-1001234567890
GPT_AUTO_REPLY=true
```

## Minimal Bot

```typescript
import { Bot } from 'vibegram';
import { codex, codexProvider } from '@vibegram/codex';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
}

const allowedUserIds = process.env.GPT_ALLOWED_USER_IDS
    ?.split(',')
    .map(value => Number(value.trim()))
    .filter(Number.isFinite);

const bot = new Bot(token);

bot.use(
    codex({
        provider: codexProvider({
            authJsonPath: process.env.CHATGPT_AUTH_JSON_PATH,
            accountId: process.env.CHATGPT_ACCOUNT_ID,
            deviceId: process.env.CHATGPT_DEVICE_ID,
            model: process.env.GPT_MODEL ?? 'gpt-5.3-codex',
            reasoningEffort: process.env.GPT_REASONING_EFFORT as
                | 'low'
                | 'medium'
                | 'high'
                | 'xhigh'
                | undefined,
        }),
        systemPrompt: 'You are a concise and helpful Telegram assistant.',
        autoReply: true,
        timeoutMs: 60_000,
        maxHistory: 20,
        allowedUserIds,
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

## Built-in Commands

The plugin automatically provides commands with the default `/codex` prefix.

| Command | Purpose |
| --- | --- |
| `/codex help` | Show help |
| `/codex status` | Check provider, model, token expiry, usage stats & personality |
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

## Custom Personality (Per-User Instructions)

Each user can set their own personality/custom instructions that get prepended to the system prompt for every request. This works like ChatGPT's "Custom Instructions" feature.

### Setting a Personality

```
/codex personality Jawab selalu dalam bahasa Indonesia dan gaya formal
/codex personality You are a coding expert. Always provide code examples.
/codex personality Kamu adalah chef profesional. Berikan resep dan tips memasak.
```

### Viewing or Resetting

```
/codex personality          # View current personality
/codex personality reset    # Reset to default
```

**How it works:**
- Stored per-user in the memory store (survives across conversations)
- Max 2000 characters
- Injected as: `{systemPrompt}\n\nUser custom instructions: {personality}`
- Shows in `/codex status` output

## Usage Tracking

The plugin tracks session-wide usage statistics (since bot start):

- Total requests
- Input/output/total tokens consumed
- Per-user request and token counts

View current stats with `/codex status`.

> Note: This tracks local session usage only. There is no API to check your ChatGPT/Codex subscription quota.

## Auto-Refresh Token

When the `access_token` expires, the provider **automatically refreshes** it using the `refresh_token` from `auth.json`. This happens transparently — the user never sees an interruption.

**How it works:**

1. Before each request, the provider checks the JWT `exp` claim
2. If expired, it sends a `grant_type: refresh_token` request to `auth.openai.com/oauth/token`
3. The new `access_token` replaces the old one in memory and in `auth.json` on disk
4. The original request proceeds with the fresh token

**Key details:**

- Enabled by default when `refresh_token` is present in `auth.json`
- Concurrent refresh requests are prevented (only one refresh at a time)
- If the `refresh_token` itself is expired or revoked, run `codex login` again
- Disable with `autoRefresh: false` in provider options

## Live Smoke Test

A live bot example is available at `experimental/codex/examples/live-telegram-bot.ts`.

```powershell
cd path\to\vibegram\experimental\codex
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CHATGPT_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:GPT_MODEL="gpt-5.3-codex"
npm run test:live
```

For group usage:

```powershell
$env:TELEGRAM_BOT_USERNAME="bot_username_without_at"
```

## Plugin Options

| Option | Default | Description |
| --- | --- | --- |
| `provider` | required | Codex provider (`codexProvider()`) |
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
| `accessToken` | — | Direct Bearer token (skips auth.json) |
| `authJsonPath` | `~/.codex/auth.json` | Path to Codex auth file |
| `model` | `gpt-5.3-codex` | Model to request |
| `reasoningEffort` | — | `low` / `medium` / `high` / `xhigh` |
| `timeoutMs` | `60000` | Request timeout |
| `maxRetries` | `2` | Retry attempts on 5xx errors |
| `baseUrl` | `chatgpt.com/backend-api/codex` | Backend API base URL |
| `accountId` | auto-detected | ChatGPT account ID header |
| `deviceId` | random UUID | `oai-device-id` header |
| `autoRefresh` | `true` | Auto-refresh expired tokens via OAuth2 |

## How `codexProvider` Works

The provider reads `access_token` from `auth.json`, then calls:

```text
POST https://chatgpt.com/backend-api/codex/responses
```

Main payload:

```json
{
  "model": "gpt-5.3-codex",
  "instructions": "You are a Telegram assistant.",
  "input": [{ "role": "user", "content": "Hello" }],
  "store": false,
  "stream": true
}
```

Important headers:

```text
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: text/event-stream
oai-device-id: <uuid>
oai-language: en
Chatgpt-Account-Id: <account_id if available>
```

The response is returned as Server-Sent Events (SSE). The provider collects `response.output_text.delta` events and uses `response.completed` as the final result.

## Troubleshooting

| Error | Common cause | Fix |
| --- | --- | --- |
| `auth JSON not found` | Wrong path | Set `CHATGPT_AUTH_JSON_PATH` to an absolute path |
| `No access_token found` | Codex login is incomplete | Run `codex login` again |
| `access_token has expired` | JWT expiry passed and auto-refresh failed | Check `refresh_token` validity or run `codex login` |
| `Token refresh failed` | `refresh_token` is expired or revoked | Run `codex login` to get fresh tokens |
| `401` while token is not expired | Backend may require extra security tokens | Refresh login and try again |
| `403` | Model unavailable or plan mismatch | Try another model listed by `/codex models` |
| `429` | Codex rate limit | Wait and retry |
| `503 Cloudflare` | Automated access blocked | The plugin does not bypass this |
| `Empty response` | SSE stream returned no text events | Check the model name and try another model from `/codex models` |

## Security Checklist

- Store `TELEGRAM_BOT_TOKEN` and `auth.json` in environment variables or a secret manager.
- Never commit `.env`, `auth.json`, token logs, or printed `.codex` files.
- Use `allowedUserIds` for personal bots so other users cannot consume your Codex quota.
- Use `onAudit` for observability, but do not log full prompts when they may contain sensitive data.
- Rotate the Telegram bot token if it was ever shared in chat or logs.
