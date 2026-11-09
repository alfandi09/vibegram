import type { CallbackQuery, Chat, Message, Update } from './types';

/**
 * Filter queries let `bot.on()` match updates and narrow `ctx` types at the
 * same time, e.g. `bot.on('message:photo', ctx => ctx.message.photo)`.
 *
 * Supported shapes:
 * - `'<update>'` such as `'message'` or `'callback_query'`
 * - `'<message update>:<message field>'` such as `'message:text'` or `'edited_channel_post:photo'`
 * - `':<message field>'` such as `':photo'`, which matches any message-like update
 * - `'callback_query:data'` and `'callback_query:game_short_name'`
 */

/** Update keys whose payload is a Message. */
export type MessageUpdateKey =
    | 'message'
    | 'edited_message'
    | 'channel_post'
    | 'edited_channel_post'
    | 'business_message'
    | 'edited_business_message';

/** Every update type key (everything except `update_id`). */
export type UpdateKey = Exclude<keyof Update, 'update_id'>;

/** Message fields usable after the colon, e.g. `text`, `photo`, `new_chat_members`. */
export type MessageFieldKey = Exclude<keyof Message, 'message_id' | 'date' | 'chat'>;

/** Callback query fields usable after `callback_query:`. */
export type CallbackQueryFieldKey = 'data' | 'game_short_name';

export type FilterQuery =
    | UpdateKey
    | `${MessageUpdateKey}:${MessageFieldKey}`
    | `:${MessageFieldKey}`
    | `callback_query:${CallbackQueryFieldKey}`;

const MESSAGE_UPDATE_KEYS: readonly MessageUpdateKey[] = [
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'business_message',
    'edited_business_message',
];

type RequireFields<T, K> = [K] extends [never]
    ? T
    : T & { [P in K & keyof T]-?: NonNullable<T[P]> };

type QueryUpdateKey<Q extends string> = Q extends `:${string}`
    ? MessageUpdateKey
    : Q extends `${infer Key}:${string}`
      ? Key
      : Q;

type QueryField<Q extends string> = Q extends `${string}:${infer Field}` ? Field : never;

type NarrowPayload<Key, Field> = Key extends MessageUpdateKey
    ? RequireFields<Message, Field>
    : Key extends 'callback_query'
      ? RequireFields<CallbackQuery, Field>
      : Key extends keyof Update
        ? NonNullable<Update[Key]>
        : never;

/** The Update shape guaranteed by a filter query. */
export type FilteredUpdate<Q extends string> = Q extends string
    ? QueryUpdateKey<Q> extends infer Key
        ? Key extends UpdateKey
            ? Update & { [P in Key]-?: NarrowPayload<Key, QueryField<Q>> }
            : never
        : never
    : never;

type MessageNarrowing<Q extends string> = [QueryUpdateKey<Q>] extends [MessageUpdateKey]
    ? { readonly message: FilteredMessage<Q>; readonly chat: Chat }
    : unknown;

type FilteredMessage<Q extends string> = Q extends string
    ? RequireFields<Message, QueryField<Q>>
    : never;

/**
 * Narrows a context type for a filter query. For message queries, `ctx.message`
 * and `ctx.chat` become non-optional and the queried field is guaranteed.
 */
export type Filter<C, Q extends string> = C & {
    readonly update: FilteredUpdate<Q>;
} & MessageNarrowing<Q>;

function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/** True when a string uses the colon filter-query syntax. */
export function isFilterQuery(query: string): boolean {
    return query.includes(':');
}

/**
 * Runtime matcher for a filter query. Throws a TypeError for malformed queries
 * so typos fail fast at registration time instead of silently never matching.
 */
export function matchFilterQuery(query: string): (update: Update) => boolean {
    const separatorIndex = query.indexOf(':');
    const updateKey = separatorIndex === -1 ? query : query.slice(0, separatorIndex);
    const field = separatorIndex === -1 ? undefined : query.slice(separatorIndex + 1);

    if (separatorIndex !== -1 && (!field || field.includes(':'))) {
        throw new TypeError(`Invalid filter query "${query}".`);
    }

    if (updateKey !== '' && field !== undefined) {
        const isMessageKey = (MESSAGE_UPDATE_KEYS as readonly string[]).includes(updateKey);
        if (!isMessageKey && updateKey !== 'callback_query') {
            throw new TypeError(
                `Invalid filter query "${query}": only message updates and callback_query support ":field".`
            );
        }
    }

    const keys = updateKey === '' ? MESSAGE_UPDATE_KEYS : [updateKey];

    return update => {
        const record = update as unknown as Record<string, unknown>;
        return keys.some(key => {
            const payload = record[key];
            if (!hasValue(payload)) return false;
            if (field === undefined) return true;
            return isRecord(payload) && hasValue(payload[field]);
        });
    };
}
