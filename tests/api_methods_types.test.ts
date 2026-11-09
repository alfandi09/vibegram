import { describe, expectTypeOf, it } from 'vitest';
import { Bot, TelegramClient } from '../src';
import type { ApiMethods, ApiParams, ApiResult, BotApi } from '../src';

// Type-level assertions; checked by `npm run typecheck:test` (tsc) and executed as no-ops by vitest.
describe('callApi type inference', () => {
    const client = new TelegramClient('123:abc');
    const bot = new Bot('123:abc');

    it('types known methods on TelegramClient', () => {
        expectTypeOf(client.callApi).toBeFunction();
        expectTypeOf<ReturnType<typeof getMe>>().resolves.toEqualTypeOf<BotApi.User>();
        expectTypeOf<ReturnType<typeof sendMessage>>().resolves.toEqualTypeOf<BotApi.Message>();
        expectTypeOf<ReturnType<typeof editText>>().resolves.toEqualTypeOf<BotApi.Message | true>();
        expectTypeOf<ReturnType<typeof getUpdates>>().resolves.toEqualTypeOf<BotApi.Update[]>();

        function getMe() {
            return client.callApi('getMe');
        }
        function sendMessage() {
            return client.callApi('sendMessage', { chat_id: 1, text: 'hi' });
        }
        function editText() {
            return client.callApi('editMessageText', { text: 'x', inline_message_id: 'id' });
        }
        function getUpdates() {
            return client.callApi('getUpdates');
        }
    });

    it('types known methods on Bot', () => {
        expectTypeOf<ReturnType<typeof getMe>>().resolves.toEqualTypeOf<BotApi.User>();
        expectTypeOf<ReturnType<typeof getChat>>().resolves.toEqualTypeOf<BotApi.ChatFullInfo>();

        function getMe() {
            return bot.callApi('getMe');
        }
        function getChat() {
            return bot.callApi('getChat', { chat_id: 1 });
        }
    });

    it('keeps unknown methods and explicit type arguments working', () => {
        expectTypeOf<ReturnType<typeof clientUnknown>>().resolves.toBeAny();
        expectTypeOf<ReturnType<typeof botUnknown>>().resolves.toBeUnknown();
        expectTypeOf<ReturnType<typeof explicit>>().resolves.toEqualTypeOf<{ ok: true }>();
        expectTypeOf<ReturnType<typeof dynamic>>().resolves.toBeAny();

        function clientUnknown() {
            return client.callApi('someFutureMethod', { a: 1 });
        }
        function botUnknown() {
            return bot.callApi('someFutureMethod', { a: 1 });
        }
        function explicit() {
            return bot.callApi<{ ok: true }>('getMe');
        }
        function dynamic(name: string) {
            return client.callApi(name);
        }
    });

    it('exposes params/result helper types', () => {
        expectTypeOf<ApiParams<'sendMessage'>['chat_id']>().toEqualTypeOf<number | string>();
        expectTypeOf<ApiResult<'getMe'>>().toEqualTypeOf<BotApi.User>();
        expectTypeOf<keyof ApiMethods>().toMatchTypeOf<string>();
    });
});
