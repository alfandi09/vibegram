import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Bot } from '../src/bot';
import { Composer } from '../src/composer';
import { Context } from '../src/context';
import type { Chat, Update } from '../src/types';
import { createMockClient } from './helpers/mock';

const user = { id: 7, is_bot: false, first_name: 'A' };
const privateChat: Chat = { id: 7, type: 'private' };
const groupChat: Chat = { id: -1, type: 'supergroup', title: 'G' };

function text(
    value: string,
    chat: Chat = privateChat,
    extra: Record<string, unknown> = {}
): Update {
    return {
        update_id: 1,
        message: { message_id: 1, date: 1, chat, from: user, text: value, ...extra },
    } as Update;
}

function reactionUpdate(oldEmoji: string[], newEmoji: string[]): Update {
    return {
        update_id: 2,
        message_reaction: {
            chat: groupChat,
            message_id: 1,
            user,
            date: 1,
            old_reaction: oldEmoji.map(emoji => ({ type: 'emoji' as const, emoji })),
            new_reaction: newEmoji.map(emoji => ({ type: 'emoji' as const, emoji })),
        },
    };
}

async function run(composer: Composer<Context>, update: Update, next = vi.fn(async () => {})) {
    await composer.middleware()(new Context(update, createMockClient()), next);
    return next;
}

describe('filter / drop / branch', () => {
    it('filter runs handlers only when the predicate passes, else continues', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.filter(ctx => ctx.message?.text === 'yes', handler);

        expect(await run(composer, text('no'))).toHaveBeenCalledTimes(1);
        await run(composer, text('yes'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('supports async predicates and type-guard narrowing', async () => {
        const composer = new Composer<Context>();
        const seen: string[] = [];
        composer.filter(
            (ctx): ctx is Context & { message: { text: string } } => !!ctx.message?.text,
            ctx => {
                expectTypeOf(ctx.message.text).toEqualTypeOf<string>();
                seen.push(ctx.message.text);
            }
        );
        composer.filter(
            async () => false,
            () => void seen.push('never')
        );

        await run(composer, text('hi'));
        expect(seen).toEqual(['hi']);
    });

    it('drop runs handlers only when the predicate fails', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.drop(ctx => ctx.from?.is_bot === true, handler);
        await run(composer, text('x'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('branch picks exactly one side', async () => {
        const composer = new Composer<Context>();
        const calls: string[] = [];
        composer.branch(
            ctx => ctx.chat?.type === 'private',
            () => void calls.push('private'),
            () => void calls.push('group')
        );
        await run(composer, text('a'));
        await run(composer, text('b', groupChat));
        expect(calls).toEqual(['private', 'group']);
    });
});

describe('fork / lazy / route', () => {
    it('fork runs concurrently with the rest of the chain', async () => {
        const composer = new Composer<Context>();
        const order: string[] = [];
        let release!: () => void;
        const gate = new Promise<void>(resolve => (release = resolve));

        composer.fork(async () => {
            order.push('fork:start');
            await gate;
            order.push('fork:end');
        });
        composer.use(() => {
            order.push('main');
            release();
        });

        await run(composer, text('x'));
        expect(order).toEqual(['fork:start', 'main', 'fork:end']);
    });

    it('fork rejects when the forked middleware throws', async () => {
        const composer = new Composer<Context>();
        composer.fork(() => {
            throw new Error('fork failed');
        });
        await expect(run(composer, text('x'))).rejects.toThrow('fork failed');
    });

    it('lazy builds middleware per update', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.lazy(ctx => (ctx.message?.text === 'go' ? [handler] : []));

        const next = await run(composer, text('stop'));
        expect(next).toHaveBeenCalledTimes(1);
        await run(composer, text('go'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('route dispatches by key with a fallback', async () => {
        const composer = new Composer<Context>();
        const calls: string[] = [];
        composer.route(
            ctx => ctx.message?.text as 'a' | 'b' | undefined,
            { a: () => void calls.push('a'), b: [() => void calls.push('b')] },
            () => void calls.push('fallback')
        );

        await run(composer, text('a'));
        await run(composer, text('b'));
        await run(composer, text('zzz'));
        expect(calls).toEqual(['a', 'b', 'fallback']);
    });

    it('route continues the chain when no route or fallback matches', async () => {
        const composer = new Composer<Context>();
        composer.route(() => 'missing' as string, { a: vi.fn() });
        expect(await run(composer, text('x'))).toHaveBeenCalledTimes(1);
    });

    it('route ignores inherited object keys such as "constructor"', async () => {
        const composer = new Composer<Context>();
        composer.route(() => 'constructor', {});
        expect(await run(composer, text('x'))).toHaveBeenCalledTimes(1);
    });
});

describe('errorBoundary', () => {
    it('catches errors from wrapped middleware', async () => {
        const composer = new Composer<Context>();
        const onError = vi.fn();
        composer.errorBoundary(onError, () => {
            throw new Error('inner');
        });
        await run(composer, text('x'));
        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'inner' }),
            expect.any(Context)
        );
    });

    it('does not swallow errors from handlers after the boundary', async () => {
        const composer = new Composer<Context>();
        const onError = vi.fn();
        composer.errorBoundary(onError, (_ctx, next) => next());
        composer.use(() => {
            throw new Error('outer');
        });

        await expect(run(composer, text('x'))).rejects.toThrow('outer');
        expect(onError).not.toHaveBeenCalled();
    });
});

describe('chatType / reaction / entity', () => {
    it('chatType filters and narrows ctx.chat.type', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.chatType(['group', 'supergroup'], ctx => {
            expectTypeOf(ctx.chat.type).toEqualTypeOf<'group' | 'supergroup'>();
            handler(ctx.chat.type);
        });

        await run(composer, text('x'));
        await run(composer, text('x', groupChat));
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('supergroup');
    });

    it('reaction matches only newly added reactions', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.reaction(['👍', { type: 'custom_emoji', custom_emoji_id: 'c1' }], handler);

        await run(composer, reactionUpdate([], ['👍']));
        await run(composer, reactionUpdate(['👍'], ['👍', '🔥']));
        await run(composer, reactionUpdate([], ['🔥']));
        await run(composer, text('👍'));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('entity matches text and caption entities', async () => {
        const composer = new Composer<Context>();
        const handler = vi.fn();
        composer.entity(['url', 'hashtag'], handler);

        await run(
            composer,
            text('see x.com', privateChat, { entities: [{ type: 'url', offset: 4, length: 5 }] })
        );
        await run(composer, {
            update_id: 3,
            message: {
                message_id: 2,
                date: 1,
                chat: privateChat,
                caption: '#tag',
                caption_entities: [{ type: 'hashtag', offset: 0, length: 4 }],
            },
        });
        await run(composer, text('plain'));
        expect(handler).toHaveBeenCalledTimes(2);
    });
});

describe('Bot integration', () => {
    it('new combinators invalidate the cached middleware chain', async () => {
        const bot = new Bot('token');
        const first = vi.fn((_ctx: Context, next: () => Promise<void>) => next());
        const second = vi.fn();
        bot.chatType('private', first);
        await bot.handleUpdate(text('x'));
        bot.filter(() => true, second);
        await bot.handleUpdate(text('y'));

        expect(first).toHaveBeenCalledTimes(2);
        expect(second).toHaveBeenCalledTimes(1);
    });
});
