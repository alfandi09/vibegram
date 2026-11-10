# Draft Messages (Bot API 9.5)

<ApiMethodCard title="Draft messages" endpoint="sendMessageDraft" since="Bot API 9.5" returns="true" method="API">
  Show a message while it is still being written, then replace it with the final one.
</ApiMethodCard>

A draft is a **temporary preview** of a message that is still being written. Each time
you send new text with the same `draft_id`, Telegram updates the preview in place, so the
user sees the answer "typing" itself out. It is made for streaming long answers, such as
AI replies, in **private chats**.

A draft is not a real message: it disappears after about 30 seconds without an update
and is never stored in the chat history. When the text is complete, send it with
`ctx.reply()`.

::: tip Streaming AI answers
For AI output, [ReplyStreamer](/advanced/streaming) does all of this for you: it
throttles updates, uses drafts in private chats, falls back to message edits in groups,
and sends the final message.
:::

## Quick Start

```typescript
bot.command('count', async ctx => {
    const draft_id = Date.now() % 2 ** 31; // any non-zero number, reused for every update

    for (const step of ['One', 'One, two', 'One, two, three']) {
        await ctx.replyWithDraft(step, { draft_id });
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    await ctx.reply('One, two, three!'); // the real, permanent message
});
```

Three rules make it work:

1. **Reuse one `draft_id`** for the whole answer. A new id starts a new preview.
2. **Send the full text so far** every time, not just the newest piece.
3. **Finish with `ctx.reply()`**. Without it the user is left with nothing once the
   preview expires.

## Streaming a Generated Answer

```typescript
bot.command('ask', async ctx => {
    const question = ctx.command?.args?.join(' ') || 'Tell me a joke';
    const draft_id = Date.now() % 2 ** 31;
    let answer = '';
    let lastUpdate = 0;

    for await (const chunk of generateAnswer(question)) {
        answer += chunk;
        // Update at most twice a second to stay well inside rate limits.
        if (Date.now() - lastUpdate > 500) {
            await ctx.replyWithDraft(answer, { draft_id });
            lastUpdate = Date.now();
        }
    }

    await ctx.reply(answer);
});
```

`generateAnswer` stands for any async iterator of text, for example an AI SDK's stream.

## Options

| Option         | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `draft_id`     | Identifies the preview. Generated randomly when omitted (one-off draft) |
| `can_stop`     | Shows a stop button so the user can cancel the answer                  |
| `keep_on_stop` | Keeps the partial text as a message when the user presses stop        |
| `parse_mode`, `entities` | Formatting, as for `ctx.reply()`                            |

## Limitations

- Private chats only. In groups, send a message and edit it instead (ReplyStreamer
  does this automatically).
- The preview is temporary (about 30 seconds after the last update) and is not saved.
- `ctx.replyWithDraft()` needs a chat, so it does not work in inline-query handlers.
