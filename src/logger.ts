import { Context } from './context';
import { Middleware } from './composer';

export interface LoggerOptions {
    /**
     * Custom output adapter. Defaults to console.log.
     * Can be wired to Winston, Pino, or any structured logger.
     */
    printer?: (message: string) => void;
    /** Custom timestamp formatter. Defaults to ISO 8601 without milliseconds. */
    timeFormatter?: () => string;
}

/**
 * Request telemetry logger middleware.
 * Records the update type, sender identity, message content, and processing latency.
 */
export function logger(options?: LoggerOptions): Middleware<any> {
    return async (ctx: Context, next: () => Promise<void>) => {
        const start = Date.now();

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
            identity = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || String(ctx.from.id));
        }

        // Extract a human-readable content summary from the update.
        let content = '';
        const msg = ctx.message as any;

        if (msg?.text) content = `"${msg.text}"`;
        else if (ctx.update.callback_query?.data) content = `[Button: ${ctx.update.callback_query.data}]`;
        else if (msg?.photo) content = `[Photo]`;
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
