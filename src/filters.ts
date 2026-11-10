import { Context } from './context';
import { Composer, Middleware, NextFunction } from './composer';

/**
 * Filter function type — returns true if the update matches the condition.
 */
export type FilterFn<C extends Context = Context> = (ctx: C) => boolean | Promise<boolean>;

/**
 * Synchronous predicate that narrows a Context subtype for guarded handlers.
 */
export type TypeGuardFn<C extends Context, Narrowed extends C> = (ctx: C) => ctx is Narrowed;

/**
 * Run middleware only when a filter passes. Type-guard predicates narrow the
 * context type inside the guarded handlers.
 *
 * @example
 * ```typescript
 * type TextContext = Context & { message: Message & { text: string } };
 *
 * const hasTextMessage = (ctx: Context): ctx is TextContext =>
 *     typeof ctx.message?.text === 'string';
 *
 * bot.on('message', guard(hasTextMessage, ctx => {
 *     return ctx.reply(ctx.message.text.toUpperCase());
 * }));
 * ```
 */
export function guard<C extends Context, Narrowed extends C>(
    filter: TypeGuardFn<C, Narrowed>,
    ...fns: Middleware<Narrowed>[]
): Middleware<C>;
export function guard<C extends Context = Context>(
    filter: FilterFn<C>,
    ...fns: Middleware<C>[]
): Middleware<C>;
export function guard<C extends Context>(
    filter: FilterFn<C>,
    ...fns: Middleware<C>[]
): Middleware<C> {
    const composed = fns.length > 0 ? Composer.compose(fns) : undefined;

    return async (ctx, next) => {
        if (!(await filter(ctx))) return;
        if (!composed) return next();
        return composed(ctx, next);
    };
}

/**
 * A combined filter works both ways:
 * - as middleware in a handler chain (`bot.command('ban', isAdmin(), handler)`),
 *   where it calls `next()` only when the filter passes;
 * - as a predicate (`isPrivate(ctx)`, `and(a, or(b, c))`, `guard(...)`,
 *   `bot.filter(...)`), where it returns the boolean (or Promise) as before.
 */
export type CombinedFilter<C extends Context = Context> = FilterFn<C> & Middleware<C>;

/**
 * Turn any predicate into a filter that also works inline in a handler list.
 *
 * A plain `(ctx) => boolean` placed in `bot.command(name, predicate, handler)`
 * never calls `next()`, so the handler would never run; wrap it instead:
 *
 * @example
 * ```typescript
 * const isWeekend = toFilter(() => [0, 6].includes(new Date().getDay()));
 * bot.command('brunch', isWeekend, ctx => ctx.reply('Brunch is on!'));
 * ```
 */
export function toFilter<C extends Context = Context>(predicate: FilterFn<C>): CombinedFilter<C> {
    const filter = (ctx: C, next?: NextFunction) => {
        const result = predicate(ctx);
        if (!next) return result;
        return Promise.resolve(result).then(passed => (passed ? next() : undefined));
    };
    return filter as CombinedFilter<C>;
}

/**
 * Combine multiple filters with AND logic — all must pass.
 */
export function and<C extends Context = Context>(...filters: FilterFn<C>[]): CombinedFilter<C> {
    return toFilter<C>(async ctx => {
        for (const filter of filters) {
            if (!(await filter(ctx))) return false;
        }
        return true;
    });
}

/**
 * Combine multiple filters with OR logic — at least one must pass.
 */
export function or<C extends Context = Context>(...filters: FilterFn<C>[]): CombinedFilter<C> {
    return toFilter<C>(async ctx => {
        for (const filter of filters) {
            if (await filter(ctx)) return true;
        }
        return false;
    });
}

/**
 * Negate a filter — passes when the original filter fails.
 */
export function not<C extends Context = Context>(filter: FilterFn<C>): CombinedFilter<C> {
    return toFilter<C>(async ctx => !(await filter(ctx)));
}

// ==========================================
// BUILT-IN FILTER PREDICATES
// Each one works as a predicate and inline in a handler list (see toFilter).
// ==========================================

/** Matches private (DM) chats only */
export const isPrivate: CombinedFilter = toFilter(ctx => ctx.chat?.type === 'private');

