# Error Handling

VibeGram provides a global error catcher to prevent unhandled exceptions from crashing your bot.

## Global Error Handler

```typescript
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.from?.first_name}:`, err);
    ctx.reply('An error occurred. Please try again.').catch(() => {});
});
```

## How It Works

- All middleware and handler errors are caught automatically
- The `err` parameter contains the thrown error object
- The `ctx` parameter provides the update context where the error occurred
- If no `bot.catch()` is registered, errors are logged to `console.error`

## Error Isolation

In polling mode, each update is processed with `await`, ensuring that errors in one update do not affect others:

```typescript
// Each update is fully awaited — no unhandled rejections
for (const update of updates) {
    await this.handleUpdate(update);
}
```

## Best Practices

```typescript
bot.catch(async (err, ctx) => {
    // 1. Log to your monitoring service
    logger.error({ err, chatId: ctx.chat?.id, updateId: ctx.update.update_id });

    // 2. Notify the user
    await ctx.reply('Something went wrong. Our team has been notified.').catch(() => {});

    // 3. Never re-throw — this would crash the process
});
```
