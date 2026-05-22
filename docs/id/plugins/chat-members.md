# Chat Members

`@vibegram/chat-members` menambahkan layer kecil untuk state member grup: cache lookup `getChatMember`, invalidasi dari update member Telegram, dan guard reusable untuk admin, owner, serta membership aktif.

Gunakan plugin ini saat command perlu dibatasi untuk administrator chat, saat pengecekan member berulang terlalu boros, atau saat bot perlu merespons perubahan membership tanpa menulis plumbing cache sendiri.

## Mapping Resmi Telegram

Plugin ini membungkus behavior berdasarkan data member resmi Telegram:

- `getChatMember` dipakai untuk lookup member.
- Status `ChatMember` seperti `creator`, `administrator`, `member`, `restricted`, `left`, dan `kicked` menentukan hasil guard.
- Update `chat_member` dan `my_chat_member` menghapus cache untuk user yang berubah statusnya.

Telegram hanya menjamin `getChatMember` untuk user lain jika bot adalah administrator di chat tersebut. Untuk production, jadikan bot sebagai admin sebelum bergantung pada guard admin atau membership untuk moderasi grup.

Referensi: [Telegram Bot API getChatMember](https://core.telegram.org/bots/api#getchatmember), [ChatMember](https://core.telegram.org/bots/api#chatmember), dan [Update](https://core.telegram.org/bots/api#update).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/chat-members
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/chat-members": "file:../vibegram/plugins/chat-members"
  }
}
```

## Penggunaan Minimal

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

Pasang `chatMembers()` sebelum guard agar middleware guard bisa memakai ulang `ctx.chatMembers` dan cache bersama.

## Behavior Cache

`chatMembers()` mendekorasi scoped client untuk update saat ini. Pemanggilan:

```typescript
await ctx.client.callApi('getChatMember', {
    chat_id: ctx.chat.id,
    user_id: ctx.from.id,
});
```

dan:

```typescript
await ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
```

memakai cache yang sama.

Store default adalah in-memory dan hanya berlaku untuk satu proses. Gunakan custom store jika kamu menjalankan beberapa proses bot atau perlu cache bertahan setelah restart.

```typescript
bot.use(chatMembers({
    ttlMs: 120_000,
    keyGenerator: (chatId, userId) => `members:${chatId}:${userId}`,
}));
```

## Invalidasi

Telegram mengirim `chat_member` saat status user berubah di chat dan `my_chat_member` saat status bot sendiri berubah. Plugin ini menghapus cache untuk `chat_id` dan `user_id` yang berubah sebelum middleware downstream berjalan.

Untuk long polling, sertakan tipe update member di `allowedUpdates` jika ingin invalidasi cepat:

```typescript
const bot = new Bot(token, {
    polling: {
        allowed_updates: ['message', 'chat_member', 'my_chat_member'],
    },
});
```

Jika tipe update ini tidak dikirim, nilai cache tetap akan kedaluwarsa melalui `ttlMs`.

## Guard

### Command Admin

```typescript
import { requireAdmin } from '@vibegram/chat-members';

bot.command('pin', requireAdmin(), async ctx => {
    await ctx.pinChatMessage(ctx.message.message_id);
});
```

`requireAdmin()` mengizinkan `creator` dan `administrator`.

### Command Owner

```typescript
import { requireOwner } from '@vibegram/chat-members';

bot.command('danger', requireOwner({
    onDenied: ctx => ctx.reply('Hanya owner chat yang bisa menjalankan command ini.'),
}), async ctx => {
    await ctx.reply('Aksi owner diterima.');
});
```

`requireOwner()` hanya mengizinkan Telegram `creator`.

### Guard Membership

```typescript
import { requireMembership } from '@vibegram/chat-members';

bot.use(requireMembership({
    onDenied: ctx => ctx.reply('Bergabung ke grup dulu sebelum memakai bot ini.'),
}));
```

User `restricted` dianggap member hanya saat `is_member !== false`.

## Options

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `ttlMs` | `number` | `60000` | TTL cache untuk lookup member |
| `store` | `ChatMemberStore` | `MemoryChatMemberStore` | Custom cache store |
| `keyGenerator` | `(chatId, userId) => string` | tuple JSON | Builder key cache |

Options guard:

| Option | Type | Default | Deskripsi |
| --- | --- | --- | --- |
| `allowPrivate` | `boolean` | `true` | Izinkan private chat tanpa memanggil Telegram |
| `onDenied` | `(ctx, reason, member?) => void \| Promise<void>` | none | Dipanggil saat guard memblokir update |
| `onError` | `(ctx, error) => void \| Promise<void>` | none | Dipanggil saat `getChatMember` gagal |

Reason denied adalah `missing_context`, `not_admin`, `not_owner`, `not_member`, dan `api_error`.

## TypeScript

Gunakan `ChatMembersFlavor` saat custom context membutuhkan `ctx.chatMembers`:

```typescript
import type { ChatMembersFlavor } from '@vibegram/chat-members';

type MyContext = ChatMembersFlavor<Context>;

async function check(ctx: MyContext) {
    const member = await ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
    return member.status;
}
```

Package juga mengekspor `TelegramChatMember`, `ChatMemberStore`, `ChatMembersManager`, `MemoryChatMemberStore`, `isOwner()`, `isAdministrator()`, dan `isMember()`.

## Failure Mode

- Jika `ctx.chat` atau `ctx.from` tidak ada, guard menolak dengan `missing_context`.
- Jika Telegram menolak atau timeout pada `getChatMember`, guard menolak dengan `api_error` dan memanggil `onError` jika disediakan.
- Jika bot bukan administrator, Telegram mungkin tidak mengembalikan data member untuk user lain. Anggap ini masalah setup operasional, bukan masalah cache.
- Cache in-memory hanya per proses; gunakan shared store jika beberapa worker menangani update.

## Catatan Keamanan

Jangan memakai data member yang di-cache terlalu lama untuk keputusan moderasi yang tidak mudah dibatalkan. Gunakan TTL pendek untuk flow sensitif admin dan aktifkan update `chat_member`/`my_chat_member` agar invalidasi lebih cepat.

Plugin ini tidak memberikan permission. Plugin hanya membaca state member Telegram dan memblokir eksekusi middleware jika state tidak memenuhi guard.

## Validasi

Package ini punya test untuk reuse cache, invalidasi update member, helper admin/owner, membership guard, handling API failure, dan typed context augmentation.

```bash
npm run plugins:validate
npm run docs:build
```
