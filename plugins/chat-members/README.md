# @vibegram/chat-members

Chat member cache and guard middleware for VibeGram bots.

Use this package for group bots that need cached `getChatMember` lookups, admin-only commands, owner-only commands, and membership checks.

## Install

```bash
npm install vibegram @vibegram/chat-members
```

Until the package is published, consume it from this repository as a local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/chat-members": "file:../vibegram/plugins/chat-members"
  }
}
```

## Usage

```typescript
import { Bot } from 'vibegram';
import { chatMembers, requireAdmin } from '@vibegram/chat-members';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(chatMembers({ ttlMs: 60_000 }));

bot.command('ban', requireAdmin(), async ctx => {
    const userId = Number(ctx.command?.args[0]);
    await ctx.banChatMember(userId);
    await ctx.reply('User banned.');
});
```

Install `chatMembers()` before guards so `requireAdmin()`, `requireOwner()`, and `requireMembership()` can reuse the shared cache.

## Exports

| Export | Purpose |
| --- | --- |
| `chatMembers(options?)` | Middleware that caches `getChatMember` and adds `ctx.chatMembers` |
| `requireAdmin(options?)` | Guard for chat owners and administrators |
| `requireOwner(options?)` | Guard for chat owners only |
| `requireMembership(options?)` | Guard for active chat members |
| `MemoryChatMemberStore` | Default in-memory TTL cache store |
| `isOwner(member)` | Predicate for `creator` members |
| `isAdministrator(member)` | Predicate for `creator` or `administrator` members |
| `isMember(member)` | Predicate for active non-left/non-kicked members |
| `defaultChatMemberKey(chatId, userId)` | Default cache key helper |

## Options

| Option | Default | Description |
| --- | --- | --- |
| `ttlMs` | `60000` | Cache TTL for `getChatMember` results |
| `store` | `MemoryChatMemberStore` | Custom store with `get`, `set`, and `delete` |
| `keyGenerator` | JSON tuple | Custom cache key for `chat_id` + `user_id` |

Guard options:

| Option | Default | Description |
| --- | --- | --- |
| `allowPrivate` | `true` | Allow private chats without calling `getChatMember` |
| `onDenied` | none | Called when a user is missing context or lacks the required role |
| `onError` | none | Called when Telegram API lookup fails |

## Telegram Notes

This plugin uses the official `getChatMember` method and invalidates cache entries from `chat_member` and `my_chat_member` updates.

For other users in groups, Telegram only guarantees `getChatMember` when the bot is an administrator in the chat. Guard failures are safe by default: they do not call `next()` when Telegram lookup fails.

Reference: [Telegram Bot API getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMember](https://core.telegram.org/bots/api#chatmember), and [Update](https://core.telegram.org/bots/api#update).

## Validation

```bash
npm run typecheck
npm test
npm run build
```
