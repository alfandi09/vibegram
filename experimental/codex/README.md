# @vibegram/codex

> Experimental Codex/ChatGPT session provider for the VibeGram Telegram bot framework.

This package connects a Telegram bot to ChatGPT through a Codex session token from `auth.json`. It targets `chatgpt.com/backend-api/codex`, not the official `api.openai.com` API.

Use it for personal bots, private experiments, and internal tools only. The backend endpoint and auth behavior are unofficial and can change without notice.

## Recommended Server Setup

Create `auth.json` with Codex login on a trusted machine:

```bash
codex login
```

Choose ChatGPT login mode, then deploy the generated auth file to the bot server as a secret file:

```text
/opt/my-telegram-bot/secrets/codex-auth.json
```

Runtime environment:

```bash
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
TELEGRAM_BOT_USERNAME=my_bot
```

Keep the file outside your repository and restrict permissions:

```bash
chmod 600 /opt/my-telegram-bot/secrets/codex-auth.json
```

Using `authJsonPath` is recommended because the provider can refresh expired access tokens and persist the refreshed token back to disk.

### Deployment notes

For VPS deployments, keep the auth file outside the app directory and load configuration through an environment file:

```text
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
TELEGRAM_BOT_USERNAME=my_bot
```

For Docker deployments, mount the auth file as a secret or volume:

```yaml
services:
  bot:
    image: my-telegram-bot:latest
    environment:
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      CODEX_AUTH_JSON_PATH: /run/secrets/codex-auth.json
      CODEX_MODEL: gpt-5.3-codex
    volumes:
      - ./secrets/codex-auth.json:/run/secrets/codex-auth.json
```

Make the mounted file writable if you want refreshed tokens to survive container restarts.

## Minimal Bot

```ts
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

if (!telegramToken) throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!authJsonPath) throw new Error('CODEX_AUTH_JSON_PATH is required');

const bot = new Bot(telegramToken);

bot.use(codex({
  provider: codexProvider({
    authJsonPath,
    model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
    accountId: process.env.CODEX_ACCOUNT_ID,
    deviceId: process.env.CODEX_DEVICE_ID,
  }),
  systemPrompt: process.env.CODEX_SYSTEM_PROMPT ?? 'You are a concise Telegram assistant.',
  allowedUserIds: parseNumberList(process.env.CODEX_ALLOWED_USER_IDS),
  allowedChatIds: parseNumberList(process.env.CODEX_ALLOWED_CHAT_IDS),
  botUsername: process.env.TELEGRAM_BOT_USERNAME,
  autoReply: process.env.CODEX_AUTO_REPLY !== 'false',
  groupMentionOnly: true,
  maxHistory: 20,
  timeoutMs: 60_000,
}));

await bot.launch();
```

## Local Development

For local testing, point the bot to the Codex CLI default file:

```bash
export TELEGRAM_BOT_TOKEN="123456:replace-me"
export CODEX_AUTH_JSON_PATH="$HOME/.codex/auth.json"
export CODEX_MODEL="gpt-5.3-codex"
```

Windows PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CODEX_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:CODEX_MODEL="gpt-5.3-codex"
```

Live smoke test:

```bash
npm run build
npm run test:live
```

## Commands

The plugin registers `/codex` commands:

| Command | Description |
| --- | --- |
| `/codex help` | Show available commands |
| `/codex status` | Check provider, model, token expiry, usage, and personality |
| `/codex reset` | Clear conversation history |
| `/codex models` | List available models |
| `/codex ask <text>` | Ask explicitly |
| `/codex personality <text>` | Set per-user custom instructions |
| `/codex personality` | View current personality |
| `/codex personality reset` | Reset personality |

## Provider Options

```ts
codexProvider({
  accessToken,       // Direct token. No refresh token persistence.
  authJsonPath,      // Recommended. Defaults to ~/.codex/auth.json.
  model,             // Default: gpt-5.3-codex
  reasoningEffort,   // low | medium | high | xhigh
  timeoutMs,         // Default: 60000
  maxRetries,        // Default: 2
  baseUrl,           // Default: https://chatgpt.com/backend-api/codex
  accountId,         // ChatGPT account id header override
  deviceId,          // Stable oai-device-id value
  autoRefresh,       // Default: true when refresh_token exists
});
```

## Persistence

The default memory store is in-memory. Conversation history, per-user personality, and process-local usage counters disappear when the bot process restarts.

For server bots, pass a custom store:

```ts
import type { CodexMemoryStore, CodexMessage } from '@vibegram/codex';

class DatabaseCodexStore implements CodexMemoryStore {
  async append(key: string, message: CodexMessage): Promise<void> {
    // Insert the message into your database or cache.
  }

  async list(key: string): Promise<CodexMessage[]> {
    // Return messages ordered from oldest to newest.
    return [];
  }

  async clear(key: string): Promise<void> {
    // Delete messages for this key.
  }
}
```

## Loading Auth From JSON

Prefer `authJsonPath` for long-running bots because token refresh can update the auth file on disk.

If your platform only exposes secrets as JSON objects, use `codexProviderFromJson()`:

```ts
import { codexProviderFromJson } from '@vibegram/codex';

const authJson = JSON.parse(process.env.CODEX_AUTH_JSON_JSON ?? '{}');

const provider = codexProviderFromJson(authJson, {
  model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
});
```

This does not persist refreshed tokens back to the original secret source. For long-lived deployments, use a writable `authJsonPath` or rotate/reload the secret yourself.

## Important Notes

- This package uses Codex/ChatGPT session tokens, not OpenAI API keys.
- Session tokens are valid only against the ChatGPT/Codex backend.
- The provider does not bypass Cloudflare, proof-of-work, sentinel tokens, or other anti-automation checks.
- Use `allowedUserIds` or `allowedChatIds` so unknown users cannot consume your quota.
- Never commit `.env`, `auth.json`, token logs, or copied `.codex` files.

## File Structure

```text
experimental/codex/
  src/
    index.ts
    types.ts
    plugin.ts
    memory.ts
    providers/
      chatgpt-token.ts
  examples/
    bot-codex.ts
    live-telegram-bot.ts
  package.json
  tsconfig.json
  README.md
```
