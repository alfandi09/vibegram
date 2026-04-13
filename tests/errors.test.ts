import { describe, it, expect } from 'vitest';
import {
    VibeGramError,
    TelegramApiError,
    NetworkError,
    RateLimitError,
    InvalidTokenError,
    WebAppValidationError,
    ConversationTimeoutError,
} from '../src/errors';

// ---------------------------------------------------------------------------
// instanceof chain
// ---------------------------------------------------------------------------
describe('Error hierarchy — instanceof checks', () => {
    it('TelegramApiError instanceof VibeGramError and Error', () => {
        const err = new TelegramApiError('Bad request', 400, 'Bad Request');
        expect(err).toBeInstanceOf(TelegramApiError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });

    it('NetworkError instanceof VibeGramError and Error', () => {
        const err = new NetworkError('Timeout');
        expect(err).toBeInstanceOf(NetworkError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });

    it('RateLimitError instanceof VibeGramError and Error', () => {
        const err = new RateLimitError(30);
        expect(err).toBeInstanceOf(RateLimitError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });

    it('InvalidTokenError instanceof VibeGramError and Error', () => {
        const err = new InvalidTokenError();
        expect(err).toBeInstanceOf(InvalidTokenError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });

    it('WebAppValidationError instanceof VibeGramError and Error', () => {
        const err = new WebAppValidationError('Invalid hash');
        expect(err).toBeInstanceOf(WebAppValidationError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });

    it('ConversationTimeoutError instanceof VibeGramError and Error', () => {
        const err = new ConversationTimeoutError(123);
        expect(err).toBeInstanceOf(ConversationTimeoutError);
        expect(err).toBeInstanceOf(VibeGramError);
        expect(err).toBeInstanceOf(Error);
    });
});

// ---------------------------------------------------------------------------
// Error properties
// ---------------------------------------------------------------------------
describe('Error properties', () => {
    it('TelegramApiError exposes errorCode and description', () => {
        const err = new TelegramApiError('msg', 403, 'Forbidden');
        expect(err.errorCode).toBe(403);
        expect(err.description).toBe('Forbidden');
        expect(err.code).toBe('TELEGRAM_403');
        expect(err.name).toBe('TelegramApiError');
    });

    it('RateLimitError exposes retryAfter', () => {
        const err = new RateLimitError(60);
        expect(err.retryAfter).toBe(60);
        expect(err.message).toContain('60s');
        expect(err.code).toBe('RATE_LIMIT');
    });

    it('NetworkError exposes originalError', () => {
        const original = new Error('ECONNRESET');
        const err = new NetworkError('Connection failed', original);
        expect(err.originalError).toBe(original);
    });

    it('ConversationTimeoutError exposes chatId', () => {
        const err = new ConversationTimeoutError(777);
        expect(err.chatId).toBe(777);
        expect(err.code).toBe('CONVERSATION_TIMEOUT');
    });

    it('InvalidTokenError has correct code', () => {
        const err = new InvalidTokenError();
        expect(err.code).toBe('INVALID_TOKEN');
    });

    it('WebAppValidationError has correct code', () => {
        const err = new WebAppValidationError('Bad hash');
        expect(err.code).toBe('WEBAPP_INVALID');
        expect(err.message).toBe('Bad hash');
    });

    it('error.name is set correctly on all classes', () => {
        expect(new VibeGramError('x').name).toBe('VibeGramError');
        expect(new TelegramApiError('x', 400, 'x').name).toBe('TelegramApiError');
        expect(new NetworkError('x').name).toBe('NetworkError');
        expect(new RateLimitError(1).name).toBe('RateLimitError');
        expect(new InvalidTokenError().name).toBe('InvalidTokenError');
        expect(new WebAppValidationError('x').name).toBe('WebAppValidationError');
        expect(new ConversationTimeoutError(1).name).toBe('ConversationTimeoutError');
    });
});
