import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '../src/logger';
import { createContext, makeCallbackQueryUpdate, makeMessageUpdate } from './helpers/mock';

describe('logger()', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sanitizes control characters in logged message content', async () => {
        const printer = vi.fn();
        const middleware = logger({ printer, timeFormatter: () => '2026-04-15 12:00:00' });
        const { ctx } = createContext(makeMessageUpdate('hello\nworld\u001b[31m'));

        await middleware(ctx as any, async () => {});

        expect(printer).toHaveBeenCalledTimes(1);
        expect(printer.mock.calls[0][0]).toContain('"hello world [31m"');
    });

    it('redacts user-controlled content when configured', async () => {
        const printer = vi.fn();
        const middleware = logger({
            printer,
            redactContent: true,
            timeFormatter: () => '2026-04-15 12:00:00',
        });
        const { ctx } = createContext(makeCallbackQueryUpdate('secret-token'));

        await middleware(ctx as any, async () => {});

        expect(printer.mock.calls[0][0]).toContain('[Button: REDACTED]');
        expect(printer.mock.calls[0][0]).not.toContain('secret-token');
    });

    it('truncates long content previews', async () => {
        const printer = vi.fn();
        const middleware = logger({
            printer,
            maxContentLength: 10,
            timeFormatter: () => '2026-04-15 12:00:00',
        });
        const { ctx } = createContext(makeMessageUpdate('123456789012345'));

        await middleware(ctx as any, async () => {});

        expect(printer.mock.calls[0][0]).toContain('"1234567..."');
    });

    it('redacts token-like secrets and JWTs by default', async () => {
        const printer = vi.fn();
        const middleware = logger({ printer, timeFormatter: () => '2026-04-15 12:00:00' });
        const secretText =
            'Use 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';
        const { ctx } = createContext(makeMessageUpdate(secretText));

        await middleware(ctx as any, async () => {});

        expect(printer.mock.calls[0][0]).toContain('[REDACTED]');
        expect(printer.mock.calls[0][0]).not.toContain(
            '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ123456'
        );
        expect(printer.mock.calls[0][0]).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    });

    it('throws on invalid logger options', () => {
        expect(() => logger({ maxContentLength: 0 })).toThrow('maxContentLength');
        expect(() => logger({ redactPatterns: ['secret'] as any })).toThrow('redactPatterns');
    });
});
