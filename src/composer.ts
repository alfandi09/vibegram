import { Context } from './context';

export type NextFunction = () => Promise<void>;
export type Middleware<C extends Context = Context> = (
    ctx: C,
    next: NextFunction
) => Promise<void> | void;

/**
 * Composer is responsible for building and executing the middleware stack.
 */
export class Composer<C extends Context> {
    private middlewares: Middleware<C>[] = [];

    private static cloneTriggerRegex(regex: RegExp): RegExp {
        return new RegExp(regex.source, regex.flags);
    }

    /**
     * Register a general middleware.
     */
    use(...fns: Middleware<C>[]): this {
        this.middlewares.push(...fns);
        return this;
    }

    /**
     * Register a middleware that triggers only when the message is a specific command (e.g. /start).
     * Supports command names suffixed with the bot username and multi-command arrays.
     */
    command(command: string | string[], ...fns: Middleware<C>[]): this {
        const commands = Array.isArray(command) ? command : [command];

        return this.use((ctx, next) => {
            const msg = ctx.message;
            if (!msg || !msg.text) return next();

            const text = msg.text;
            if (!text.startsWith('/')) return next();

            const parts = text.split(' ');
            const cmd = parts[0].substring(1).split('@')[0];

            if (commands.includes(cmd)) {
                // Inject parsed command arguments into the context object.
                ctx.command = { name: cmd, args: parts.slice(1) };
                return Composer.compose(fns)(ctx, next);
            }
            return next();
        });
    }

    /**
     * Convenience alias for command('start', ...fns).
     */
    start(...fns: Middleware<C>[]): this {
        return this.command('start', ...fns);
    }

    /**
     * Convenience alias for command('help', ...fns).
     */
    help(...fns: Middleware<C>[]): this {
        return this.command('help', ...fns);
    }

    /**
     * Convenience alias for command('settings', ...fns).
     */
    settings(...fns: Middleware<C>[]): this {
        return this.command('settings', ...fns);
    }

    /**
     * Register a middleware that triggers only on specific Update types or Message sub-properties.
     * Examples: 'message', 'callback_query', 'photo', 'audio', 'document'.
     */
    on(updateType: string | string[], ...fns: Middleware<C>[]): this {
        const types = Array.isArray(updateType) ? updateType : [updateType];

        return this.use((ctx, next) => {
            const hasMatch = types.some(type => {
                // 1. Check for the property at the Update root level (e.g. 'message', 'callback_query').
                if ((ctx.update as any)[type] !== undefined) return true;

                // 2. Check for the property at the Message level (e.g. 'photo', 'document', 'text').
                if (ctx.message && (ctx.message as any)[type] !== undefined) return true;

                return false;
            });

            if (hasMatch) return Composer.compose(fns)(ctx, next);
            return next();
        });
    }

    /**
     * Register a middleware that listens to specific text messages or regex patterns.
     * When a RegExp is matched, the result is injected into ctx.match.
     */
    hears(trigger: string | RegExp | (string | RegExp)[], ...fns: Middleware<C>[]): this {
        const triggers = Array.isArray(trigger) ? trigger : [trigger];

        return this.use((ctx, next) => {
            // Search for text in regular messages, edited messages, and media captions.
            const text =
                ctx.message?.text ||
                (ctx.update as any).edited_message?.text ||
                ctx.message?.caption;
            if (!text) return next();

            for (const t of triggers) {
                if (typeof t === 'string') {
                    if (text === t) {
                        ctx.match = null; // String match — no capture groups.
                        return Composer.compose(fns)(ctx, next);
                    }
                } else if (t instanceof RegExp) {
                    const match = Composer.cloneTriggerRegex(t).exec(text);
                    if (match) {
                        ctx.match = match; // Inject full RegExpMatchArray with capture groups.
                        return Composer.compose(fns)(ctx, next);
                    }
                }
            }
            return next();
        });
    }

    /**
     * Register a middleware for inline keyboard button presses (callback queries).
     * When a RegExp is matched, the result is injected into ctx.match.
     */
    action(trigger: string | RegExp | (string | RegExp)[], ...fns: Middleware<C>[]): this {
        const triggers = Array.isArray(trigger) ? trigger : [trigger];

        return this.use((ctx, next) => {
            const cbQuery = ctx.update.callback_query;
            if (!cbQuery || cbQuery.data === undefined) return next();

            const data = cbQuery.data as string;

            for (const t of triggers) {
                if (typeof t === 'string') {
                    if (data === t) {
                        ctx.match = null;
                        return Composer.compose(fns)(ctx, next);
                    }
                } else if (t instanceof RegExp) {
                    const match = Composer.cloneTriggerRegex(t).exec(data);
                    if (match) {
                        ctx.match = match; // Inject capture groups for pattern-based button routing.
                        return Composer.compose(fns)(ctx, next);
                    }
                }
            }
            return next();
        });
    }

    /**
     * Compose multiple middlewares into a single executable function (Koa-style onion model).
     */
    static compose<C extends Context>(middlewares: Middleware<C>[]): Middleware<C> {
        return function (ctx: C, next: NextFunction): Promise<void> {
            let index = -1;
            function dispatch(i: number): Promise<void> {
                if (i <= index) return Promise.reject(new Error('next() called multiple times'));
                index = i;
                let fn = middlewares[i];
                if (i === middlewares.length) fn = next as any;
                if (!fn) return Promise.resolve();
                try {
                    return Promise.resolve(fn(ctx, dispatch.bind(null, i + 1)));
                } catch (err) {
                    return Promise.reject(err);
                }
            }
            return dispatch(0);
        };
    }

    /**
     * Returns an executable middleware combining all registered middlewares.
     */
    middleware(): Middleware<C> {
        return Composer.compose(this.middlewares);
    }
}
