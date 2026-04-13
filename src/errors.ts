/**
 * VibeGram Error Hierarchy
 * 
 * All VibeGram errors extend VibeGramError, enabling precise error handling:
 * 
 * ```typescript
 * bot.catch((err, ctx) => {
 *     if (err instanceof TelegramApiError) {
 *         console.log(err.errorCode, err.description);
 *     } else if (err instanceof RateLimitError) {
 *         console.log(`Retry after ${err.retryAfter}s`);
 *     }
 * });
 * ```
 */

/** Base class for all VibeGram-specific errors. */
export class VibeGramError extends Error {
    constructor(message: string, public readonly code?: string) {
        super(message);
        this.name = 'VibeGramError';
        // Maintain proper prototype chain for instanceof checks.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when the Telegram Bot API returns a non-OK response.
 * Examples: 400 Bad Request, 403 Forbidden, 404 Not Found.
 */
export class TelegramApiError extends VibeGramError {
    constructor(
        message: string,
        public readonly errorCode: number,
        public readonly description: string
    ) {
        super(message, `TELEGRAM_${errorCode}`);
        this.name = 'TelegramApiError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a network-level failure occurs (timeout, DNS, connection refused).
 * Wraps the original axios/fetch error for inspection.
 */
export class NetworkError extends VibeGramError {
    constructor(message: string, public readonly originalError?: Error) {
        super(message, 'NETWORK_ERROR');
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown (or emitted) when Telegram returns HTTP 429 and all retries are exhausted.
 */
export class RateLimitError extends VibeGramError {
    constructor(public readonly retryAfter: number) {
        super(`Rate limit exceeded. Retry after ${retryAfter}s.`, 'RATE_LIMIT');
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown during bot.launch() when the provided bot token is rejected by Telegram.
 */
export class InvalidTokenError extends VibeGramError {
    constructor() {
        super('Bot token is invalid or unauthorized.', 'INVALID_TOKEN');
        this.name = 'InvalidTokenError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown by WebAppUtils.validate() when initData verification fails.
 */
export class WebAppValidationError extends VibeGramError {
    constructor(message: string) {
        super(message, 'WEBAPP_INVALID');
        this.name = 'WebAppValidationError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when a Conversation's wait() call exceeds its timeout.
 */
export class ConversationTimeoutError extends VibeGramError {
    constructor(public readonly chatId: number) {
        super(`Conversation timed out for chat ${chatId}.`, 'CONVERSATION_TIMEOUT');
        this.name = 'ConversationTimeoutError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
