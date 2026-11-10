import { describe, expect, it } from 'vitest';
import { Bot } from '../src/bot';
import { Rich } from '../src/rich';
import { ReplyStreamer, splitMessageText, type StreamReplyResult } from '../src/stream';
import { createTestBot } from '../src/testing';

async function* tokens(parts: string[], delayMs = 0): AsyncGenerator<string> {
    for (const part of parts) {
        if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
        yield part;
    }
}

function setup(chat?: { id: number; type: 'private' | 'group'; title?: string }) {
    const bot = new Bot('123:abc');
    const streams = new ReplyStreamer();
    bot.use(streams.middleware());
    const t = createTestBot(bot, chat ? { chat } : {});
    return { bot, streams, t };
}

describe('splitMessageText', () => {
    it('keeps short text intact and splits long text on natural boundaries', () => {
        expect(splitMessageText('hello')).toEqual(['hello']);
        expect(splitMessageText('')).toEqual(['']);

        const paragraph = 'word '.repeat(30).trim();
        const chunks = splitMessageText(`${paragraph}\n\n${paragraph}`, 160);
        expect(chunks).toEqual([paragraph, paragraph]);
        expect(chunks.every(chunk => chunk.length <= 160)).toBe(true);

        expect(splitMessageText('x'.repeat(25), 10)).toEqual([
            'x'.repeat(10),
            'x'.repeat(10),
            'x'.repeat(5),
        ]);
        expect(() => splitMessageText('a', 0)).toThrow(TypeError);
    });
});

describe('ReplyStreamer', () => {
    it('streams drafts in private chats, then sends the final message', async () => {
        const { bot, streams, t } = setup();
        let result: StreamReplyResult | undefined;
        bot.on(':text', async ctx => {
            result = await streams.reply(ctx, tokens(['Hel', 'lo', ' world']), {
                throttleMs: 0,
                parseMode: 'HTML',
            });
        });

        await t.sendText('hi');

        const drafts = t.callsOf('sendMessageDraft').map(call => call.payload);
        expect(drafts.map(d => d.text)).toEqual(['Hel', 'Hello', 'Hello world']);
        expect(new Set(drafts.map(d => d.draft_id)).size).toBe(1);
        expect(drafts[0]).toMatchObject({ chat_id: 1001, can_stop: true });

        expect(t.lastCall('sendMessage')?.payload).toMatchObject({
            text: 'Hello world',
            parse_mode: 'HTML',
        });
        expect(result).toMatchObject({ text: 'Hello world', stopped: false });
        expect(result?.messages).toHaveLength(1);
        expect(streams.activeCount).toBe(0);
    });

    it('throttles draft updates', async () => {
        const { bot, streams, t } = setup();
        bot.on(':text', ctx =>
            streams.reply(ctx, tokens(['a', 'b', 'c', 'd']), { throttleMs: 60_000 }).then(() => {})
        );
        await t.sendText('hi');
        expect(t.callsOf('sendMessageDraft')).toHaveLength(1);
        expect(t.lastCall('sendMessage')?.payload.text).toBe('abcd');
    });

    it('skips drafts outside private chats', async () => {
        const { bot, streams, t } = setup({ id: -5, type: 'group', title: 'G' });
        bot.on(':text', ctx =>
            streams.reply(ctx, tokens(['x', 'y']), { throttleMs: 0 }).then(() => {})
        );
        await t.sendText('hi');
        expect(t.callsOf('sendMessageDraft')).toHaveLength(0);
        expect(t.lastCall('sendMessage')?.payload).toMatchObject({ chat_id: -5, text: 'xy' });
    });

    it('stops on the draft stop button and closes the source', async () => {
        const { bot, streams, t } = setup();
        let closed = false;
        async function* endless() {
            try {
                let i = 0;
                while (true) {
                    await new Promise(resolve => setTimeout(resolve, 5));
                    yield `t${i++} `;
                }
            } finally {
                closed = true;
            }
        }

        let running!: Promise<StreamReplyResult>;
        bot.on(':text', ctx => {
            running = streams.reply(ctx, endless(), { throttleMs: 0, draftId: 77 });
        });

        await t.sendText('go');
        await new Promise(resolve => setTimeout(resolve, 30));
        await t.sendUpdate({
            stopped_message_generation: { chat: { id: 1001, type: 'private' }, draft_id: 77 },
        });
        const result = await running;

        expect(result.stopped).toBe(true);
        expect(closed).toBe(true);
        expect(result.text).toMatch(/^t0 /);
        expect(t.lastCall('sendMessage')?.payload.text).toBe(result.text);
    });

    it('discards partial text on stop when onStop is discard', async () => {
        const { bot, streams, t } = setup();
        const controller = new AbortController();
        let result!: StreamReplyResult;
        bot.on(':text', async ctx => {
            controller.abort();
            result = await streams.reply(ctx, tokens(['never']), {
                onStop: 'discard',
                signal: controller.signal,
            });
        });
        await t.sendText('go');
        expect(result).toEqual({ text: '', stopped: true, messages: [] });
        expect(t.callsOf('sendMessage')).toHaveLength(0);
    });

    it('splits long output and attaches reply_markup to the last message only', async () => {
        const { bot, streams, t } = setup();
        const long = `${'a'.repeat(4000)}\n\n${'b'.repeat(200)}`;
        bot.on(':text', ctx =>
            streams
                .reply(ctx, tokens([long]), {
                    throttleMs: 0,
                    extra: {
                        reply_markup: { inline_keyboard: [[{ text: 'ok', callback_data: 'ok' }]] },
                    },
                })
                .then(() => {})
        );
        await t.sendText('go');

        const sent = t.callsOf('sendMessage').map(call => call.payload);
        expect(sent).toHaveLength(2);
        expect(sent[0].reply_markup).toBeUndefined();
        expect(sent[1].reply_markup).toBeDefined();
        expect(t.lastCall('sendMessageDraft')?.payload.text.length).toBeLessThanOrEqual(4096);
    });

    it('keeps sending the final message when drafts fail', async () => {
        const { bot, streams, t } = setup();
        t.stub('sendMessageDraft', () => {
            throw new Error('drafts unavailable');
        });
        bot.on(':text', ctx =>
            streams.reply(ctx, tokens(['a', 'b']), { throttleMs: 0 }).then(() => {})
        );
        await t.sendText('go');
        expect(t.callsOf('sendMessageDraft')).toHaveLength(1);
        expect(t.lastCall('sendMessage')?.payload.text).toBe('ab');
    });

    it('passes through unrelated stop updates', async () => {
        const bot = new Bot('123:abc');
        const streams = new ReplyStreamer();
        let fallthrough = 0;
        bot.use(streams.middleware());
        bot.on('stopped_message_generation', () => void fallthrough++);
        const t = createTestBot(bot);
        await t.sendUpdate({
            stopped_message_generation: { chat: { id: 1, type: 'private' }, draft_id: 1 },
        });
        expect(fallthrough).toBe(1);
        expect(streams.stop(1, 1)).toBe(false);
    });
});

