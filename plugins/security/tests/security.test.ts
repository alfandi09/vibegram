import { describe, expect, it, vi } from 'vitest';

import {
    allowChats,
    allowUsers,
    redactError,
    redactValue,
    requireAdmin,
    safeErrors,
    security,
    spamGuard,
    verifyWebhookSecret,
    type SecurityFlavor,
    type SecurityGuardReason,
} from '../src/index';

describe('@vibegram/security', () => {
    it('should block non-allowed users and call onDenied with a stable reason', async () => {
        const ctx = createContext({ fromId: 99 });
        const next = vi.fn(async () => undefined);
        const denied: SecurityGuardReason[] = [];

        await allowUsers([42], {
            onDenied: (_ctx, reason) => denied.push(reason),
        })(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(denied).toEqual(['user_not_allowed']);
    });

    it('should allow listed users and chats through the composite security middleware', async () => {
        const ctx = createContext({ fromId: 42, chatId: -100 });
        const next = vi.fn(async () => undefined);

        await security({
            allowUsers: [42],
            allowChats: [-100],
        })(ctx, next);

        expect(next).toHaveBeenCalledOnce();
    });

    it('should block non-admin users and use chatMembers cache when available', async () => {
        const ctx = createContext({
            chatMemberStatus: 'member',
            withChatMembersManager: true,
        });
        const next = vi.fn(async () => undefined);
        const denied: SecurityGuardReason[] = [];

        await requireAdmin({
            onDenied: (_ctx, reason) => denied.push(reason),
        })(ctx, next);

        expect(next).not.toHaveBeenCalled();
        expect(denied).toEqual(['not_admin']);
        expect(ctx.chatMembers?.calls).toEqual([[-100, 42]]);
        expect(ctx.client.calls).toEqual([]);
    });

    it('should allow Telegram chat creators and administrators through admin guard', async () => {
        const admin = createContext({ chatMemberStatus: 'administrator' });
        const owner = createContext({ chatMemberStatus: 'creator' });
        const next = vi.fn(async () => undefined);

        await requireAdmin()(admin, next);
        await requireAdmin()(owner, next);

        expect(next).toHaveBeenCalledTimes(2);
    });

    it('should verify Telegram webhook secret headers without leaking timing by length', () => {
        expect(verifyWebhookSecret(
            { 'x-telegram-bot-api-secret-token': 'secret-token' },
            'secret-token'
        )).toBe(true);
        expect(verifyWebhookSecret(
            { 'x-telegram-bot-api-secret-token': 'short' },
            'secret-token'
        )).toBe(false);
        expect(verifyWebhookSecret(new Headers({
            'X-Telegram-Bot-Api-Secret-Token': 'secret-token',
        }), 'secret-token')).toBe(true);
    });

    it('should block spam bursts per user or chat key', async () => {
        const ctx = createContext({ fromId: 42, chatId: -100 });
        const next = vi.fn(async () => undefined);
        const blocked: SecurityGuardReason[] = [];
        const guard = spamGuard({
            limit: 2,
            windowMs: 60_000,
            onDenied: (_ctx, reason) => blocked.push(reason),
        });

        await guard(ctx, next);
        await guard(ctx, next);
        await guard(ctx, next);

        expect(next).toHaveBeenCalledTimes(2);
        expect(blocked).toEqual(['spam_burst']);
    });

    it('should return safe error replies without exposing stack traces', async () => {
        const ctx = createContext();
        const errors: unknown[] = [];

        await safeErrors({
            reply: 'Something went wrong.',
            onError: (_ctx, error) => errors.push(error),
        })(ctx, async () => {
            throw new Error('database password leaked');
        });

        expect(ctx.replies).toEqual(['Something went wrong.']);
        expect(errors).toHaveLength(1);
    });

    it('should redact sensitive values deeply for logs and error objects', () => {
        const value = redactValue({
            token: '123456:ABC',
            nested: {
                authorization: 'Bearer secret',
                ok: true,
            },
        });
        const error = redactError(new Error('failed with token 123456:ABC'));

        expect(value).toEqual({
            token: '[REDACTED]',
            nested: {
                authorization: '[REDACTED]',
                ok: true,
            },
        });
        expect(error).toEqual({
            name: 'Error',
            message: 'failed with token [REDACTED]',
        });
    });

    it('should expose allowChats and typed security flavor helpers', async () => {
        const ctx = createContext({ chatId: -200 });
        const next = vi.fn(async () => undefined);

        await allowChats([-100])(ctx, next);

        expect(next).not.toHaveBeenCalled();

        function assertTypes(input: SecurityFlavor<ReturnType<typeof createContext>>) {
            void input.security?.denyReasons;
            void allowUsers([input.from.id]);
        }

        expect(typeof assertTypes).toBe('function');
    });
});

function createContext(options: {
    fromId?: number;
    chatId?: number | string;
    chatType?: string;
    chatMemberStatus?: string;
    withChatMembersManager?: boolean;
} = {}) {
    const chatId = options.chatId ?? -100;
    const fromId = options.fromId ?? 42;
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const chatMembersCalls: Array<[number | string, number]> = [];
    const ctx = {
        update: {
            update_id: 1,
            message: {
                chat: { id: chatId, type: options.chatType ?? 'supergroup' },
                from: { id: fromId, is_bot: false, first_name: 'Ada' },
                text: '/admin',
            },
        },
        chat: { id: chatId, type: options.chatType ?? 'supergroup' },
        from: { id: fromId, is_bot: false, first_name: 'Ada' },
        replies: [] as string[],
        async reply(text: string) {
            this.replies.push(text);
        },
        client: {
            calls,
            async callApi(method: string, data?: Record<string, unknown>) {
                calls.push([method, data]);
                return {
                    status: options.chatMemberStatus ?? 'member',
                    user: { id: fromId, is_bot: false, first_name: 'Ada' },
                };
            },
        },
    };

    if (options.withChatMembersManager) {
        return {
            ...ctx,
            chatMembers: {
                calls: chatMembersCalls,
                async get(targetChatId: number | string, targetUserId: number) {
                    chatMembersCalls.push([targetChatId, targetUserId]);
                    return {
                        status: options.chatMemberStatus ?? 'member',
                        user: { id: targetUserId, is_bot: false, first_name: 'Ada' },
                    };
                },
            },
        };
    }

    return ctx;
}
