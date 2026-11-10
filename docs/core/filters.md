# Filter Combinators

A **filter** (or predicate) is a function that looks at `ctx` and answers yes or no:
"is this a private chat?", "does the message have a photo?", "is the sender an
admin?". VibeGram ships 20+ ready-made filters and three combinators, `and()`,
`or()`, and `not()`, to build bigger conditions from small ones.

```typescript
import {
    Bot,
    and,
    or,
    not,
    isAdmin,
    isBot,
    isPrivate,
    isUser,
    hasDocument,
    hasPhoto,
    hasVideo,
} from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

// Photos or videos sent by people (not bots) in private chats.
const mediaFromPeople = and(isPrivate, not(isBot), or(hasPhoto, hasVideo));

bot.filter(mediaFromPeople, ctx => ctx.reply('Nice media!'));
```

## Which Tool to Use

VibeGram has three ways to run a handler only for some updates. Pick the simplest
one that fits:

| You want to match | Use | Example |
| --- | --- | --- |
| An update or message **type** | [Filter query](/core/handling#filter-queries) | `bot.on('message:photo', ...)` |
| A **condition** about the chat, user, or content | `bot.filter(predicate, ...)` | `bot.filter(isPrivate, ...)` |
| A condition **in front of one handler** | An inline filter | `bot.command('ban', isAdmin(), ...)` |

Filter queries also narrow TypeScript types (`ctx.message.photo` is guaranteed), so
prefer them for "what kind of message is this". Use the predicates on this page for
everything else.

## Inline Filters Stop the Update

A filter placed directly in a handler's argument list works like a gate. When it
fails, **the update stops there** and later handlers never see it:

```typescript
bot.command('ban', isAdmin(), ctx => ctx.reply('Banned.'));
bot.command('ban', ctx => ctx.reply('Only admins can ban.')); // never reached
```

`bot.filter()` instead lets the update **continue** to the next handler when the
predicate fails, which is usually what you want for routing:

```typescript
bot.filter(isAdmin(), ctx => ctx.reply('Admin panel'));
bot.use(ctx => ctx.reply('You are not an admin.')); // runs for everyone else
```

## Combinators

| Function | Passes when |
| --- | --- |
| `and(...filters)` | Every filter passes |
| `or(...filters)` | At least one filter passes |
| `not(filter)` | The filter fails |

Combinators nest freely, and the result works both as an inline filter and inside
`bot.filter()`, `guard()`, or another combinator:

```typescript
const vipMedia = and(isUser(111, 222), or(hasPhoto, hasVideo, hasDocument));

bot.on('message', vipMedia, ctx => ctx.reply('VIP upload received.'));
bot.filter(not(vipMedia), ctx => ctx.reply('Uploads are for VIP members.'));
```

## Built-in Predicates

### Chat Type

| Predicate | Passes for |
| --- | --- |
| `isPrivate` | Private (one-to-one) chats |
| `isGroup` | Groups and supergroups |
| `isSupergroup` | Supergroups only |
| `isChannel` | Channel posts |

### Sender

| Predicate | Passes for |
| --- | --- |
| `isBot` | Messages sent by a bot |
| `isHuman` | Messages sent by a person |
| `isUser(...ids)` | The listed user ids |
| `isAdmin()` | Chat admins and the owner (always true in private chats) |

### Content

| Predicate | Passes when the message has |
| --- | --- |
| `hasText` | Text |
| `hasPhoto` | A photo |
| `hasDocument` | A document (file) |
| `hasVideo` | A video |
| `hasAudio` | An audio file |
| `hasVoice` | A voice note |
| `hasSticker` | A sticker |
| `hasAnimation` | A GIF |
| `hasLocation` | A location |
| `hasContact` | A shared contact |

### Message and Update

| Predicate | Passes when |
| --- | --- |
| `isForwarded` | The message is forwarded |
| `isReply` | The message replies to another message |
| `isCallbackQuery` | The update is a button press |
| `isInlineQuery` | The update is an inline query |

### Factories

| Factory | Passes when |
| --- | --- |
| `isChat(...ids)` | The update comes from one of the listed chat ids |
| `hasTextContaining(text)` | The text or caption contains `text` (case-insensitive) |
| `toFilter(predicate)` | Your own predicate passes (makes it usable inline) |

## Writing Your Own Filter

Any function `(ctx) => boolean` (or a `Promise<boolean>`) is a filter, so it combines
with the built-in ones:

```typescript
import type { Context } from 'vibegram';

const isWorkingHours = (ctx: Context) => {
    const hour = new Date().getUTCHours();
    return hour >= 8 && hour < 17;
};

bot.filter(and(isPrivate, not(isWorkingHours)), ctx =>
    ctx.reply('We are offline right now. We answer between 08:00 and 17:00 UTC.')
);
```

To place your own predicate **inline** in a handler list, wrap it with `toFilter()`.
Built-in filters and combinators are already wrapped. A bare `(ctx) => boolean` used
inline never calls `next()`, so the handler would never run:

```typescript
import { toFilter } from 'vibegram';

const workingHours = toFilter(isWorkingHours);
bot.command('support', workingHours, ctx => ctx.reply('An agent will reply shortly.'));
```

A type-guard filter (`(ctx): ctx is MyContext => ...`) also narrows `ctx` inside
`bot.filter()` and `guard()`.

::: tip `isAdmin()` calls the Bot API
`isAdmin()` asks Telegram for the sender's member status on every update it checks.
In busy groups, cache it with the [`@vibegram/chat-members`](/plugins/chat-members)
plugin or the [API cache](/security/caching).
:::
