import { describe, expect, it, vi } from 'vitest';

import {
    MemoryChatMemberStore,
    chatMembers,
    isAdministrator,
    isMember,
    isOwner,
    requireAdmin,
    requireMembership,
    requireOwner,
    type ChatMembersFlavor,
    type TelegramChatMember,
} from '../src/index';

describe('@vibegram/chat-members', () => {
    it('should cache getChatMember results within the configured TTL', async () => {
        const admin = member('administrator', 42);
        const ctx = createContext({ apiResults: [admin] });
        const middleware = chatMembers({ ttlMs: 60_000 });

        await middleware(ctx, async () => {
            const first = await ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
            const second = await ctx.client.callApi('getChatMember', {
                chat_id: ctx.chat.id,
                user_id: ctx.from.id,
            });

            expect(first).toBe(admin);
            expect(second).toBe(admin);
        });

        expect(ctx.client.calls).toEqual([
            ['getChatMember', { chat_id: -100, user_id: 42 }],
        ]);
    });

    it('should invalidate cached members from chat_member and my_chat_member updates', async () => {
        const middleware = chatMembers({ ttlMs: 60_000 });
        const initial = createContext({ apiResults: [member('member', 42)] });

        await middleware(initial, async () => {
            await initial.chatMembers.get(-100, 42);
        });

        const memberUpdate = createContext({
            update: memberUpdatePayload(42, 'administrator', 'chat_member'),
        });
        await middleware(memberUpdate, async () => undefined);

        const afterMemberUpdate = createContext({ apiResults: [member('administrator', 42)] });
        await middleware(afterMemberUpdate, async () => {
            await afterMemberUpdate.chatMembers.get(-100, 42);
        });

        const myMemberUpdate = createContext({
            update: memberUpdatePayload(900, 'kicked', 'my_chat_member'),
        });
        await middleware(myMemberUpdate, async () => undefined);

        const botMember = createContext({ apiResults: [member('left', 900)] });
        await middleware(botMember, async () => {
            await botMember.chatMembers.get(-100, 900);
        });

        expect(initial.client.calls).toHaveLength(1);
        expect(afterMemberUpdate.client.calls).toHaveLength(1);
        expect(botMember.client.calls).toHaveLength(1);
    });

    it('should allow administrators and owners through admin guards', async () => {
        const ctx = createContext({ apiResults: [member('creator', 42)] });
        const next = vi.fn(async () => undefined);

        await chatMembers()(ctx, () => requireAdmin()(ctx, next));

        expect(next).toHaveBeenCalledOnce();
    });

    it('should reject non-admin users from admin guards', async () => {
        const ctx = createContext({ apiResults: [member('member', 42)] });
        const deniedReasons: string[] = [];
        const next = vi.fn(async () => undefined);

        await chatMembers()(ctx, () =>
            requireAdmin({
                onDenied: (_ctx, reason) => {
                    deniedReasons.push(reason);
                },
            })(ctx, next)
        );

        expect(next).not.toHaveBeenCalled();
        expect(deniedReasons).toEqual(['not_admin']);
    });

    it('should reject non-members and allow active members through membership guards', async () => {
        const active = createContext({ apiResults: [member('restricted', 42, { is_member: true })] });
        const inactive = createContext({ apiResults: [member('restricted', 42, { is_member: false })] });
        const deniedReasons: string[] = [];
        const next = vi.fn(async () => undefined);

        await chatMembers()(active, () => requireMembership()(active, next));
        await chatMembers()(inactive, () =>
            requireMembership({
                onDenied: (_ctx, reason) => {
                    deniedReasons.push(reason);
                },
            })(inactive, next)
        );

        expect(next).toHaveBeenCalledOnce();
        expect(deniedReasons).toEqual(['not_member']);
    });

    it('should handle Telegram API failures safely in guards', async () => {
        const ctx = createContext({ apiError: new Error('Telegram is down') });
        const errors: string[] = [];
        const next = vi.fn(async () => undefined);

        await requireAdmin({
            onError: (_ctx, error) => {
                errors.push(error instanceof Error ? error.message : String(error));
            },
        })(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(errors).toEqual(['Telegram is down']);
    });

    it('should expose role helpers and a typed context flavor', () => {
        const owner = member('creator', 1);
        const admin = member('administrator', 2);
        const left = member('left', 3);

        expect(isOwner(owner)).toBe(true);
        expect(isAdministrator(admin)).toBe(true);
        expect(isMember(left)).toBe(false);
        expect(new MemoryChatMemberStore({ ttlMs: 1000 })).toBeInstanceOf(MemoryChatMemberStore);

        function assertTypes(ctx: ChatMembersFlavor<ReturnType<typeof createContext>>) {
            void ctx.chatMembers.get(ctx.chat.id, ctx.from.id);
            void requireOwner();
        }

        expect(typeof assertTypes).toBe('function');
    });
});

function createContext(options: {
    apiResults?: TelegramChatMember[];
    apiError?: Error;
    update?: Record<string, unknown>;
} = {}) {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const results = [...(options.apiResults ?? [])];

    return {
        update: options.update ?? { update_id: 1, message: { chat: { id: -100, type: 'supergroup' }, from: { id: 42 } } },
        chat: { id: -100, type: 'supergroup' },
        from: { id: 42 },
        client: {
            calls,
            async callApi(method: string, params?: Record<string, unknown>) {
                calls.push([method, params]);

                if (options.apiError) {
                    throw options.apiError;
                }

                return results.shift() ?? member('member', Number(params?.user_id ?? 42));
            },
        },
    } as ChatMembersFlavor<{
        update: Record<string, unknown>;
        chat: { id: number; type: string };
        from: { id: number };
        client: {
            calls: Array<[string, Record<string, unknown> | undefined]>;
            callApi(method: string, params?: Record<string, unknown>): Promise<TelegramChatMember>;
        };
    }>;
}

function member(
    status: TelegramChatMember['status'],
    userId: number,
    extra: Partial<TelegramChatMember> = {}
): TelegramChatMember {
    return {
        status,
        user: { id: userId, is_bot: false, first_name: `User ${userId}` },
        ...extra,
    };
}

function memberUpdatePayload(
    userId: number,
    status: TelegramChatMember['status'],
    type: 'chat_member' | 'my_chat_member'
) {
    return {
        update_id: 100,
        [type]: {
            chat: { id: -100, type: 'supergroup' },
            from: { id: 1, is_bot: false, first_name: 'Admin' },
            date: 1,
            old_chat_member: member('member', userId),
            new_chat_member: member(status, userId),
        },
    };
}
