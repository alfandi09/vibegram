import { Context } from './context';
import { Middleware } from './composer';

/**
 * Filter function type — returns true if the update matches the condition.
 */
export type FilterFn<C extends Context = Context> = (ctx: C) => boolean | Promise<boolean>;

/**
 * Combine multiple filters with AND logic — all must pass.
 */
export function and<C extends Context = Context>(...filters: FilterFn<C>[]): Middleware<C> {
    return async (ctx, next) => {
        for (const filter of filters) {
            if (!(await filter(ctx))) return;
        }
        return next();
    };
}

/**
 * Combine multiple filters with OR logic — at least one must pass.
 */
export function or<C extends Context = Context>(...filters: FilterFn<C>[]): Middleware<C> {
    return async (ctx, next) => {
        for (const filter of filters) {
            if (await filter(ctx)) return next();
        }
    };
}

/**
 * Negate a filter — passes when the original filter fails.
 */
export function not<C extends Context = Context>(filter: FilterFn<C>): FilterFn<C> {
    return async (ctx) => !(await filter(ctx));
}

// ==========================================
// BUILT-IN FILTER PREDICATES
// ==========================================

/** Matches private (DM) chats only */
export const isPrivate: FilterFn = (ctx) => ctx.chat?.type === 'private';

/** Matches group chats only */
export const isGroup: FilterFn = (ctx) => ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

/** Matches supergroup chats only */
export const isSupergroup: FilterFn = (ctx) => ctx.chat?.type === 'supergroup';

/** Matches channel posts only */
export const isChannel: FilterFn = (ctx) => ctx.chat?.type === 'channel';

/** Matches messages from bots */
export const isBot: FilterFn = (ctx) => ctx.from?.is_bot === true;

/** Matches messages from real users (not bots) */
export const isHuman: FilterFn = (ctx) => ctx.from?.is_bot === false;

/** Matches forwarded messages */
export const isForwarded: FilterFn = (ctx) => ctx.message?.forward_date !== undefined;

/** Matches messages that are replies to another message */
export const isReply: FilterFn = (ctx) => ctx.message?.reply_to_message !== undefined;

/** Matches messages with text content */
export const hasText: FilterFn = (ctx) => typeof ctx.message?.text === 'string' && ctx.message.text.length > 0;

/** Matches messages containing photos */
export const hasPhoto: FilterFn = (ctx) => Array.isArray(ctx.message?.photo) && ctx.message!.photo.length > 0;

/** Matches messages with documents */
export const hasDocument: FilterFn = (ctx) => ctx.message?.document !== undefined;

/** Matches messages with video */
export const hasVideo: FilterFn = (ctx) => ctx.message?.video !== undefined;

/** Matches messages with audio */
export const hasAudio: FilterFn = (ctx) => ctx.message?.audio !== undefined;

/** Matches messages with voice notes */
export const hasVoice: FilterFn = (ctx) => ctx.message?.voice !== undefined;

/** Matches messages with stickers */
export const hasSticker: FilterFn = (ctx) => ctx.message?.sticker !== undefined;

/** Matches messages with animations (GIFs) */
export const hasAnimation: FilterFn = (ctx) => ctx.message?.animation !== undefined;

/** Matches messages with location */
export const hasLocation: FilterFn = (ctx) => ctx.message?.location !== undefined;

/** Matches messages with contact */
export const hasContact: FilterFn = (ctx) => ctx.message?.contact !== undefined;

/** Matches callback queries (inline button presses) */
export const isCallbackQuery: FilterFn = (ctx) => ctx.update.callback_query !== undefined;

/** Matches inline queries */
export const isInlineQuery: FilterFn = (ctx) => ctx.update.inline_query !== undefined;

/**
 * Creates a filter that matches specific user IDs.
 */
export function isUser(...userIds: number[]): FilterFn {
    const idSet = new Set(userIds);
    return (ctx) => idSet.has(ctx.from?.id || 0);
}

/**
 * Creates a filter that matches specific chat IDs.
 */
export function isChat(...chatIds: number[]): FilterFn {
    const idSet = new Set(chatIds);
    return (ctx) => idSet.has(ctx.chat?.id || 0);
}

/**
 * Creates admin-only filter. Checks if user is creator or administrator.
 * Requires a callApi to getChatMember (cached per-request).
 */
export function isAdmin(): FilterFn {
    return async (ctx) => {
        if (!ctx.chat || !ctx.from) return false;
        if (ctx.chat.type === 'private') return true;

        try {
            const member = await ctx.client.callApi('getChatMember', {
                chat_id: ctx.chat.id,
                user_id: ctx.from.id
            });
            return member.status === 'creator' || member.status === 'administrator';
        } catch {
            return false;
        }
    };
}

/**
 * Creates a filter matching messages that contain specific text (case-insensitive).
 */
export function hasTextContaining(substring: string): FilterFn {
    const lower = substring.toLowerCase();
    return (ctx) => {
        const text = ctx.message?.text || ctx.message?.caption || '';
        return text.toLowerCase().includes(lower);
    };
}
