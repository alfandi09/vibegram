import { describe, expect, it, vi } from 'vitest';

import { hydrate, type HydrateFlavor, type HydratedMessage } from '../src/index';

describe('@vibegram/hydrate', () => {
    it('should hydrate sent message results', async () => {
        const { ctx, calls } = createContext(messageUpdate());

        await runHydrate(ctx, async () => {
            const sent = (await ctx.client.callApi('sendMessage', {
                chat_id: 99,
                text: 'Processing...',
            })) as HydratedMessage;

            expect(sent.editText).toBeTypeOf('function');
            await sent.editText('Done', { parse_mode: 'HTML' });
            await sent.delete();
        });

        expect(calls).toContainEqual([
            'editMessageText',
            {
                chat_id: 99,
                message_id: 200,
                text: 'Done',
                parse_mode: 'HTML',
            },
        ]);
        expect(calls).toContainEqual([
            'deleteMessage',
            {
                chat_id: 99,
                message_id: 200,
            },
        ]);
    });

    it('should hydrate incoming message objects with correct chat and message ids', async () => {
        const { ctx, calls } = createContext(
            messageUpdate({
                message_id: 123,
                message_thread_id: 456,
                business_connection_id: 'bc-1',
            })
        );

        await runHydrate(ctx, async () => {
            await ctx.message.reply('Hello');
            await ctx.message.editText('Edited');
            await ctx.message.pin(true);
            await ctx.message.unpin();
            await ctx.message.delete();
        });

        expect(calls).toContainEqual([
            'sendMessage',
            {
                chat_id: 99,
                business_connection_id: 'bc-1',
                message_thread_id: 456,
                text: 'Hello',
            },
        ]);
        expect(calls).toContainEqual([
            'editMessageText',
            {
                chat_id: 99,
                business_connection_id: 'bc-1',
                message_id: 123,
                text: 'Edited',
            },
        ]);
        expect(calls).toContainEqual([
            'pinChatMessage',
            {
                chat_id: 99,
                business_connection_id: 'bc-1',
                message_id: 123,
                disable_notification: true,
            },
        ]);
        expect(calls).toContainEqual([
            'unpinChatMessage',
            {
                chat_id: 99,
                business_connection_id: 'bc-1',
                message_id: 123,
            },
        ]);
        expect(calls).toContainEqual([
            'deleteMessage',
            {
                chat_id: 99,
                message_id: 123,
            },
        ]);
    });

    it('should hydrate callback queries and inline callback edit targets', async () => {
        const messageBacked = createContext(callbackQueryUpdate());
        await runHydrate(messageBacked.ctx, async () => {
            await messageBacked.ctx.update.callback_query.answer('Saved', true, {
                cache_time: 10,
            });
            await messageBacked.ctx.update.callback_query.editMessageText('Updated');
        });

        expect(messageBacked.calls).toContainEqual([
            'answerCallbackQuery',
            {
                callback_query_id: 'cbq-1',
                text: 'Saved',
                show_alert: true,
                cache_time: 10,
            },
        ]);
        expect(messageBacked.calls).toContainEqual([
            'editMessageText',
            {
                chat_id: 99,
                message_id: 123,
                text: 'Updated',
            },
        ]);

        const inlineBacked = createContext(callbackQueryUpdate({ inline_message_id: 'inline-1' }));
        await runHydrate(inlineBacked.ctx, async () => {
            await inlineBacked.ctx.update.callback_query.editMessageText('Inline updated');
        });

        expect(inlineBacked.calls).toContainEqual([
            'editMessageText',
            {
                inline_message_id: 'inline-1',
                text: 'Inline updated',
            },
        ]);
    });

    it('should hydrate chat and user wrappers where safe', async () => {
        const { ctx, calls } = createContext(messageUpdate());

        await runHydrate(ctx, async () => {
            await ctx.message.chat.sendMessage('From chat');
            await ctx.message.chat.get();
            await ctx.message.from.getProfilePhotos({ limit: 1 });
        });

        expect(calls).toContainEqual([
            'sendMessage',
            {
                chat_id: 99,
                text: 'From chat',
            },
        ]);
        expect(calls).toContainEqual(['getChat', { chat_id: 99 }]);
        expect(calls).toContainEqual(['getUserProfilePhotos', { user_id: 42, limit: 1 }]);
    });

    it('should keep hydrated helpers out of JSON serialization', async () => {
        const { ctx } = createContext(messageUpdate());

        await runHydrate(ctx);

        expect(Object.keys(ctx.message)).not.toContain('reply');
        expect(Object.keys(ctx.message)).not.toContain('editText');
        expect(JSON.stringify(ctx.message)).not.toContain('editText');
        expect(Object.getOwnPropertyDescriptor(ctx.message, 'reply')?.enumerable).toBe(false);
    });

    it('should work with typed context augmentation', () => {
        type BaseContext = {
            client: TestClient;
            message?: TestMessage;
            update: {
                message?: TestMessage;
                callback_query?: TestCallbackQuery;
            };
        };

        function assertHydrateTypes(typed: HydrateFlavor<BaseContext>) {
            void typed.message?.reply('typed');
            void typed.message?.chat.sendMessage('typed');
            void typed.message?.from?.getProfilePhotos();
            void typed.update.callback_query?.answer('typed');
            void typed.update.callback_query?.editMessageText('typed');
        }

        expect(typeof assertHydrateTypes).toBe('function');
    });
});

