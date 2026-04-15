import { Context } from './context';
import { Middleware } from './composer';

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]+/g;
const DEFAULT_MAX_CONTENT_LENGTH = 120;

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
}

function sanitizeLogValue(value: string, maxLength: number): string {
    const sanitized = value.replace(CONTROL_CHARS_REGEX, ' ').replace(/\s+/g, ' ').trim();
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
        const updateType = Object.keys(ctx.update).filter(k => k !== 'update_id')[0] || 'event';

        // Resolve the sender's display identity.
        let identity = 'Anonymous';
        if (ctx.from) {
            const rawIdentity = ctx.from.username
                ? `@${ctx.from.username}`
                : ctx.from.first_name || String(ctx.from.id);
            identity = sanitizeLogValue(rawIdentity, maxContentLength) || 'Anonymous';
        }

        // Extract a human-readable content summary from the update.
        let content = '';
        const msg = ctx.message as any;

        if (msg?.text) {
            content = options?.redactContent
                ? '[Redacted Message]'
                : `"${sanitizeLogValue(msg.text, maxContentLength)}"`;
        } else if (ctx.update.callback_query?.data) {
            content = options?.redactContent
                ? '[Button: REDACTED]'
                : `[Button: ${sanitizeLogValue(ctx.update.callback_query.data, maxContentLength)}]`;
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
