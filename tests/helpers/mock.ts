/**
 * Test helper factories.
 * Creates lightweight mock objects that simulate the Telegram API environment
 * without making real HTTP calls.
 */

import { vi } from 'vitest';
import { Context } from '../../src/context';
import { TelegramClient } from '../../src/client';
import { Update } from '../../src/types';

// ---------------------------------------------------------------------------
// Mock TelegramClient
// ---------------------------------------------------------------------------

/**
 * Creates a mock TelegramClient whose callApi is a spy.
 * By default it resolves to an empty object ({}).
 * Override with `mockResolvedValueOnce` for specific method responses.
 */
export function createMockClient(resolveValue: any = {}): TelegramClient {
    const client = Object.create(TelegramClient.prototype) as TelegramClient;
    (client as any)._token = 'test-token:AABBCC';
    (client as any).callApi = vi.fn().mockResolvedValue(resolveValue);
    return client;
}

// ---------------------------------------------------------------------------
// Update factories
// ---------------------------------------------------------------------------

export function makeMessageUpdate(text: string, overrides: Partial<any> = {}): Update {
    return {
        update_id: 1,
        message: {
            message_id: 100,
            date: Math.floor(Date.now() / 1000),
            text,
            from: {
                id: 42,
                is_bot: false,
                first_name: 'Test',
                username: 'testuser',
                language_code: 'en',
            },
            chat: {
                id: 99,
                type: 'private',
                first_name: 'Test',
            },
            ...overrides,
        },
    } as Update;
}

export function makeCommandUpdate(command: string, args: string[] = []): Update {
    const argStr = args.length > 0 ? ' ' + args.join(' ') : '';
    return makeMessageUpdate(`/${command}${argStr}`);
}

export function makeCallbackQueryUpdate(data: string): Update {
    return {
        update_id: 2,
        callback_query: {
            id: 'cbq-1',
            from: { id: 42, is_bot: false, first_name: 'Test', username: 'testuser' },
            data,
            chat_instance: 'ci-1',
            message: {
                message_id: 100,
                date: Math.floor(Date.now() / 1000),
                chat: { id: 99, type: 'private' },
                from: { id: 1, is_bot: true, first_name: 'Bot' },
                text: 'pick one',
            },
        },
    } as unknown as Update;
}

export function makePhotoUpdate(): Update {
    return {
        update_id: 3,
        message: {
            message_id: 101,
            date: Math.floor(Date.now() / 1000),
            from: { id: 42, is_bot: false, first_name: 'Test' },
            chat: { id: 99, type: 'private' },
            photo: [
                { file_id: 'photo1', file_unique_id: 'u1', width: 90, height: 90, file_size: 1000 },
            ],
        },
    } as Update;
}

export function makeGroupMessageUpdate(text: string): Update {
    return {
        update_id: 4,
        message: {
            message_id: 102,
            date: Math.floor(Date.now() / 1000),
            text,
            from: { id: 42, is_bot: false, first_name: 'Test' },
            chat: { id: -100, type: 'supergroup', title: 'Test Group' },
        },
    } as Update;
}

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

/**
 * Creates a Context from an Update with a mock client.
 * The callApi spy resolves to `apiReturnValue` by default.
 */
export function createContext(update: Update, apiReturnValue: any = { message_id: 200 }): { ctx: Context; client: TelegramClient } {
    const client = createMockClient(apiReturnValue);
    const ctx = new Context(update, client);
    return { ctx, client };
}

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

/** Creates a spy next() function for middleware testing. */
export function createNext(): { next: () => Promise<void>; called: () => boolean } {
    let wasCalled = false;
    const next = vi.fn(async () => { wasCalled = true; });
    return {
        next,
        called: () => wasCalled,
    };
}
