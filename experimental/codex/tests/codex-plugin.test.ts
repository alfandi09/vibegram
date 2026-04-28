import { afterEach, describe, expect, it, vi } from 'vitest';
import { codex } from '../src/plugin.js';
import { MemoryCodexStore } from '../src/memory.js';
import type { CodexProvider } from '../src/types.js';

type FakeCtx = {
    chat?: { id: number; type?: string };
    from?: { id: number };
    message?: {
        text?: string;
        message_thread_id?: number;
        entities?: Array<{ type: string; offset: number; length: number }>;
    };
    reply: ReturnType<typeof vi.fn>;
    sendChatAction: ReturnType<typeof vi.fn>;
    codex?: {
        ask: (text: string) => Promise<{ text: string }>;
        status: () => Promise<unknown>;
        reset: () => Promise<void>;
        listModels: () => Promise<unknown[]>;
        setPersonality: (text: string) => Promise<void>;
        getPersonality: () => Promise<string | null>;
        clearPersonality: () => Promise<void>;
        conversationKey: string;
    };
};

function createCtx(text = 'hello', overrides: Partial<FakeCtx> = {}): FakeCtx {
    return {
        chat: { id: 99, type: 'private' },
        from: { id: 42 },
        message: { text },
        reply: vi.fn(async () => ({ message_id: 1 })),
        sendChatAction: vi.fn(async () => true),
        ...overrides,
    };
}

function createProvider(reply = 'ok'): CodexProvider {
    return {
        name: 'fake',
        ask: vi.fn(async input => ({
            text: `${reply}:${input.text}`,
            model: 'fake-model',
        })),
        status: vi.fn(async () => ({
            connected: true,
            provider: 'fake',
            model: 'fake-model',
        })),
        listModels: vi.fn(async () => [{ id: 'fake-model' }]),
    };
}

async function runMiddleware(ctx: FakeCtx, provider: CodexProvider, options = {}) {
    const next = vi.fn(async () => undefined);
    const middleware = codex({
        provider,
        ...options,
    });

    await middleware(ctx as never, next);
    return next;
}

afterEach(() => {
    vi.useRealTimers();
});

describe('@vibegram/codex plugin', () => {
    it('should attach ctx.codex and auto-reply in private chats', async () => {
        const provider = createProvider('reply');
        const ctx = createCtx('hello');

        const next = await runMiddleware(ctx, provider);

        expect(next).not.toHaveBeenCalled();
        expect(ctx.sendChatAction).toHaveBeenCalledWith('typing');
        expect(provider.ask).toHaveBeenCalledOnce();
        expect(provider.ask).toHaveBeenCalledWith(
            expect.objectContaining({
                text: 'hello',
                userId: 42,
                chatId: 99,
                conversationKey: 'user:42',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'hello' },
                ],
            })
        );
        expect(ctx.reply).toHaveBeenCalledWith('reply:hello');
        expect(ctx.codex?.conversationKey).toBe('user:42');
    });

    it('should not persist failed prompts into memory', async () => {
        const memoryStore = new MemoryCodexStore();
        const provider = createProvider('reply');
        vi.mocked(provider.ask)
            .mockRejectedValueOnce(new Error('provider down'))
            .mockResolvedValueOnce({ text: 'reply:good', model: 'fake-model' });

        const ctx = createCtx('ignored');
        await runMiddleware(ctx, provider, { autoReply: false, memoryStore });

        await expect(ctx.codex!.ask('bad')).rejects.toThrow('provider down');
        expect(await memoryStore.list('user:42')).toEqual([]);

        await expect(ctx.codex!.ask('good')).resolves.toMatchObject({
            text: 'reply:good',
        });

        const history = await memoryStore.list('user:42');
        expect(history).toEqual([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'good' },
            { role: 'assistant', content: 'reply:good' },
        ]);
    });

    it('should abort timed out provider calls and avoid memory writes', async () => {
        vi.useFakeTimers();

        const memoryStore = new MemoryCodexStore();
        let aborted = false;
        const provider: CodexProvider = {
            name: 'slow',
            ask: vi.fn(
                input =>
                    new Promise((_, reject) => {
                        input.signal?.addEventListener('abort', () => {
                            aborted = true;
                            reject(input.signal?.reason);
                        });
                    })
            ),
        };

        const ctx = createCtx('ignored');
        await runMiddleware(ctx, provider, {
            autoReply: false,
            memoryStore,
            timeoutMs: 10,
        });

        const pending = expect(ctx.codex!.ask('slow prompt')).rejects.toThrow(
            'Codex: Request timed out after 10ms.'
        );
        await vi.advanceTimersByTimeAsync(11);

        await pending;
        expect(aborted).toBe(true);
        expect(await memoryStore.list('user:42')).toEqual([]);
    });

    it('should ignore group auto-reply when botUsername is missing', async () => {
        const provider = createProvider('reply');
        const ctx = createCtx('hello @someone', {
            chat: { id: -100, type: 'supergroup' },
            message: {
                text: 'hello @someone',
                entities: [{ type: 'mention', offset: 6, length: 8 }],
            },
        });

        const next = await runMiddleware(ctx, provider);

        expect(provider.ask).not.toHaveBeenCalled();
        expect(ctx.reply).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledOnce();
    });

    it('should auto-reply in groups only for the configured bot mention', async () => {
        const provider = createProvider('reply');
        const ctx = createCtx('hello @mybot', {
            chat: { id: -100, type: 'supergroup' },
            message: {
                text: 'hello @mybot',
                entities: [{ type: 'mention', offset: 6, length: 6 }],
            },
        });

        const next = await runMiddleware(ctx, provider, { botUsername: 'mybot' });

        expect(next).not.toHaveBeenCalled();
        expect(provider.ask).toHaveBeenCalledOnce();
        expect(ctx.reply).toHaveBeenCalledWith('reply:hello @mybot');
    });

    it('should handle /codex status command without asking the provider', async () => {
        const provider = createProvider('reply');
        const ctx = createCtx('/codex status');

        await runMiddleware(ctx, provider);

        expect(provider.ask).not.toHaveBeenCalled();
        expect(provider.status).toHaveBeenCalledOnce();
        expect(ctx.reply).toHaveBeenCalledWith(
            expect.stringContaining('Codex Status'),
            { parse_mode: 'Markdown' }
        );
    });
});
