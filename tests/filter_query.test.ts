import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Bot } from '../src/bot';
import { Composer } from '../src/composer';
import { Context } from '../src/context';
import { matchFilterQuery } from '../src/filter-query';
import type { Chat, Message, PhotoSize, Update } from '../src/types';
import { createMockClient } from './helpers/mock';

const chat = { id: 1, type: 'private' as const };

function messageUpdate(fields: Partial<Message>, key: keyof Update = 'message'): Update {
    return {
        update_id: 1,
        [key]: { message_id: 1, date: 1, chat, ...fields },
    } as Update;
}

const photoUpdate = messageUpdate({
    photo: [{ file_id: 'p', file_unique_id: 'u', width: 1, height: 1 }],
});
const textUpdate = messageUpdate({ text: 'hello' });
const callbackUpdate: Update = {
    update_id: 2,
    callback_query: {
        id: 'cb',
        from: { id: 1, is_bot: false, first_name: 'A' },
        chat_instance: 'c',
        data: 'go',
    },
};

async function run(composer: Composer<Context>, update: Update) {
    await composer.middleware()(new Context(update, createMockClient()), async () => {});
}

describe('matchFilterQuery', () => {
    it('matches update keys, message fields, and the any-message shortcut', () => {
        expect(matchFilterQuery('message')(textUpdate)).toBe(true);
        expect(matchFilterQuery('message:text')(textUpdate)).toBe(true);
        expect(matchFilterQuery('message:photo')(textUpdate)).toBe(false);
        expect(matchFilterQuery(':photo')(photoUpdate)).toBe(true);
        expect(matchFilterQuery(':text')(messageUpdate({ text: 'x' }, 'channel_post'))).toBe(true);
        expect(
            matchFilterQuery('message:text')(messageUpdate({ text: 'x' }, 'edited_message'))
        ).toBe(false);
        expect(matchFilterQuery('callback_query:data')(callbackUpdate)).toBe(true);
        expect(matchFilterQuery('callback_query:game_short_name')(callbackUpdate)).toBe(false);
    });

    it('rejects malformed queries at registration time', () => {
        expect(() => matchFilterQuery('message:')).toThrow(TypeError);
        expect(() => matchFilterQuery('message:text:extra')).toThrow(TypeError);
        expect(() => matchFilterQuery('poll:question')).toThrow(TypeError);
        expect(() => new Composer<Context>().on('message:' as 'message', () => {})).toThrow(
            TypeError
        );
    });
});

describe('Composer.on with filter queries', () => {
    it('runs handlers only for matching updates', async () => {
        const composer = new Composer<Context>();
        const photo = vi.fn();
        const anyText = vi.fn();
        composer.on('message:photo', photo);
        composer.on(':text', anyText);

        await run(composer, photoUpdate);
        await run(composer, textUpdate);

        expect(photo).toHaveBeenCalledTimes(1);
        expect(anyText).toHaveBeenCalledTimes(1);
    });

    it('supports arrays mixing filter queries and legacy names', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on(['message:photo', 'callback_query:data'], handler);
        composer.on('document', vi.fn());

        await run(composer, photoUpdate);
        await run(composer, callbackUpdate);
        await run(composer, textUpdate);

        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('keeps legacy bare message field names working', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.on('photo', handler);
        await run(composer, photoUpdate);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('works through Bot.on and invalidates the cached middleware', async () => {
        const bot = new Bot('token');
        const handler = vi.fn();
        bot.on('message:text', ctx => handler(ctx.message.text));
        await bot.handleUpdate(textUpdate);
        expect(handler).toHaveBeenCalledWith('hello');
    });
});

describe('filter query type narrowing', () => {
    it('narrows ctx.message and the queried field', () => {
        const bot = new Bot('token');

        bot.on('message:photo', ctx => {
            expectTypeOf(ctx.message.photo).toEqualTypeOf<PhotoSize[]>();
            expectTypeOf(ctx.chat).toEqualTypeOf<Chat>();
            expectTypeOf(ctx.update.message.photo).toEqualTypeOf<PhotoSize[]>();
            // @ts-expect-error text is not guaranteed by a photo query
            ctx.message.text.toUpperCase();
        });

        bot.on(':text', ctx => {
            expectTypeOf(ctx.message.text).toEqualTypeOf<string>();
        });

        bot.on('callback_query:data', ctx => {
            expectTypeOf(ctx.update.callback_query.data).toEqualTypeOf<string>();
        });

        bot.on(['message:photo', 'message:video'], ctx => {
            expectTypeOf(ctx.message).toMatchTypeOf<Message>();
        });

        bot.on('message', ctx => {
            expectTypeOf(ctx.message).toMatchTypeOf<Message>();
            expectTypeOf(ctx.update.message).toMatchTypeOf<Message>();
            expectTypeOf<undefined>().not.toMatchTypeOf<typeof ctx.update.message>();
        });

        bot.on('photo', ctx => {
            // Legacy names keep the broad Context type.
            expectTypeOf<undefined>().toMatchTypeOf<typeof ctx.message>();
        });
    });
});
