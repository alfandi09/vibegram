# Bot Instance & Polling

## Creating a Bot

```typescript
import { Bot } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
```

## Polling Options

Configure the polling behavior via the `options` parameter:

```typescript
const bot = new Bot('YOUR_BOT_TOKEN', {
    polling: {
        interval: 300,      // ms between polls (default: 300)
        limit: 100,          // max updates per poll (default: 100)
        timeout: 30,         // long-polling timeout in seconds (default: 30)
        allowed_updates: [   // filter update types (optional)
            'message',
            'callback_query',
            'chat_member'
        ]
    }
});
```

## Launch & Shutdown

```typescript
// Start polling
bot.launch().then(() => console.log('Bot running'));

// Graceful shutdown
bot.stop('Maintenance');

// Handle process signals
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
```

## Webhook Mode

For production deployments, use webhooks instead of polling:

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Optional: secret token prevents unauthorized requests
app.post('/webhook', bot.webhookCallback('my-secret-token'));

app.listen(3000, () => {
    console.log('Webhook server running on port 3000');
});
```

Register the webhook with Telegram:

```typescript
await bot.callApi('setWebhook', {
    url: 'https://your-domain.com/webhook',
    secret_token: 'my-secret-token'
});
```

## Bot-Level Methods

These methods are available directly on the `Bot` instance:

| Method | Description |
|--------|-------------|
| `bot.getMe()` | Get bot info (id, username, name) |
| `bot.setMyCommands(commands)` | Set the command menu |
| `bot.getMyCommands()` | Get current command list |
| `bot.deleteMyCommands()` | Remove all commands |
| `bot.callApi(method, params)` | Call any Telegram API method directly |
| `bot.validateWebAppData(initData)` | Validate Mini App data |

```typescript
// Set up the command menu
await bot.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help' },
    { command: 'settings', description: 'Bot settings' }
]);

// Get bot information
const me = await bot.getMe();
console.log(`Running as @${me.username}`);
```