describe('Rich builder', () => {
    it('builds block-based rich messages', () => {
        const url = 'https://example.com';
        const message = Rich.message()
            .heading('Release', 1)
            .paragraph(['Now ', Rich.bold('rich'), ' ', Rich.link('docs', url)])
            .list(['Fast', [{ type: 'paragraph', text: 'Typed' }]])
            .orderedList(['one', 'two'], 'i')
            .checklist([
                ['done', true],
                ['todo', false],
            ])
            .table(
                [
                    ['Plan', 'Price'],
                    ['Pro', '$5'],
                ],
                { header: true, compact: true }
            )
            .buttons([{ text: 'Open', url }], 'center')
            .code('npm i vibegram', 'bash')
            .expandableQuote('Long story', 'Me')
            .photo('photo-file-id', 'Cover')
            .divider()
            .rightToLeft()
            .build();

        expect(message.is_rtl).toBe(true);
        expect(message.blocks?.map(block => block.type)).toEqual([
            'heading',
            'paragraph',
            'list',
            'list',
            'list',
            'table',
            'buttons',
            'pre',
            'expandable_blockquote',
            'photo',
            'divider',
        ]);
        expect(message.blocks?.[2]).toEqual({
            type: 'list',
            items: [
                { blocks: [{ type: 'paragraph', text: 'Fast' }] },
                { blocks: [{ type: 'paragraph', text: 'Typed' }] },
            ],
        });
        expect(message.blocks?.[3]).toMatchObject({
            items: [
                { value: 1, type: 'i' },
                { value: 2, type: 'i' },
            ],
        });
        expect(message.blocks?.[4]).toMatchObject({
            items: [{ has_checkbox: true, is_checked: true }, { has_checkbox: true }],
        });
        expect(message.blocks?.[5]).toMatchObject({
            is_compact: true,
            cells: [
                [
                    { text: 'Plan', is_header: true },
                    { text: 'Price', is_header: true },
                ],
                [{ text: 'Pro' }, { text: '$5' }],
            ],
        });
        expect(message.blocks?.[9]).toEqual({
            type: 'photo',
            photo: { type: 'photo', media: 'photo-file-id' },
            caption: { text: 'Cover' },
        });
    });

    it('validates button rows and empty messages', () => {
        expect(() => Rich.message().buttons([])).toThrow(RangeError);
        expect(() =>
            Rich.message().buttons(Array(9).fill({ text: 'x', url: 'https://x' }))
        ).toThrow(RangeError);
        expect(() => Rich.message().build()).toThrow(/at least one block/);
    });

    it('provides inline helpers', () => {
        expect(Rich.mention('Alice', '@alice')).toEqual({
            type: 'mention',
            text: 'Alice',
            username: 'alice',
        });
        expect(Rich.customEmoji('123', '🔥')).toEqual({
            type: 'custom_emoji',
            custom_emoji_id: '123',
            alternative_text: '🔥',
        });
        expect(Rich.button({ text: 'Go', callback_data: 'go' })).toEqual({
            type: 'button',
            button: { text: 'Go', callback_data: 'go' },
        });
    });

    it('works with ctx.replyWithRichMessage', async () => {
        const bot = new Bot('123:abc');
        bot.command('news', ctx =>
            ctx.replyWithRichMessage(Rich.message().heading('News').build()).then(() => {})
        );
        const t = createTestBot(bot);
        await t.sendCommand('news');
        expect(t.lastCall('sendRichMessage')?.payload.rich_message).toEqual({
            blocks: [{ type: 'heading', text: 'News', size: 2 }],
        });
    });
});
