# @vibegram/codex

> **EXPERIMENTAL** — Codex ChatGPT plugin for the VibeGram Telegram bot framework.

Connect your Telegram bot to ChatGPT using a **Codex session token** (`~/.codex/auth.json`). The provider talks directly to `chatgpt.com/backend-api/codex` — the same internal endpoint used by the Codex CLI. Usage counts towards your **Codex quota** (not ChatGPT chat quota).

---

## Quick Start

```ts
import { Bot } from 'vibegram'
import { codex, codexProvider } from '@vibegram/codex'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

bot.use(codex({
  provider: codexProvider({
    // Auto-loads from ~/.codex/auth.json
    model: 'gpt-5.3-codex',
  }),
  systemPrompt: 'You are a helpful assistant.',
  autoReply: true,
}))

bot.launch()
```

### From JSON Object

```ts
import authData from './auth.json'
import { codexProviderFromJson } from '@vibegram/codex'

const provider = codexProviderFromJson(authData, {
  model: 'gpt-5.3-codex',
})
```

Expected `auth.json` format (created by `codex login`):

```json
{
  "auth_mode": "chatgpt",
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "rt_...",
    "id_token": "eyJ..."
  }
}
```

---

## Bot Commands

The plugin automatically registers `/codex` commands:

| Command | Description |
|---------|-------------|
| `/codex help` | Show available commands |
| `/codex status` | Check provider, model, token expiry, usage & personality |
| `/codex reset` | Clear conversation history |
| `/codex models` | List available models |
| `/codex ask <text>` | Ask GPT explicitly |
| `/codex personality <text>` | Set custom instructions for your user |
| `/codex personality` | View current personality |
| `/codex personality reset` | Reset to default personality |

---

## Plugin Options

```ts
codex({
  provider,              // Required — codexProvider()
  systemPrompt,          // Default: 'You are a helpful assistant.'
  maxPromptLength,       // Default: 4000 chars
  maxResponseLength,     // Default: 4096 chars
  maxHistory,            // Sliding window, default: 20 messages
  timeoutMs,             // Default: 30000 ms
  allowedUserIds,        // Whitelist Telegram user IDs (empty = all)
  allowedChatIds,        // Whitelist chat IDs (empty = all)
  commandPrefix,         // Default: 'codex'
  autoReply,             // Default: true (auto-reply in DMs)
  groupMentionOnly,      // Default: true (in groups, reply only when mentioned)
  botUsername,            // Required for group mention detection
  memoryStore,           // Custom memory adapter
  onAudit,               // Audit callback (prompt body is NOT logged)
})
```

---

## codexProvider Options

```ts
codexProvider({
  accessToken,       // Direct token (optional if authJsonPath is used)
  authJsonPath,      // Path to auth.json (default: ~/.codex/auth.json)
  model,             // Default: 'gpt-5.3-codex'
  reasoningEffort,   // 'low' | 'medium' | 'high' | 'xhigh'
  timeoutMs,         // Default: 60000
  maxRetries,        // Default: 2
  baseUrl,           // Default: 'https://chatgpt.com/backend-api/codex'
  accountId,         // ChatGPT account ID (auto-detected from JWT)
  deviceId,          // oai-device-id header (random UUID if omitted)
  autoRefresh,       // Auto-refresh expired tokens (default: true)
})
```

---

## Auto-Refresh Token

When the `access_token` expires (JWT `exp` claim), the provider **automatically refreshes** it using the `refresh_token` from `auth.json`:

```
Token expired → POST auth.openai.com/oauth/token → New access_token
                                                  → Update auth.json on disk
                                                  → Continue request seamlessly
```

- Uses standard OAuth2 `grant_type: refresh_token` flow
- Updates in-memory token, axios headers, AND `auth.json` on disk
- Prevents concurrent refresh attempts
- Can be disabled with `autoRefresh: false`

---

## Custom Personality (Per-User Instructions)

Each user can set their own custom instructions via `/codex personality`:

```
/codex personality Jawab selalu dalam bahasa Indonesia dan gaya formal
/codex personality You are a coding expert. Always provide code examples.
/codex personality reset
```

---

## ⚠️ Important Notes

- Uses **Codex quota** from your ChatGPT subscription (separate from ChatGPT chat quota)
- The `access_token` from Codex is a short-lived JWT (~1 hour). Auto-refresh extends the session automatically.
- If the `refresh_token` is also expired, run `codex login` to re-authenticate.
- Session tokens target `chatgpt.com/backend-api/codex`, **NOT** `api.openai.com`.
- The ChatGPT backend requires `store: false` and `stream: true`. SSE parsing is handled internally.
- This provider does NOT reproduce sentinel tokens, proof-of-work, or Cloudflare bypass.
- Use only for personal/development use.

---

## File Structure

```
experimental/codex/
  src/
    index.ts                    ← Barrel export
    types.ts                    ← Interfaces & types
    plugin.ts                   ← Main middleware (ctx.codex)
    memory.ts                   ← In-memory conversation store
    providers/
      chatgpt-token.ts          ← Codex session token provider
  examples/
    bot-codex.ts                ← Basic example
    live-telegram-bot.ts        ← Full live test bot (env-driven)
  package.json
  tsconfig.json
  README.md
```
