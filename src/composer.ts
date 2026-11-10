import { Context } from './context';
import { Filter, FilterQuery, isFilterQuery, matchFilterQuery } from './filter-query';
import type { Chat, MessageEntity, ReactionType } from './types';

export type NextFunction = () => Promise<void>;
export type Middleware<C extends Context = Context> = (
    ctx: C,
    next: NextFunction
) => Promise<void> | void;

/** Predicate used by filter(), drop(), and branch(). May be async. */
export type Predicate<C> = (ctx: C) => boolean | Promise<boolean>;

/** Middleware or array of middleware, as accepted by lazy() and route(). */
export type MaybeArray<T> = T | readonly T[];

/** Context narrowed to a chat type by chatType(). */
export type ChatTypeContext<C, T extends Chat['type']> = C & {
    readonly chat: Chat & { type: T };
};

/** A reaction trigger: an emoji string, or a full ReactionType object. */
export type ReactionTrigger = string | ReactionType;

function toArray<T>(value: MaybeArray<T>): T[] {
    return Array.isArray(value) ? [...(value as readonly T[])] : [value as T];
}

function reactionKey(reaction: ReactionType): string {
    switch (reaction.type) {
        case 'emoji':
            return `emoji:${reaction.emoji}`;
        case 'custom_emoji':
            return `custom_emoji:${reaction.custom_emoji_id}`;
        default:
            return reaction.type;
    }
}

export interface ComposerOptions {
    /**
     * Bot username used to route Telegram commands suffixed as `/start@bot`.
     * Commands targeting a different bot are ignored.
     */
    botUsername?: string;
    /**
     * Whether command() also runs for edited messages and edited channel posts.
     * Defaults to true for backward compatibility; set false so editing an old
     * "/start" message does not re-run the command. Planned default for 3.0: false.
     */
    commandsOnEditedMessages?: boolean;
}

const EDITED_UPDATE_KEYS = [
    'edited_message',
    'edited_channel_post',
    'edited_business_message',
] as const;

interface ParsedCommand {
    name: string;
    target?: string;
    args: string[];
}

function normalizeBotUsername(username: string | undefined): string | undefined {
    const normalized = username?.replace(/^@/, '').trim().toLowerCase();
    return normalized || undefined;
}

function parseTelegramCommand(text: string): ParsedCommand | undefined {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return undefined;

    const [rawCommand, ...args] = trimmed.split(/\s+/);
    const commandText = rawCommand.slice(1);
    if (!commandText) return undefined;

    const separatorIndex = commandText.indexOf('@');
    if (separatorIndex === -1) {
        return { name: commandText, args };
    }

    const name = commandText.slice(0, separatorIndex);
    const target = normalizeBotUsername(commandText.slice(separatorIndex + 1));
    if (!name || !target) return undefined;

    return { name, target, args };
}

/**
 * Composer is responsible for building and executing the middleware stack.
 */
export class Composer<C extends Context> {
    private middlewares: Middleware<C>[] = [];
    private botUsername?: string;
    protected commandsOnEditedMessages: boolean;

    constructor(options?: ComposerOptions) {
        this.setBotUsername(options?.botUsername);
        this.commandsOnEditedMessages = options?.commandsOnEditedMessages ?? true;
    }

    private static cloneTriggerRegex(regex: RegExp): RegExp {
        if (!regex.global && !regex.sticky) {
            return regex;
        }

        return new RegExp(regex.source, regex.flags);
    }

    protected setBotUsername(username: string | undefined): void {
        this.botUsername = normalizeBotUsername(username);
    }