async function runHydrate(ctx: TestContext, next: () => Promise<void> = async () => {}) {
    const middleware = hydrate();
    await middleware(ctx, next);
}

function createContext(update: TestUpdate) {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const client: TestClient = {
        callApi: vi.fn(async (method: string, data?: Record<string, unknown>) => {
            calls.push([method, data]);

            if (method === 'sendMessage') {
                return {
                    message_id: 200,
                    date: 0,
                    chat: { id: data?.chat_id ?? 99, type: 'private' },
                    text: data?.text,
                };
            }

            if (method === 'editMessageText') {
                return {
                    message_id: data?.message_id ?? 201,
                    date: 0,
                    chat: { id: data?.chat_id ?? 99, type: 'private' },
                    text: data?.text,
                };
            }

            return true;
        }),
    };

    const ctx = {
        update,
        client,
        get message() {
            return this.update.message;
        },
    } as TestContext;

    return { ctx, calls };
}

function messageUpdate(overrides: Partial<TestMessage> = {}): TestUpdate {
    return {
        update_id: 1,
        message: {
            message_id: 100,
            date: 0,
            chat: { id: 99, type: 'private' },
            from: { id: 42, is_bot: false, first_name: 'Ada' },
            text: 'hello',
            ...overrides,
        },
    };
}

function callbackQueryUpdate(overrides: Partial<TestCallbackQuery> = {}): TestUpdate {
    return {
        update_id: 2,
        callback_query: {
            id: 'cbq-1',
            chat_instance: 'ci-1',
            from: { id: 42, is_bot: false, first_name: 'Ada' },
            message: {
                message_id: 123,
                date: 0,
                chat: { id: 99, type: 'private' },
                text: 'button',
            },
            ...overrides,
        },
    };
}

interface TestClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

interface TestChat {
    id: number | string;
    type: string;
}

interface TestUser {
    id: number;
    is_bot: boolean;
    first_name: string;
}

interface TestMessage {
    message_id: number;
    date: number;
    chat: TestChat;
    from?: TestUser;
    text?: string;
    business_connection_id?: string;
    message_thread_id?: number;
}

interface TestCallbackQuery {
    id: string;
    from: TestUser;
    chat_instance: string;
    message?: TestMessage;
    inline_message_id?: string;
}

interface TestUpdate {
    update_id: number;
    message?: TestMessage;
    callback_query?: TestCallbackQuery;
}

type TestContext = HydrateFlavor<{
    update: TestUpdate;
    client: TestClient;
    readonly message: TestMessage;
}>;
