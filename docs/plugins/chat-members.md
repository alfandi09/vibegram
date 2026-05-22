# Chat Members

`@vibegram/chat-members` adds a small member-state layer for group bots: cached `getChatMember` lookups, invalidation from Telegram member updates, and reusable guards for admin, owner, and active membership checks.

Use it when commands should be limited to chat administrators, when repeated member checks are too noisy, or when a bot needs to react to membership changes without writing cache plumbing by hand.

## Official Telegram Mapping

This plugin wraps behavior around official Telegram member data:

- `getChatMember` is used for member lookups.
- `ChatMember` status values such as `creator`, `administrator`, `member`, `restricted`, `left`, and `kicked` decide guard results.
- `chat_member` and `my_chat_member` updates invalidate cached entries for the changed user.

Telegram only guarantees `getChatMember` for other users when the bot is an administrator in the chat. In production, make the bot admin before relying on admin or membership guards for group moderation.

Reference: [Telegram Bot API getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMember](https://core.telegram.org/bots/api#chatmember), and [Update](https://core.telegram.org/bots/api#update).

## Install

When this official plugin package is published, install it from npm:

```bash
npm install vibegram @vibegram/chat-members
```

Today, use the repository package as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/chat-members": "file:../vibegram/plugins/chat-members"
  }
}
```

## Minimal Usage

```typescript
import { Bot } from 'vibegram';
import { chatMembers, requireAdmin } from '@vibegram/chat-members';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Bot(token, {
    polling: {
        allowed_updates: ['message', 'chat_member', 'my_chat_member'],
    },
});

bot.use(chatMembers({ ttlMs: 60_000 }));

bot.command('ban', requireAdmin(), async ctx => {
    const userId = Number(ctx.command?.args[0]);
    if (!Number.isInteger(userId)) {
        await ctx.reply('Usage: /ban <user_id>');
        return;
    }

    await ctx.banChatMember(userId);
    await ctx.reply('User banned.');
});

await bot.launch();
```

Install `chatMembers()` before guards so guard middleware can reuse `ctx.chatMembers` and the shared cache.

## Cache Behavior

`chatMembers()` decorates the current update's scoped client. Calls to:

```typescript
await ctx.client.callApi('getChatMember', {
    chat_id: ctx.chat.id,
    user_id: ctx.from.id,
});
```

and:

```typescript
await ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
```

share the same cache.

The default store is in-memory and scoped to the process. Use a custom store if you run multiple bot processes or need cache state to survive restarts.

```typescript
bot.use(chatMembers({
    ttlMs: 120_000,
    keyGenerator: (chatId, userId) => `members:${chatId}:${userId}`,
}));
```

## Invalidation

Telegram sends `chat_member` when a user changes status in a chat and `my_chat_member` when the bot's own member status changes. This plugin invalidates the cache key for the changed `chat_id` and `user_id` before downstream middleware runs.

For long polling, include the member update types in `allowedUpdates` if you want fast invalidation:

```typescript
const bot = new Bot(token, {
    polling: {
        allowed_updates: ['message', 'chat_member', 'my_chat_member'],
    },
});
```

If these update types are not delivered, cached values still expire through `ttlMs`.

## Guards

### Admin Commands

```typescript
import { requireAdmin } from '@vibegram/chat-members';

bot.command('pin', requireAdmin(), async ctx => {
    await ctx.pinChatMessage(ctx.message.message_id);
});
```

`requireAdmin()` allows `creator` and `administrator`.

### Owner Commands

```typescript
import { requireOwner } from '@vibegram/chat-members';

bot.command('danger', requireOwner({
    onDenied: ctx => ctx.reply('Only the chat owner can run this command.'),
}), async ctx => {
    await ctx.reply('Owner action accepted.');
});
```

`requireOwner()` only allows Telegram `creator`.

### Membership Guard

```typescript
import { requireMembership } from '@vibegram/chat-members';

bot.use(requireMembership({
    onDenied: ctx => ctx.reply('Join the group before using this bot.'),
}));
```

`restricted` users are considered members only when `is_member !== false`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ttlMs` | `number` | `60000` | Cache TTL for member lookups |
| `store` | `ChatMemberStore` | `MemoryChatMemberStore` | Custom cache store |
| `keyGenerator` | `(chatId, userId) => string` | JSON tuple | Cache key builder |

Guard options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowPrivate` | `boolean` | `true` | Allow private chats without calling Telegram |
| `onDenied` | `(ctx, reason, member?) => void \| Promise<void>` | none | Called when the guard blocks the update |
| `onError` | `(ctx, error) => void \| Promise<void>` | none | Called when `getChatMember` fails |

Denied reasons are `missing_context`, `not_admin`, `not_owner`, `not_member`, and `api_error`.

## TypeScript

Use `ChatMembersFlavor` when a custom context type needs `ctx.chatMembers`:

```typescript
import type { ChatMembersFlavor } from '@vibegram/chat-members';

type MyContext = ChatMembersFlavor<Context>;

async function check(ctx: MyContext) {
    const member = await ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
    return member.status;
}
```

The package also exports `TelegramChatMember`, `ChatMemberStore`, `ChatMembersManager`, `MemoryChatMemberStore`, `isOwner()`, `isAdministrator()`, and `isMember()`.

## Failure Modes

- If `ctx.chat` or `ctx.from` is missing, guards deny with `missing_context`.
- If Telegram rejects or times out on `getChatMember`, guards deny with `api_error` and call `onError` when provided.
- If the bot is not an administrator, Telegram may not return member data for other users. Treat this as an operational setup issue, not a cache issue.
- In-memory cache is per process; use a shared store when multiple workers handle updates.

## Security Notes

Do not use cached member data for irreversible moderation decisions with a very long TTL. Keep TTL short for admin-sensitive flows and enable `chat_member`/`my_chat_member` updates for faster invalidation.

The plugin does not grant permissions. It only reads Telegram member state and blocks middleware execution when the state does not satisfy the guard.

## Validation

The package includes tests for cache reuse, member-update invalidation, admin/owner helpers, membership guards, API failure handling, and typed context augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