    private acceptsCommandTarget(target: string | undefined): boolean {
        if (!target) return true;
        return this.botUsername !== undefined && target === this.botUsername;
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
            if (
                !this.commandsOnEditedMessages &&
                EDITED_UPDATE_KEYS.some(key => ctx.update[key] !== undefined)
            ) {
                return next();
            }

            const parsed = parseTelegramCommand(msg.text);
            if (!parsed || !this.acceptsCommandTarget(parsed.target)) return next();

            if (commands.includes(parsed.name)) {
                // Inject parsed command arguments into the context object.
                ctx.command = { name: parsed.name, args: parsed.args };
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
     *
     * Filter queries narrow `ctx` types:
     * `bot.on('message:photo', ctx => ctx.message.photo)` or `bot.on(':text', ...)`
     * (any message-like update). Legacy names such as `'photo'` still match
     * `ctx.message.photo` but do not narrow types.
     */
    on<Q extends FilterQuery>(query: Q | readonly Q[], ...fns: Middleware<Filter<C, Q>>[]): this;
    on(updateType: string | readonly string[], ...fns: Middleware<C>[]): this;
    on(updateType: string | readonly string[], ...handlers: Middleware<never>[]): this {
        const types: readonly string[] = typeof updateType === 'string' ? [updateType] : updateType;
        // Safe: a handler only runs after its filter query matched, so ctx has the narrowed shape.
        const fns = handlers as unknown as Middleware<C>[];
        // Filter queries are validated (and compiled) once, at registration time.
        const matchers = new Map(
            types.filter(isFilterQuery).map(type => [type, matchFilterQuery(type)] as const)
        );

        return this.use((ctx, next) => {
            const hasMatch = types.some(type => {
                const matcher = matchers.get(type);
                if (matcher) return matcher(ctx.update);

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
     * Run the middleware only when the predicate returns true; otherwise continue.
     * A type-guard predicate narrows `ctx` for the handlers.
     *
     * @example
     * ```typescript
     * bot.filter(ctx => ctx.from?.id === ADMIN_ID, adminRouter.middleware());
     * ```
     */
    filter<D extends C>(predicate: (ctx: C) => ctx is D, ...fns: Middleware<D>[]): this;
    filter(predicate: Predicate<C>, ...fns: Middleware<C>[]): this;
    filter(predicate: Predicate<C>, ...fns: Middleware<never>[]): this {
        const handlers = Composer.compose(fns as unknown as Middleware<C>[]);
        return this.use(async (ctx, next) => {
            if (await predicate(ctx)) return handlers(ctx, next);
            return next();
        });
    }

    /**
     * Inverse of filter(): run the middleware only when the predicate returns false.
     */
    drop(predicate: Predicate<C>, ...fns: Middleware<C>[]): this {
        return this.filter(async ctx => !(await predicate(ctx)), ...fns);
    }

    /**
     * Route every update to exactly one of two middleware.
     */
    branch(
        predicate: Predicate<C>,
        trueMiddleware: Middleware<C>,
        falseMiddleware: Middleware<C>
    ): this {
        return this.use(async (ctx, next) =>
            (await predicate(ctx)) ? trueMiddleware(ctx, next) : falseMiddleware(ctx, next)
        );
    }

    /**
     * Run the middleware concurrently with the rest of the chain instead of
     * before it. Both sides are awaited, and an error from either side rejects.
     * Calling next() inside forked middleware does nothing.
     */
    fork(...fns: Middleware<C>[]): this {
        const handlers = Composer.compose(fns);
        return this.use((ctx, next) =>
            Promise.all([handlers(ctx, async () => {}), next()]).then(() => undefined)
        );
    }

    /**
     * Build the middleware per update, e.g. to pick handlers from runtime state.
     */
    lazy(
        factory: (ctx: C) => MaybeArray<Middleware<C>> | Promise<MaybeArray<Middleware<C>>>
    ): this {
        return this.use(async (ctx, next) =>
            Composer.compose(toArray(await factory(ctx)))(ctx, next)
        );
    }

    /**
     * Pick one middleware by key. Updates whose key has no route go to the
     * fallback, or continue down the chain when no fallback is given.
     *
     * @example
     * ```typescript
     * bot.route(ctx => ctx.session?.step, {
     *     name: ctx => ctx.reply('Your name?'),
     *     age: ctx => ctx.reply('Your age?'),
     * });
     * ```
     */
    route<K extends string>(
        router: (ctx: C) => K | undefined | Promise<K | undefined>,
        routes: Partial<Record<K, MaybeArray<Middleware<C>>>>,
        fallback?: MaybeArray<Middleware<C>>
    ): this {
        return this.use(async (ctx, next) => {
            const key = await router(ctx);
            const target =
                key !== undefined && Object.prototype.hasOwnProperty.call(routes, key)
                    ? routes[key]
                    : fallback;
            if (!target) return next();
            return Composer.compose(toArray(target))(ctx, next);
        });
    }

    /**
     * Catch errors thrown by the wrapped middleware only. Errors from handlers
     * further down the chain (reached via next()) still propagate to bot.catch().
     */
    errorBoundary(
        handler: (error: unknown, ctx: C) => void | Promise<void>,
        ...fns: Middleware<C>[]
    ): this {
        const handlers = Composer.compose(fns);
        return this.use(async (ctx, next) => {
            let downstreamError: { error: unknown } | undefined;
            try {
                await handlers(ctx, async () => {
                    try {
                        await next();
                    } catch (error) {
                        downstreamError = { error };
                        throw error;
                    }
                });
            } catch (error) {
                if (downstreamError && downstreamError.error === error) throw error;
                await handler(error, ctx);
            }
        });
    }

    /**
     * Run the middleware only in chats of the given type(s). Narrows `ctx.chat`.
     *
     * @example
     * ```typescript
     * bot.chatType('private', ctx => ctx.reply('DM only'));
     * bot.chatType(['group', 'supergroup'], groupRouter.middleware());
     * ```
     */
    chatType<T extends Chat['type']>(
        type: MaybeArray<T>,
        ...fns: Middleware<ChatTypeContext<C, T>>[]
    ): this {
        const types = new Set<string>(toArray(type));
        return this.filter(
            (ctx): ctx is ChatTypeContext<C, T> =>
                ctx.chat !== undefined && types.has(ctx.chat.type),
            ...fns
        );
    }

    /**
     * Run the middleware when a user adds one of the given reactions to a message
     * (`message_reaction` updates). Requires "message_reaction" in allowed_updates.
     *
     * @example
     * ```typescript
     * bot.reaction('👍', ctx => ctx.reply('Thanks!'));
     * ```
     */
    reaction(reaction: MaybeArray<ReactionTrigger>, ...fns: Middleware<C>[]): this {
        const wanted = new Set(
            toArray(reaction).map(item =>
                typeof item === 'string'
                    ? reactionKey({ type: 'emoji', emoji: item })
                    : reactionKey(item)
            )
        );
        return this.filter(
            ctx => {
                const update = ctx.update.message_reaction;
                if (!update) return false;
                const previous = new Set(update.old_reaction.map(reactionKey));
                return update.new_reaction.some(item => {
                    const key = reactionKey(item);
                    return wanted.has(key) && !previous.has(key);
                });
            },
            ...fns
        );
    }

    /**
     * Run the middleware when the message text or caption contains an entity of
     * the given type(s), e.g. 'url', 'hashtag', 'mention', or 'bot_command'.
     */
    entity(type: MaybeArray<MessageEntity['type']>, ...fns: Middleware<C>[]): this {
        const types = new Set<string>(toArray(type));
        return this.filter(
            ctx => {
                const message = ctx.message;
                const entities = [
                    ...(message?.entities ?? []),
                    ...(message?.caption_entities ?? []),
                ];
                return entities.some(item => types.has(item.type));
            },
            ...fns
        );
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
