# Error Handling

VibeGram provides a global error catcher and typed error classes so bot failures
can be logged, classified, and reported to users without crashing the process.

## Error Hierarchy

```text
Error
  VibeGramError
    TelegramApiError
    NetworkError
    RateLimitError
    InvalidTokenError
    WebAppValidationError
    ConversationTimeoutError
```

## Global Error Handler

```typescript
bot.catch((err, ctx) => {
    console.error(`Error for update ${ctx.update.update_id}:`, err);
    ctx.reply('An error occurred. Please try again.').catch(() => {});
});
```

If no `bot.catch()` handler is registered, VibeGram logs the error to
`console.error`.

## Typed Error Handling

```typescript
import {
    ConversationTimeoutError,
    InvalidTokenError,
    NetworkError,
    RateLimitError,
    TelegramApiError,
    VibeGramError,
} from 'vibegram';

bot.catch(async (err, ctx) => {
    if (err instanceof TelegramApiError) {
        console.error(`Telegram API ${err.errorCode}: ${err.description}`);

        if (err.errorCode === 403) {
            console.log(`User ${ctx.from?.id} may have blocked the bot`);
            return;
        }

        await ctx.reply('Telegram rejected that request.').catch(() => {});
        return;
    }

    if (err instanceof RateLimitError) {
        console.warn(`Rate limited. Retry after ${err.retryAfter}s`);
        return;
    }

    if (err instanceof NetworkError) {
        console.error('Network failure:', err.originalError?.message);
        return;
    }

    if (err instanceof ConversationTimeoutError) {
        await ctx.reply('Conversation expired. Please start again.').catch(() => {});
        return;
    }

    if (err instanceof VibeGramError) {
        console.error(`[${err.code}] ${err.message}`);
        return;
    }

    console.error('Unknown error:', err);
});
```

## Error Properties

### `TelegramApiError`

| Property | Type | Description |
| --- | --- | --- |
| `message` | `string` | Error message |
| `errorCode` | `number` | Telegram/API status-like code |
| `description` | `string` | Telegram API description |
| `code` | `string` | Stable VibeGram error code |

### `RateLimitError`

| Property | Type | Description |
| --- | --- | --- |
| `retryAfter` | `number` | Seconds until retry is allowed |
| `code` | `string` | Stable VibeGram error code |

### `NetworkError`

| Property | Type | Description |
| --- | --- | --- |
| `originalError` | `Error | undefined` | Original transport error |
| `code` | `string` | Stable VibeGram error code |

### `ConversationTimeoutError`

| Property | Type | Description |
| --- | --- | --- |
| `chatId` | `number | string | undefined` | Chat where the timeout happened |
| `code` | `string` | Stable VibeGram error code |

## Local Error Handling

Catch expected failures inside a handler and rethrow unexpected ones to the
global handler:

```typescript
bot.command('ban', async ctx => {
    try {
        await ctx.banChatMember(targetId);
        await ctx.reply('User banned.');
    } catch (err) {
        if (err instanceof TelegramApiError && err.errorCode === 400) {
            await ctx.reply('User was not found in this chat.');
            return;
        }

        throw err;
    }
});
```

## Launch Token Errors

`launch()` validates the bot token with `getMe()` before starting. Handle
`InvalidTokenError` near your process entry point:

```typescript
import { InvalidTokenError } from 'vibegram';

try {
    await bot.launch();
} catch (err) {
    if (err instanceof InvalidTokenError) {
        console.error('Bot token is invalid.');
        process.exit(1);
    }

    throw err;
}
```

## Error Isolation

Polling awaits each update before moving to the next one, so one failed update
does not create an unhandled rejection for the rest of the batch.

Webhook adapters catch update-processing errors and return `500 Internal Server
Error`; use observability hooks and `bot.catch()` for logging and safe user
responses.

## Best Practices

- Register `bot.catch()` before production deployment.
- Log structured metadata such as `update_id`, `chat.id`, and error class.
- Avoid sending stack traces or raw error messages to users.
- Do not rethrow from `bot.catch()` unless a supervisor must restart the process.
