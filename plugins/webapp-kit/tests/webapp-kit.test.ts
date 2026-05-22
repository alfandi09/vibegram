import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
    WebAppKitError,
    buildWebAppInlineKeyboard,
    buildWebAppReplyKeyboard,
    parseWebAppData,
    parseLaunchPayload,
    validateInitData,
    webAppKit,
} from '../src/index';

const BOT_TOKEN = '123456:test-token-secret';
const NOW_SECONDS = 1_800_000_000;

describe('validateInitData()', () => {
    it('should validate Telegram initData when the hash matches', () => {
        const initData = createInitData({
            query_id: 'AAE-demo',
            user: JSON.stringify({ id: 42, first_name: 'Alfa' }),
            start_param: encodeBase64Json({ screen: 'checkout', id: 'ord_1' }),
        });

        const result = validateInitData(initData, {
            botToken: BOT_TOKEN,
            now: () => NOW_SECONDS,
        });

        expect(result.ok).toBe(true);
        expect(result.data.user).toEqual({ id: 42, first_name: 'Alfa' });
        expect(result.data.start_param).toBe(encodeBase64Json({ screen: 'checkout', id: 'ord_1' }));
        expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should reject expired auth_date', () => {
        const initData = createInitData({}, { authDate: NOW_SECONDS - 90_000 });

        const result = validateInitData(initData, {
            botToken: BOT_TOKEN,
            maxAgeSeconds: 60,
            now: () => NOW_SECONDS,
        });

        expect(result.ok).toBe(false);
        expect(result.error.code).toBe('expired');
        expect(result.error.message).not.toContain(BOT_TOKEN);
    });

    it('should not leak validation secrets on hash mismatch', () => {
        const initData = createInitData({ user: JSON.stringify({ id: 7, first_name: 'Secret' }) });

        const result = validateInitData(initData, {
            botToken: '123456:wrong-token',
            now: () => NOW_SECONDS,
        });

        expect(result.ok).toBe(false);
        expect(result.error.code).toBe('hash_mismatch');
        expect(result.error.message).not.toContain('wrong-token');
        expect(result.error.message).not.toContain(BOT_TOKEN);
    });
});

describe('parseWebAppData()', () => {
    it('should parse web_app_data safely', () => {
        const parsed = parseWebAppData<{ action: string }>({
            data: '{"action":"save"}',
            button_text: 'Save',
        });

        expect(parsed).toEqual({ action: 'save' });
    });

    it('should normalize invalid web_app_data errors without leaking payloads', () => {
        expect(() => parseWebAppData({ data: '{"secret":"abc"', button_text: 'Save' })).toThrow(
            WebAppKitError
        );

        try {
            parseWebAppData({ data: '{"secret":"abc"', button_text: 'Save' });
        } catch (error) {
            expect(error).toBeInstanceOf(WebAppKitError);
            expect((error as WebAppKitError).code).toBe('invalid_web_app_data');
            expect((error as Error).message).not.toContain('secret');
        }
    });
});

describe('parseLaunchPayload()', () => {
    it('should parse a typed base64url JSON launch payload', () => {
        const payload = parseLaunchPayload<{ screen: string; id: string }>(
            encodeBase64Json({ screen: 'checkout', id: 'ord_1' }),
            { format: 'base64json' }
        );

        expect(payload).toEqual({ screen: 'checkout', id: 'ord_1' });
    });
});

describe('webAppKit()', () => {
    it('should expose typed helpers on ctx.webApp', async () => {
        const calls: Array<[string, Record<string, unknown> | undefined]> = [];
        const ctx = {
            message: {
                web_app_data: {
                    data: '{"action":"confirm"}',
                    button_text: 'Confirm',
                },
            },
            client: {
                async callApi(method: string, data?: Record<string, unknown>) {
                    calls.push([method, data]);
                    return { inline_message_id: 'inline-1' };
                },
            },
            async reply(text: string, extra?: Record<string, unknown>) {
                calls.push(['sendMessage', { text, ...extra }]);
                return { message_id: 10 };
            },
        };

        await webAppKit({ botToken: BOT_TOKEN })(ctx, async () => {
            expect(ctx.webApp.parseData<{ action: string }>()).toEqual({ action: 'confirm' });
            await ctx.webApp.replyWithInlineButton('Open app', 'Launch', 'https://example.com/app');
            await ctx.webApp.answerQuery('query-1', { type: 'article', id: '1', title: 'Done' });
        });

        expect(calls).toEqual([
            [
                'sendMessage',
                {
                    text: 'Open app',
                    reply_markup: buildWebAppInlineKeyboard('Launch', 'https://example.com/app'),
                },
            ],
            [
                'answerWebAppQuery',
                {
                    web_app_query_id: 'query-1',
                    result: { type: 'article', id: '1', title: 'Done' },
                },
            ],
        ]);
        expect(ctx.webApp).toBeUndefined();
    });

    it('should build Telegram Web App reply and inline keyboard payloads', () => {
        expect(buildWebAppInlineKeyboard('Open', 'https://example.com/app')).toEqual({
            inline_keyboard: [[{ text: 'Open', web_app: { url: 'https://example.com/app' } }]],
        });
        expect(buildWebAppReplyKeyboard('Open', 'https://example.com/app')).toEqual({
            keyboard: [[{ text: 'Open', web_app: { url: 'https://example.com/app' } }]],
            resize_keyboard: true,
            one_time_keyboard: false,
        });
    });
});

function createInitData(
    fields: Record<string, string>,
    options: { authDate?: number; token?: string } = {}
): string {
    const params = new URLSearchParams({
        ...fields,
        auth_date: String(options.authDate ?? NOW_SECONDS),
    });
    const secretKey = createHmac('sha256', 'WebAppData')
        .update(options.token ?? BOT_TOKEN)
        .digest();
    const dataCheckString = Array.from(params.keys())
        .sort()
        .map(key => `${key}=${params.get(key)}`)
        .join('\n');
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    return params.toString();
}

function encodeBase64Json(value: unknown): string {
    return Buffer.from(JSON.stringify(value), 'utf8')
        .toString('base64url');
}
