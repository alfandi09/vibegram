# Draft Messages (Bot API 9.5)

Draft messages pre-fill the user's input field with text. This is useful for AI text streaming, auto-complete suggestions, and guided input.

## Usage

```typescript
bot.command('draft', async (ctx) => {
    await ctx.replyWithDraft('Pre-filled text appears in the input box...');
});
```

## Use Cases

### AI Text Streaming
```typescript
bot.command('ai', async (ctx) => {
    const prompt = ctx.command?.args?.join(' ') || '';
    // Stream AI response as draft (user sees it typing)
    for (const chunk of aiStream(prompt)) {
        await ctx.replyWithDraft(chunk);
    }
});
```

### Auto-Complete
```typescript
bot.command('template', async (ctx) => {
    await ctx.replyWithDraft('/order product_name quantity address');
});
```

## API Details

| Method | API | Description |
|--------|-----|-------------|
| `ctx.replyWithDraft(text, extra?)` | `sendMessageDraft` | Pre-fill the input field |

::: info
Draft messages use `crypto.randomBytes(8)` to generate secure 64-bit random IDs, preventing collisions even at high concurrency.
:::
