import { describe, expect, it, vi } from 'vitest';
import { createHash, createHmac, randomBytes } from 'crypto';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { createFetchHandler } from '../src/adapters';
import { Bot } from '../src/bot';
import { prepareRequestPayload } from '../src/multipart';
import {
    constantTimeEqual,
    pathBasename,
    randomHex,
    randomInt,
    utf8ByteLength,
} from '../src/runtime';
import { hmacSha256, sha256, toHex } from '../src/sha256';

const SRC = resolve(__dirname, '..', 'src');
const NODE_BUILTINS = new Set(builtinModules.flatMap(name => [name, `node:${name}`]));

/** Runtime (non type-only) import/export specifiers of a TypeScript source file. */
function runtimeSpecifiers(file: string): string[] {
    const source = readFileSync(file, 'utf8');
    const specifiers: string[] = [];
    const pattern = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
    for (const match of source.matchAll(pattern)) {
        specifiers.push(match[1]);
    }
    return specifiers;
}

function reachableNodeBuiltins(entry: string): Map<string, string[]> {
    const found = new Map<string, string[]>();
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
        const file = queue.pop()!;
        if (seen.has(file)) continue;
        seen.add(file);
        for (const specifier of runtimeSpecifiers(file)) {
            if (specifier.startsWith('.')) {
                queue.push(join(dirname(file), `${specifier}.ts`));
            } else if (NODE_BUILTINS.has(specifier)) {
                const relative = file.slice(SRC.length + 1).replace(/\\/g, '/');
                found.set(relative, [...(found.get(relative) ?? []), specifier]);
            }
        }
    }
    return found;
}

function webhookRequest(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request('https://bot.example/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
    });
}

const update = {
    update_id: 1,
    message: { message_id: 1, date: 1, chat: { id: 9, type: 'private' }, text: 'ping' },
};

describe('runtime neutrality', () => {
    it('the main entry point imports no Node.js built-in modules at load time', () => {
        // Node-only features (file downloads, the built-in webhook server, stream
        // responses) load their modules lazily, so edge runtimes can import vibegram.
        expect(Object.fromEntries(reachableNodeBuiltins(join(SRC, 'index.ts')))).toEqual({});
    });

    it('sha256 and hmacSha256 match node:crypto', () => {
        for (let length = 0; length < 200; length += 7) {
            const message = randomBytes(length);
            const key = randomBytes((length * 3) % 130);
            expect(toHex(sha256(message))).toBe(createHash('sha256').update(message).digest('hex'));
            expect(toHex(hmacSha256(key, message))).toBe(
                createHmac('sha256', key).update(message).digest('hex')
            );
        }
        expect(toHex(hmacSha256('WebAppData', 'ünïcødé 🔥'))).toBe(
            createHmac('sha256', 'WebAppData').update('ünïcødé 🔥').digest('hex')
        );
    });

    it('runtime helpers behave like their Node.js counterparts', () => {
        expect(utf8ByteLength('ünï 🔥')).toBe(Buffer.byteLength('ünï 🔥'));
        expect(constantTimeEqual('secret', 'secret')).toBe(true);
        expect(constantTimeEqual('secret', 'secreT')).toBe(false);
        expect(constantTimeEqual('secret', 'secrets')).toBe(false);
        expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/);
        for (let i = 0; i < 50; i++) {
            const value = randomInt(1, 10);
            expect(value).toBeGreaterThanOrEqual(1);
            expect(value).toBeLessThan(10);
        }
        expect(pathBasename('/tmp/a/report.pdf')).toBe('report.pdf');
        expect(pathBasename('C:\\Users\\a\\notes.txt')).toBe('notes.txt');
    });

    it('uploads plain Uint8Array data (no Buffer required)', async () => {
        const prepared = prepareRequestPayload({
            chat_id: 1,
            document: { source: new TextEncoder().encode('hello'), filename: 'a.txt' },
            photo: new Uint8Array([1, 2, 3]),
        });
        const chunks: number[] = [];
        for await (const chunk of prepared.body as AsyncIterable<Uint8Array>) chunks.push(...chunk);
        const body = new TextDecoder().decode(new Uint8Array(chunks));

        expect(prepared.isMultipart).toBe(true);
        expect(body).toContain('filename="a.txt"');
        expect(body).toContain('hello');
        expect(body).toContain('name="photo"; filename="photo"');
    });
});

describe('createFetchHandler', () => {
    function makeBot() {
        const bot = new Bot('123:abc');
        const handled = vi.fn();
        bot.on(':text', ctx => handled(ctx.message.text));
        return { bot, handled };
    }

    it('handles a valid update and responds 200', async () => {
        const { bot, handled } = makeBot();
        const res = await createFetchHandler(bot, { secretToken: 's3cret' })(
            webhookRequest(update, { 'x-telegram-bot-api-secret-token': 's3cret' })
        );
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('OK');
        expect(handled).toHaveBeenCalledWith('ping');
    });

    it('rejects a wrong secret, non-POST, non-JSON, bad JSON, and invalid updates', async () => {
        const { bot, handled } = makeBot();
        const handler = createFetchHandler(bot, { secretToken: 's3cret' });
        const auth = { 'x-telegram-bot-api-secret-token': 's3cret' };

        expect(
            (await handler(webhookRequest(update, { 'x-telegram-bot-api-secret-token': 'x' })))
                .status
        ).toBe(403);
        expect((await handler(new Request('https://bot.example/webhook'))).status).toBe(405);
        expect(
            (await handler(webhookRequest(update, { ...auth, 'content-type': 'text/plain' })))
                .status
        ).toBe(415);
        expect((await handler(webhookRequest('{not json', auth))).status).toBe(400);
        expect((await handler(webhookRequest({ hello: 1 }, auth))).status).toBe(400);
        expect(handled).not.toHaveBeenCalled();
    });

    it('enforces maxBodySizeBytes', async () => {
        const { bot } = makeBot();
        const handler = createFetchHandler(bot, { maxBodySizeBytes: 50 });
        const res = await handler(webhookRequest({ ...update, padding: 'x'.repeat(200) }));
        expect(res.status).toBe(413);
    });

    it('serves the health path without processing updates', async () => {
        const { bot } = makeBot();
        const res = await createFetchHandler(bot, { healthPath: '/health' })(
            new Request('https://bot.example/health')
        );
        expect(res.status).toBe(200);
    });

    it('returns 500 when the handler throws and there is no waitUntil', async () => {
        const bot = new Bot('123:abc');
        bot.use(() => {
            throw new Error('boom');
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = await createFetchHandler(bot)(webhookRequest(update));
        expect(res.status).toBe(500);
    });

    it('acknowledges immediately and hands work to waitUntil', async () => {
        const bot = new Bot('123:abc');
        let release!: () => void;
        const gate = new Promise<void>(resolve => (release = resolve));
        const done = vi.fn();
        bot.use(async () => {
            await gate;
            done();
        });

        const pending: Promise<unknown>[] = [];
        const res = await createFetchHandler(bot, { waitUntil: p => pending.push(p) })(
            webhookRequest(update)
        );

        expect(res.status).toBe(200);
        expect(done).not.toHaveBeenCalled();
        release();
        await Promise.all(pending);
        expect(done).toHaveBeenCalledTimes(1);
    });
});
