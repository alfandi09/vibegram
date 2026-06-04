# TypeScript Types

VibeGram provides 32+ TypeScript interfaces for type-safe development and targets Telegram Bot API v10.0. All types are exported from the main package.

```typescript
import { Update, Message, User, Chat, ChatFullInfo, CallbackQuery, ... } from 'vibegram';
```

## Core Types

| Interface       | Description                              |
| --------------- | ---------------------------------------- |
| `Update`        | Incoming update from Telegram            |
| `Message`       | A message object                         |
| `User`          | A Telegram user                          |
| `Chat`          | Compact chat identity from updates       |
| `ChatFullInfo`  | Full chat metadata returned by `getChat` |
| `CallbackQuery` | Inline button callback                   |
| `InlineQuery`   | Inline mode query                        |

## Media Types

| Interface   | Description                     |
| ----------- | ------------------------------- |
| `PhotoSize` | Photo with dimensions           |
| `Audio`     | Audio file (music)              |
| `Document`  | General file                    |
| `Video`     | Video file                      |
| `Voice`     | Voice note (OGG/Opus)           |
| `VideoNote` | Circular video message          |
| `Animation` | GIF or H.264 animation          |
| `LivePhoto` | Bot API 10.0 live photo payload |
| `Sticker`   | Sticker with emoji and set info |
| `Contact`   | Phone contact                   |
| `Location`  | Geographic coordinates          |

## Interactive Types

| Interface    | Description                        |
| ------------ | ---------------------------------- |
| `Poll`       | Poll with options and settings     |
| `PollOption` | Single poll option                 |
| `PollMedia`  | Bot API 10.0 media attached to polls |
| `Dice`       | Animated dice with emoji and value |
| `Venue`      | Venue with location                |
| `Game`       | Game object                        |
| `WebAppData` | Data sent from Mini App            |

## Keyboard Types

| Interface              | Description            |
| ---------------------- | ---------------------- |
| `InlineKeyboardButton` | Inline keyboard button |
| `InlineKeyboardMarkup` | Inline keyboard layout |
| `ChatPermissions`      | Chat permission flags  |

## Entity Types

| Interface       | Description                             |
| --------------- | --------------------------------------- |
| `MessageEntity` | Text entity (bold, link, command, etc.) |

Supported entity types: `mention`, `hashtag`, `cashtag`, `bot_command`, `url`, `email`, `phone_number`, `bold`, `italic`, `underline`, `strikethrough`, `spoiler`, `code`, `pre`, `text_link`, `text_mention`, `custom_emoji`, `blockquote`, `expandable_blockquote`, `date_time`

## Update Types

| Interface           | Description            |
| ------------------- | ---------------------- |
| `ChatMemberUpdated` | Member status change   |
| `ChatJoinRequest`   | Join request           |
| `ShippingQuery`     | Payment shipping query |
| `PreCheckoutQuery`  | Payment pre-checkout   |
| `ChatBoostUpdated`  | Chat boost event       |
| `ChatBoostRemoved`  | Chat boost removed     |

## Extra Types (Request Parameters)

| Interface           | Description                      |
| ------------------- | -------------------------------- |
| `ExtraReplyMessage` | Options for text messages        |
| `ExtraMedia`        | Options for media messages       |
| `ExtraEditMessage`  | Options for editing messages     |
| `BotOptions`        | Bot constructor options          |
| `UpdateType`        | Union of all update type strings |

## Bot API 10.0 Types

| Type | Description |
| --- | --- |
| `SentGuestMessage` | Result returned by `answerGuestQuery` |
| `BotAccessSettings` | Managed bot access settings |
| `LivePhoto` | Live photo object returned in messages |
| `InputMediaLivePhoto` | Live photo input media payload |
| `PollMedia` | Media payload for polls and poll explanations |
| `DeleteMessageReactionOptions` | Options for removing one message reaction |
| `DeleteAllMessageReactionsOptions` | Options for removing recent reactions |
| `SendLivePhotoOptions` | Extra options for `sendLivePhoto` |
