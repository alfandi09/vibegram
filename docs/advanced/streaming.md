# AI Streaming

`ReplyStreamer` streams generated text, such as LLM tokens, into Telegram. In private
chats the answer appears live through message drafts (`sendMessageDraft`) with a
**stop** button (Bot API 10.3); when the stream ends, the full text is sent as a normal
message. In groups, where drafts are not available, only the final message is sent.

It works with any model provider: pass an `AsyncIterable<string>` of text chunks.

```typescript
import { Bot, ReplyStreamer } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const streams = new ReplyStreamer();

bot.use(streams.middleware()); // handles the stop button

bot.on('message:text', ctx => {
    // Not awaited, so long polling can deliver the stop-button update meanwhile.
    streams
        .reply(ctx, generateAnswer(ctx.message.text), { parseMode: 'HTML' })
        .catch(error => console.error('Streaming failed', error));
});

// Any async generator of text deltas works, e.g. mapped from an SDK stream.
async function* generateAnswer(prompt: string): AsyncGenerator<string> {
    for await (const chunk of myModel.stream(prompt)) {
        if (chunk.text) yield chunk.text;
    }
}
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `throttleMs` | `400` | Minimum delay between draft updates. |
| `canStop` | `true` | Show the stop button under the draft. |
| `onStop` | `'send'` | `'send'` delivers the partial text; `'discard'` sends nothing. |
| `parseMode` | — | Parse mode for the final message(s). Drafts are plain text. |
| `extra` | — | Extra parameters for the final message(s); `reply_markup` goes on the last one. |
| `signal` | — | `AbortSignal` to stop from outside (for example a timeout). |
| `draftId` | random | Fixed draft id. |

`reply()` resolves with `{ text, stopped, messages }`. When the user presses stop,
the source iterator is closed with `return()`, which lets SDKs cancel the request.
Answers longer than 4096 characters are split on paragraph, line, or word boundaries
(`splitMessageText()` is exported too).

::: warning Long polling and the stop button
With the default long polling, updates are handled one at a time. If the handler
awaits `streams.reply()`, the stop-button update waits until the stream finishes.
Start the stream without awaiting it (as above), use webhooks, or use the
`@vibegram/runner` plugin for concurrent polling.
:::

## Timeouts

```typescript
await streams.reply(ctx, generateAnswer(prompt), { signal: AbortSignal.timeout(60_000) });
```

## Scaffold an AI bot

```bash
npm create vibegram@latest my-ai-bot -- --template ai-bot
```
