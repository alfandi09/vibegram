# Filter Combinators

Filter combinators allow you to compose complex routing conditions using `and()`, `or()`, and `not()` logic — combined with 20+ built-in predicates.

## Quick Start

```typescript
import { Bot, and, or, not, isPrivate, isGroup, isAdmin, hasText, hasPhoto } from 'vibegram';

// Only respond to text in private chats
bot.on('message', and(isPrivate, hasText), async (ctx, next) => {
    console.log('Private text message');
    await next();
});

// Admin-only command in groups
bot.command('ban', and(isGroup, isAdmin()), async (ctx) => {
    await ctx.reply('Admin action executed.');
});
```

## Combinators

| Function | Description |
|----------|-------------|
| `and(...filters)` | All filters must pass |
| `or(...filters)` | At least one filter must pass |
| `not(filter)` | Inverts the filter |

## Built-in Predicates

### Chat Type

| Predicate | Description |
|-----------|-------------|
| `isPrivate` | Private (DM) chat |
| `isGroup` | Group or supergroup |
| `isSupergroup` | Supergroup only |
| `isChannel` | Channel post |

### User Type

| Predicate | Description |
|-----------|-------------|
| `isBot` | Message from a bot |
| `isHuman` | Message from a real user |
| `isUser(...ids)` | Specific user IDs |
| `isAdmin()` | Chat admin or creator (async) |

### Content Type

| Predicate | Description |
|-----------|-------------|
| `hasText` | Message contains text |
| `hasPhoto` | Message contains photo |
| `hasDocument` | Message contains document |
| `hasVideo` | Message contains video |
| `hasAudio` | Message contains audio |
| `hasVoice` | Message contains voice note |
| `hasSticker` | Message contains sticker |
| `hasAnimation` | Message contains GIF |
| `hasLocation` | Message contains location |
| `hasContact` | Message contains contact |

### Message Properties

| Predicate | Description |
|-----------|-------------|
| `isForwarded` | Message is forwarded |
| `isReply` | Message is a reply |
| `isCallbackQuery` | Update is a callback query |
| `isInlineQuery` | Update is an inline query |

### Custom Predicates

| Factory | Description |
|---------|-------------|
| `isChat(...ids)` | Specific chat IDs |
| `hasTextContaining(str)` | Text or caption contains substring |

## Examples

```typescript
// Photos or videos from non-bots
bot.on('message', and(not(isBot), or(hasPhoto, hasVideo)), ctx => {
    ctx.reply('Media received from a real user.');
});

// VIP-only command
const VIP_IDS = [123456, 789012];
bot.command('vip', isUser(...VIP_IDS), ctx => {
    ctx.reply('Welcome, VIP!');
});

// Admin commands only in supergroups
bot.command('settings', and(isSupergroup, isAdmin()), ctx => {
    ctx.reply('Group settings panel.');
});
```

::: info
`isAdmin()` makes an API call to `getChatMember` — consider using the [API Cache](/security/caching) middleware to avoid redundant calls.
:::
