# TypeScript Types

VibeGram exports TypeScript declarations for the main Telegram Bot API 10.1
objects, framework helpers, middleware options, and error classes.

```ts
import type { Update, Message, User, Chat, Context } from 'vibegram';
```

## Core Types

| Type | Description |
| --- | --- |
| `Update` | Incoming update from Telegram. |
| `Message` | Message payload. |
| `User` | Telegram user. |
| `Chat` | Compact chat identity from updates. |
| `ChatFullInfo` | Full chat metadata returned by `getChat`. |
| `CallbackQuery` | Inline button callback. |
| `InlineQuery` | Inline mode query. |
| `Context<S>` | Per-update handler context, optionally typed with session data. |

## Media Types

| Type | Description |
| --- | --- |
| `PhotoSize` | Photo metadata with dimensions. |
| `Audio` | Audio file. |
| `Document` | Generic file. |
| `Video` | Video file. |
| `Voice` | Voice note. |
| `VideoNote` | Circular video note. |
| `Animation` | GIF or H.264 animation. |
| `LivePhoto` | Bot API 10.0 live photo payload. |
| `Sticker` | Sticker metadata. |
| `Contact` | Shared contact. |
| `Location` | Geographic coordinates. |

## Interactive Types

| Type | Description |
| --- | --- |
| `Poll` | Poll or quiz payload. |
| `PollOption` | Single poll option. |
| `PollMedia` | Bot API 10.0 media attached to polls. |
| `Dice` | Animated dice result. |
| `Venue` | Venue with location. |
| `Game` | Telegram game payload. |
| `WebAppData` | Data sent from a Mini App. |

## Keyboard Types

| Type | Description |
| --- | --- |
| `ReplyMarkup` | Union of supported reply markup payloads. |
| `InlineKeyboardMarkup` | Inline keyboard layout. |
| `InlineKeyboardButton` | Inline keyboard button. |
| `ReplyKeyboardMarkup` | Native reply keyboard layout. |
| `KeyboardButton` | Native reply keyboard button. |
| `ReplyKeyboardRemove` | Remove keyboard payload. |
| `ForceReply` | Force reply payload. |

## Entity Types

| Type | Description |
| --- | --- |
| `MessageEntity` | Text entity such as command, link, bold, code, spoiler, or blockquote. |

Supported entity strings include `mention`, `hashtag`, `bot_command`, `url`,
`email`, `phone_number`, `bold`, `italic`, `underline`, `strikethrough`,
`spoiler`, `code`, `pre`, `text_link`, `text_mention`, `custom_emoji`,
`blockquote`, `expandable_blockquote`, and `date_time`.

## Update Types

| Type | Description |
| --- | --- |
| `ChatMemberUpdated` | Member status change. |
| `ChatJoinRequest` | Chat join request. |
| `ShippingQuery` | Payment shipping query. |
| `PreCheckoutQuery` | Payment pre-checkout query. |
| `ChatBoostUpdated` | Chat boost event. |
| `ChatBoostRemoved` | Removed chat boost event. |
| `PaidMediaPurchased` | Paid media purchase event. |

## Extra Types

Extra types describe optional request parameters for shortcut methods.

```ts
import type {
    ExtraReplyMessage,
    ExtraMedia,
    ExtraEditMessage,
    ExtraPoll,
    ExtraBanMember,
    ExtraRestrictMember,
    ExtraPromoteMember,
    ExtraInviteLink,
} from 'vibegram';
```

## State and Helper Types

```ts
import type {
    BotOptions,
    BotLaunchOptions,
    Middleware,
    NextFunction,
    SessionStore,
    RateLimitStore,
    UpdateDedupeStore,
} from 'vibegram';
```

Use these types when writing middleware, plugins, stores, or strongly typed bot
instances.

## Bot API 10.0 Types

| Type | Description |
| --- | --- |
| `SentGuestMessage` | Result returned by `answerGuestQuery`. |
| `BotAccessSettings` | Managed bot access settings. |
| `LivePhoto` | Live photo object returned in messages. |
| `InputMediaLivePhoto` | Live photo input media payload. |
| `PollMedia` | Media payload for polls and poll explanations. |
| `DeleteMessageReactionOptions` | Options for removing one message reaction. |
| `DeleteAllMessageReactionsOptions` | Options for removing recent reactions. |
| `SendLivePhotoOptions` | Extra options for `sendLivePhoto`. |

## Bot API 10.1 Types

### Rich Messages

| Type | Description |
| --- | --- |
| `RichMessage` | Rich formatted message (`blocks` + optional `is_rtl`). |
| `InputRichMessage` | Rich message to send; use exactly one of `html` or `markdown`. |
| `InputRichMessageContent` | Rich message content for inline query results. |
| `RichText` | Plain string, array of `RichText`, or a `RichText*` element. |
| `RichBlock` | Union of rich block types such as paragraph, heading, table, and photo. |
| `RichBlockCaption` | Caption (`text` + optional `credit`) for media blocks. |
| `RichBlockTableCell` | A cell in a `RichBlockTable`. |
| `RichBlockListItem` | An item in a `RichBlockList`. |

The inline `RichText*` and block `RichBlock*` types are exported individually
for fine-grained typing.

### Join Request Queries and Polls

| Type | Description |
| --- | --- |
| `ChatJoinRequestQueryResult` | `'approve' \| 'decline' \| 'queue'` result for `answerChatJoinRequestQuery`. |
| `Link` | HTTP link object (`url`). |
| `InputMediaLink` | Link media usable as poll option media. |

New fields on existing types include `User.supports_join_request_queries`,
`ChatFullInfo.guard_bot`, `ChatJoinRequest.query_id`, and
`Message.rich_message`.

## Pagination Interfaces

```ts
import type { PaginationItem, PaginationOptions } from 'vibegram';

const item: PaginationItem = {
    text: 'Product',
    callback_data: 'product:1',
};
```

`PaginationOptions` configures page number, page size, navigation callback data,
optional page label pattern, and optional grid columns.

## Session Interfaces

```ts
import type { SessionStore } from 'vibegram';

class RedisSessionStore implements SessionStore {
    async get(key: string) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : undefined;
    }

    async set(key: string, value: unknown) {
        await redis.set(key, JSON.stringify(value));
    }

    async delete(key: string) {
        await redis.del(key);
    }
}
```

Use `MemorySessionStore` for local in-memory storage or implement
`SessionStore` for Redis, SQL, or another external store.

## Typed Sessions

```ts
type MySession = {
    count: number;
    language: string;
};

bot.use(
    session<MySession>({
        initial: () => ({ count: 0, language: 'en' }),
    })
);
```

Typing the session middleware makes `ctx.session` strongly typed in downstream
handlers.

## Extending Context

```ts
import type { Context } from 'vibegram';

interface AppContext extends Context<MySession> {
    user?: { id: string; role: 'admin' | 'member' };
}

const bot = new Bot<AppContext>(process.env.BOT_TOKEN!);
```

Use a custom context type when middleware attaches application-specific data.

## Error Types

```ts
import {
    ConversationTimeoutError,
    InvalidTokenError,
    NetworkError,
    RateLimitError,
    TelegramApiError,
    VibeGramError,
    WebAppValidationError,
} from 'vibegram';
```

Catch specific subclasses when the recovery behavior differs by error category.
