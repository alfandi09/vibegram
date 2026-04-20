import { Context } from './context';
import { Middleware } from './composer';

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]+/g;
const DEFAULT_MAX_CONTENT_LENGTH = 120;
const DEFAULT_REDACT_PATTERNS = [
    /\b\d{6,}:[A-Za-z0-9_-]{20,}\b/g,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
];

export interface LoggerOptions {
    /**
     * Custom output adapter. Defaults to console.log.
     * Can be wired to Winston, Pino, or any structured logger.
     */
    printer?: (message: string) => void;
    /** Custom timestamp formatter. Defaults to ISO 8601 without milliseconds. */
    timeFormatter?: () => string;
    /** Replace message text and callback data with a generic placeholder. */
    redactContent?: boolean;
    /** Maximum number of characters retained from user-controlled content. */
    maxContentLength?: number;
    /** Additional patterns to redact from user-controlled content before logging. */
    redactPatterns?: RegExp[];
}

function assertLoggerOptions(options?: LoggerOptions): RegExp[] {
    if (options?.maxContentLength !== undefined) {
        if (!Number.isInteger(options.maxContentLength) || options.maxContentLength <= 0) {
            throw new TypeError('Logger option "maxContentLength" must be a positive integer.');
        }
    }

    if (options?.redactPatterns !== undefined && !Array.isArray(options.redactPatterns)) {
        throw new TypeError('Logger option "redactPatterns" must be an array of RegExp values.');
    }

    const customPatterns = options?.redactPatterns ?? [];
    for (const pattern of customPatterns) {
        if (!(pattern instanceof RegExp)) {
            throw new TypeError('Logger option "redactPatterns" must contain only RegExp values.');
        }
    }

    return [...DEFAULT_REDACT_PATTERNS, ...customPatterns];
}

function sanitizeLogValue(value: string, maxLength: number, redactPatterns: RegExp[]): string {
    let sanitized = value.replace(CONTROL_CHARS_REGEX, ' ').replace(/\s+/g, ' ').trim();

    for (const pattern of redactPatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    if (sanitized.length <= maxLength) {
        return sanitized;
    }

    return `${sanitized.slice(0, Math.max(0, maxLength - 3))}...`;
}

/**
 * Request telemetry logger middleware.
 * Records the update type, sender identity, message content, and processing latency.
 */
export function logger(options?: LoggerOptions): Middleware<any> {
    const redactPatterns = assertLoggerOptions(options);

    return async (ctx: Context, next: () => Promise<void>) => {
        const start = Date.now();
        const maxContentLength = options?.maxContentLength ?? DEFAULT_MAX_CONTENT_LENGTH;

        // Let the downstream middleware chain execute first.
        await next();

        // Measure total processing latency.
        const ms = Date.now() - start;

        // Format the timestamp.
        const time = options?.timeFormatter
            ? options.timeFormatter()
            : new Date().toISOString().replace('T', ' ').substring(0, 19); // "2026-04-06 01:25:30"

        // Extract the primary update type key (e.g. "message", "callback_query").
        const updateType = ctx.updateType;

        // Resolve the sender's display identity.
        let identity = 'Anonymous';
        if (ctx.from) {
            const rawIdentity = ctx.from.username
                ? `@${ctx.from.username}`
                : ctx.from.first_name || String(ctx.from.id);
            identity =
                sanitizeLogValue(rawIdentity, maxContentLength, redactPatterns) || 'Anonymous';
        }

        // Extract a human-readable content summary from the update.
        let content = '';
        const msg = ctx.message as any;

        if (msg?.text) {
            content = options?.redactContent
                ? '[Redacted Message]'
                : `"${sanitizeLogValue(msg.text, maxContentLength, redactPatterns)}"`;
        } else if (ctx.update.callback_query?.data) {
            content = options?.redactContent
                ? '[Button: REDACTED]'
                : `[Button: ${sanitizeLogValue(ctx.update.callback_query.data, maxContentLength, redactPatterns)}]`;
        } else if (msg?.photo) content = `[Photo]`;
        else if (msg?.document) content = `[Document]`;
        else if (msg?.contact) content = `[Contact]`;
        else if (msg?.location) content = `[Location]`;
        else content = `[External Event: ${updateType}]`;

        // Assemble and emit the log line.
        const logMsg = `[${time}] [${updateType.toUpperCase()}] ${identity}  ➔  ${content} (${ms}ms)`;

        if (options?.printer) {
            options.printer(logMsg);
        } else {
            console.log(logMsg);
        }
    };
}
