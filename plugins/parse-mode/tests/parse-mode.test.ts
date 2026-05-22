import { describe, expect, it, vi } from 'vitest';

import {
    bold,
    code,
    escapeHtml,
    escapeMarkdownV2,
    fmt,
    italic,
    link,
    markdownBold,
    markdownCode,
    markdownFmt,
    markdownLink,
    parseMode,
} from '../src/index';

describe('@vibegram/parse-mode', () => {
    it('should escape unsafe HTML interpolation while preserving formatter output', () => {
        const message = fmt`Hello ${'<b>A&B</b>'} ${bold('safe & sound')}`;

        expect(message).toMatchObject({
            text: 'Hello &lt;b&gt;A&amp;B&lt;/b&gt; <b>safe &amp; sound</b>',
            parse_mode: 'HTML',
        });
        expect(String(message)).toBe(message.text);
    });

    it('should support nested HTML formatting', () => {
        const message = fmt`${bold(italic('nested <tag>'))} ${code('x < y')}`;

        expect(message.text).toBe('<b><i>nested &lt;tag&gt;</i></b> <code>x &lt; y</code>');
    });

    it('should escape MarkdownV2 reserved characters', () => {
        const message = markdownFmt`Hello ${markdownBold('A_B * C')} ${markdownCode('x.y!')}`;

        expect(message).toMatchObject({
            text: 'Hello *A\\_B \\* C* `x\\.y\\!`',
            parse_mode: 'MarkdownV2',
        });
    });

    it('should create safe links and reject unsafe URLs', () => {
        expect(link('Open <site>', 'https://example.com/?q=a&b=1').text).toBe(
            '<a href="https://example.com/?q=a&amp;b=1">Open &lt;site&gt;</a>'
        );
        expect(markdownLink('Docs [stable]', 'https://example.com/a_(b)')).toMatchObject({
            text: '[Docs \\[stable\\]](https://example.com/a_(b\\))',
            parse_mode: 'MarkdownV2',
        });
        expect(() => link('Bad', 'javascript:alert(1)')).toThrow('Unsafe URL');
    });

    it('should expose explicit escaping helpers', () => {
        expect(escapeHtml('<tag attr="x">&')).toBe('&lt;tag attr=&quot;x&quot;&gt;&amp;');
        expect(escapeMarkdownV2('_*[]()~`>#+-=|{}.!\\')).toBe(
            '\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!\\\\'
        );
    });

    it('should set default parse mode without overriding explicit parse mode', async () => {
        const { ctx, calls } = createFakeContext();
        const middleware = parseMode('HTML');

        await middleware(ctx, async () => {
            await ctx.reply('plain');
            await ctx.reply('markdown', { parse_mode: 'MarkdownV2' });
        });

        expect(calls).toEqual([
            ['sendMessage', { chat_id: 1, text: 'plain', parse_mode: 'HTML' }],
            ['sendMessage', { chat_id: 1, text: 'markdown', parse_mode: 'MarkdownV2' }],
        ]);
    });

    it('should add ctx.replyFmt for formatted replies', async () => {
        const { ctx, calls } = createFakeContext();
        const middleware = parseMode('MarkdownV2');

        await middleware(ctx, async () => {
            await ctx.replyFmt(fmt`Hello ${bold('Alfa')}`);
        });

        expect(calls).toEqual([
            ['sendMessage', { chat_id: 1, text: 'Hello <b>Alfa</b>', parse_mode: 'HTML' }],
        ]);
    });
});

function createFakeContext() {
    const calls: Array<[string, unknown]> = [];
    const ctx = {
        client: {
            callApi: vi.fn(async (method: string, data?: unknown) => {
                calls.push([method, data]);
                return data;
            }),
        },
        reply(text: string, extra?: Record<string, unknown>) {
            return this.client.callApi('sendMessage', { chat_id: 1, text, ...extra });
        },
    };

    return { ctx: ctx as ReturnType<typeof parseMode> extends (ctx: infer C, next: infer N) => unknown ? C & { replyFmt: Function; reply: Function } : never, calls };
}