/** Matches group chats only */
export const isGroup: CombinedFilter = toFilter(
    ctx => ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
);

/** Matches supergroup chats only */
export const isSupergroup: CombinedFilter = toFilter(ctx => ctx.chat?.type === 'supergroup');

/** Matches channel posts only */
export const isChannel: CombinedFilter = toFilter(ctx => ctx.chat?.type === 'channel');

/** Matches messages from bots */
export const isBot: CombinedFilter = toFilter(ctx => ctx.from?.is_bot === true);

/** Matches messages from real users (not bots) */
export const isHuman: CombinedFilter = toFilter(ctx => ctx.from?.is_bot === false);

/** Matches forwarded messages */
export const isForwarded: CombinedFilter = toFilter(
    ctx => ctx.message?.forward_origin !== undefined
);

/** Matches messages that are replies to another message */
export const isReply: CombinedFilter = toFilter(ctx => ctx.message?.reply_to_message !== undefined);

/** Matches messages with text content */
export const hasText: CombinedFilter = toFilter(
    ctx => typeof ctx.message?.text === 'string' && ctx.message.text.length > 0
);

/** Matches messages containing photos */
export const hasPhoto: CombinedFilter = toFilter(
    ctx => Array.isArray(ctx.message?.photo) && ctx.message!.photo.length > 0
);

/** Matches messages with documents */
export const hasDocument: CombinedFilter = toFilter(ctx => ctx.message?.document !== undefined);

/** Matches messages with video */
export const hasVideo: CombinedFilter = toFilter(ctx => ctx.message?.video !== undefined);

/** Matches messages with audio */
export const hasAudio: CombinedFilter = toFilter(ctx => ctx.message?.audio !== undefined);

/** Matches messages with voice notes */
export const hasVoice: CombinedFilter = toFilter(ctx => ctx.message?.voice !== undefined);

/** Matches messages with stickers */
export const hasSticker: CombinedFilter = toFilter(ctx => ctx.message?.sticker !== undefined);

/** Matches messages with animations (GIFs) */
export const hasAnimation: CombinedFilter = toFilter(ctx => ctx.message?.animation !== undefined);

/** Matches messages with location */
export const hasLocation: CombinedFilter = toFilter(ctx => ctx.message?.location !== undefined);

/** Matches messages with contact */
export const hasContact: CombinedFilter = toFilter(ctx => ctx.message?.contact !== undefined);

/** Matches callback queries (inline button presses) */
export const isCallbackQuery: CombinedFilter = toFilter(
    ctx => ctx.update.callback_query !== undefined
);

/** Matches inline queries */
export const isInlineQuery: CombinedFilter = toFilter(ctx => ctx.update.inline_query !== undefined);

/**
 * Creates a filter that matches specific user IDs.
 */
export function isUser(...userIds: number[]): CombinedFilter {
    const idSet = new Set(userIds);
    return toFilter(ctx => idSet.has(ctx.from?.id || 0));
}

/**
 * Creates a filter that matches specific chat IDs.
 */
export function isChat(...chatIds: number[]): CombinedFilter {
    const idSet = new Set(chatIds);
    return toFilter(ctx => idSet.has(ctx.chat?.id || 0));
}

/**
 * Creates admin-only filter. Checks if user is creator or administrator.
 * Calls getChatMember on every check (always passes in private chats).
 */
export function isAdmin(): CombinedFilter {
    return toFilter(async ctx => {
        if (!ctx.chat || !ctx.from) return false;
        if (ctx.chat.type === 'private') return true;

        try {
            const member = await ctx.client.callApi('getChatMember', {
                chat_id: ctx.chat.id,
                user_id: ctx.from.id,
            });
            return member.status === 'creator' || member.status === 'administrator';
        } catch {
            return false;
        }
    });
}

/**
 * Creates a filter matching messages that contain specific text (case-insensitive).
 */
export function hasTextContaining(substring: string): CombinedFilter {
    const lower = substring.toLowerCase();
    return toFilter(ctx => {
        const text = ctx.message?.text || ctx.message?.caption || '';
        return text.toLowerCase().includes(lower);
    });
}
