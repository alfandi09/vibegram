# Bot Methods

Methods available directly on the `Bot` instance (no Context required).

## Instance Methods

| Method | Description |
|--------|-------------|
| `bot.launch()` | Start long-polling |
| `bot.stop(reason?)` | Stop polling gracefully |
| `bot.handleUpdate(update)` | Process a raw update object manually |
| `bot.webhookCallback(secretToken?)` | Create an Express-compatible webhook handler |
| `bot.callApi(method, params?)` | Call any Telegram API method directly |
| `bot.validateWebAppData(initData, opts?)` | Validate Mini App initData |
| `bot.getMe()` | Get bot info |
| `bot.setMyCommands(commands, extra?)` | Set command menu |
| `bot.getMyCommands(extra?)` | Get command list |
| `bot.deleteMyCommands(extra?)` | Delete command menu |

## Routing Methods

Inherited from `Composer`:

| Method | Description |
|--------|-------------|
| `bot.use(middleware)` | Register middleware |
| `bot.command(name, handler)` | Handle `/command` messages |
| `bot.hears(trigger, handler)` | Match text patterns |
| `bot.on(event, handler)` | Listen for update types |
| `bot.action(trigger, handler)` | Handle callback button presses |
| `bot.catch(handler)` | Global error handler |

## Direct API Calls

For methods not covered by Context shortcuts:

```typescript
// Call any Telegram API method
const result = await bot.callApi('sendMessage', {
    chat_id: 123456,
    text: 'Hello from callApi!'
});

// Set webhook
await bot.callApi('setWebhook', {
    url: 'https://example.com/webhook',
    secret_token: 'my-secret'
});
```
