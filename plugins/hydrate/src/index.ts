export interface HydrateClient {
    callApi(method: string, data?: Record<string, unknown>, ...args: unknown[]): Promise<unknown>;
}

export interface HydrateContext {
    client: HydrateClient;
    update: HydrateUpdate;
    message?: MessageLike;
}

export interface HydrateUpdate {
    message?: MessageLike;
    edited_message?: MessageLike;
    channel_post?: MessageLike;
    edited_channel_post?: MessageLike;
    business_message?: MessageLike;
    edited_business_message?: MessageLike;
    callback_query?: CallbackQueryLike;
    [key: string]: unknown;
}

export interface ChatLike {
    id: number | string;
    type?: string;
    [key: string]: unknown;
}

export interface UserLike {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    [key: string]: unknown;
}

export interface MessageLike {
    message_id: number;
    date?: number;
    chat: ChatLike;
    from?: UserLike;
    business_connection_id?: string;
    message_thread_id?: number;
    [key: string]: unknown;
}

export interface CallbackQueryLike {
    id: string;
    from: UserLike;
    message?: MessageLike;
    inline_message_id?: string;
    chat_instance?: string;
    [key: string]: unknown;
}

export type TelegramExtra = Record<string, unknown>;

export interface AnswerCallbackQueryOptions extends TelegramExtra {
    url?: string;
    cache_time?: number;
}

export interface MessagePinOptions extends TelegramExtra {
    disable_notification?: boolean;
}

export interface HydratedMessageMethods {
    reply(text: string, extra?: TelegramExtra): Promise<unknown>;
    editText(text: string, extra?: TelegramExtra): Promise<unknown>;
    delete(): Promise<unknown>;
    pin(options?: boolean | MessagePinOptions): Promise<unknown>;
    unpin(extra?: TelegramExtra): Promise<unknown>;
}

export interface HydratedCallbackQueryMethods {
    answer(text?: string, showAlert?: boolean, extra?: AnswerCallbackQueryOptions): Promise<unknown>;
    editMessageText(text: string, extra?: TelegramExtra): Promise<unknown>;
}

export interface HydratedChatMethods {
    sendMessage(text: string, extra?: TelegramExtra): Promise<unknown>;
    get(): Promise<unknown>;
}

export interface HydratedUserMethods {
    getProfilePhotos(extra?: TelegramExtra): Promise<unknown>;
}

export type HydratedChat<C extends ChatLike = ChatLike> = C & HydratedChatMethods;
export type HydratedUser<U extends UserLike = UserLike> = U & HydratedUserMethods;

export type HydratedMessage<M extends MessageLike = MessageLike> = M &
    HydratedMessageMethods & {
        chat: HydratedChat<M['chat']>;
        from?: M['from'] extends UserLike ? HydratedUser<M['from']> : HydratedUser;
    };

export type HydratedCallbackQuery<Q extends CallbackQueryLike = CallbackQueryLike> = Q &
    HydratedCallbackQueryMethods & {
        from: HydratedUser<Q['from']>;
        message?: Q['message'] extends MessageLike ? HydratedMessage<Q['message']> : HydratedMessage;
    };

export type HydrateFlavor<C> = C & {
    message?: HydratedMessage;
    update: HydrateUpdate & {
        message?: HydratedMessage;
        edited_message?: HydratedMessage;
        channel_post?: HydratedMessage;
        edited_channel_post?: HydratedMessage;
        business_message?: HydratedMessage;
        edited_business_message?: HydratedMessage;
        callback_query?: HydratedCallbackQuery;
    };
};

export interface HydrateOptions {
    hydrateUpdates?: boolean;
    hydrateApiResults?: boolean;
}

export type HydrateMiddleware<C extends HydrateContext = HydrateContext> = (
    ctx: C,
    next: () => Promise<void>
) => Promise<void>;

const MESSAGE_UPDATE_KEYS = [
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'business_message',
    'edited_business_message',
] as const;

/** Add convenience methods to messages, callback queries, chats, users, and API results. */
export function hydrate<C extends HydrateContext = HydrateContext>(
    options: HydrateOptions = {}
): HydrateMiddleware<HydrateFlavor<C> & HydrateContext> {
    const hydrateUpdates = options.hydrateUpdates ?? true;
    const hydrateApiResults = options.hydrateApiResults ?? true;

    return async (ctx, next) => {
        if (hydrateUpdates) {
            hydrateUpdate(ctx.update, ctx.client);
        }

        if (!hydrateApiResults) {
            await next();
            return;
        }

        const originalCallApi = ctx.client.callApi.bind(ctx.client);
        ctx.client.callApi = async (method, data, ...args) => {
            const result = await originalCallApi(method, data, ...args);
            return hydrateApiResult(result, ctx.client);
        };

        try {
            await next();
        } finally {
            ctx.client.callApi = originalCallApi;
        }
    };
}

/** Hydrate all supported message and callback query objects inside one update object. */
export function hydrateUpdate<U extends HydrateUpdate>(
    update: U,
    client: HydrateClient
): HydrateFlavor<{ update: U; client: HydrateClient }>['update'] {
    for (const key of MESSAGE_UPDATE_KEYS) {
        const message = update[key];
        if (isMessageLike(message)) {
            hydrateMessage(message, client);
        }
    }

    if (isCallbackQueryLike(update.callback_query)) {
        hydrateCallbackQuery(update.callback_query, client);
    }

    return update as HydrateFlavor<{ update: U; client: HydrateClient }>['update'];
}

/** Hydrate a Telegram API result when it is, or contains, message-like objects. */
export function hydrateApiResult(result: unknown, client: HydrateClient): unknown {
    if (Array.isArray(result)) {
        for (const item of result) {
            hydrateApiResult(item, client);
        }
        return result;
    }

    if (isMessageLike(result)) {
        return hydrateMessage(result, client);
    }

    if (isCallbackQueryLike(result)) {
        return hydrateCallbackQuery(result, client);
    }

    return result;
}

/** Hydrate one message object with non-enumerable convenience methods. */
export function hydrateMessage<M extends MessageLike>(
    message: M,
    client: HydrateClient
): HydratedMessage<M> {
    hydrateChat(message.chat, client);
    if (isUserLike(message.from)) {
        hydrateUser(message.from, client);
    }

    defineHelper(message, 'reply', async (text: string, extra: TelegramExtra = {}) =>
        client.callApi(
            'sendMessage',
            compact({
                chat_id: message.chat.id,
                business_connection_id: message.business_connection_id,
                message_thread_id: message.message_thread_id,
                text,
                ...extra,
            })
        )
    );

    defineHelper(message, 'editText', async (text: string, extra: TelegramExtra = {}) =>
        client.callApi(
            'editMessageText',
            compact({
                chat_id: message.chat.id,
                business_connection_id: message.business_connection_id,
                message_id: message.message_id,
                text,
                ...extra,
            })
        )
    );

    defineHelper(message, 'delete', async () =>
        client.callApi('deleteMessage', {
            chat_id: message.chat.id,
            message_id: message.message_id,
        })
    );

    defineHelper(message, 'pin', async (options: boolean | MessagePinOptions = {}) =>
        client.callApi(
            'pinChatMessage',
            compact({
                chat_id: message.chat.id,
                business_connection_id: message.business_connection_id,
                message_id: message.message_id,
                ...normalizePinOptions(options),
            })
        )
    );

    defineHelper(message, 'unpin', async (extra: TelegramExtra = {}) =>
        client.callApi(
            'unpinChatMessage',
            compact({
                chat_id: message.chat.id,
                business_connection_id: message.business_connection_id,
                message_id: message.message_id,
                ...extra,
            })
        )
    );

    return message as HydratedMessage<M>;
}

/** Hydrate one callback query with answer/edit helpers. */
export function hydrateCallbackQuery<Q extends CallbackQueryLike>(
    callbackQuery: Q,
    client: HydrateClient
): HydratedCallbackQuery<Q> {
    hydrateUser(callbackQuery.from, client);
    if (isMessageLike(callbackQuery.message)) {
        hydrateMessage(callbackQuery.message, client);
    }

    defineHelper(
        callbackQuery,
        'answer',
        async (text?: string, showAlert?: boolean, extra: AnswerCallbackQueryOptions = {}) =>
            client.callApi(
                'answerCallbackQuery',
                compact({
                    callback_query_id: callbackQuery.id,
                    text,
                    show_alert: showAlert,
                    ...extra,
                })
            )
    );

    defineHelper(callbackQuery, 'editMessageText', async (text: string, extra: TelegramExtra = {}) =>
        client.callApi('editMessageText', {
            ...getCallbackEditTarget(callbackQuery),
            text,
            ...extra,
        })
    );

    return callbackQuery as HydratedCallbackQuery<Q>;
}

/** Hydrate a chat object with safe chat-scoped helpers. */
export function hydrateChat<C extends ChatLike>(chat: C, client: HydrateClient): HydratedChat<C> {
    defineHelper(chat, 'sendMessage', async (text: string, extra: TelegramExtra = {}) =>
        client.callApi('sendMessage', {
            chat_id: chat.id,
            text,
            ...extra,
        })
    );

    defineHelper(chat, 'get', async () =>
        client.callApi('getChat', {
            chat_id: chat.id,
        })
    );

    return chat as HydratedChat<C>;
}

/** Hydrate a user object with safe user-scoped helpers. */
export function hydrateUser<U extends UserLike>(user: U, client: HydrateClient): HydratedUser<U> {
    defineHelper(user, 'getProfilePhotos', async (extra: TelegramExtra = {}) =>
        client.callApi('getUserProfilePhotos', {
            user_id: user.id,
            ...extra,
        })
    );

    return user as HydratedUser<U>;
}

function getCallbackEditTarget(callbackQuery: CallbackQueryLike): Record<string, unknown> {
    if (callbackQuery.inline_message_id) {
        return {
            inline_message_id: callbackQuery.inline_message_id,
        };
    }

    if (!isMessageLike(callbackQuery.message)) {
        throw new Error(
            '[vibegram/hydrate] Cannot edit callback query message: message or inline_message_id is not available.'
        );
    }

    return compact({
        chat_id: callbackQuery.message.chat.id,
        business_connection_id: callbackQuery.message.business_connection_id,
        message_id: callbackQuery.message.message_id,
    });
}

function normalizePinOptions(options: boolean | MessagePinOptions): MessagePinOptions {
    if (typeof options === 'boolean') {
        return { disable_notification: options };
    }
    return options;
}

function defineHelper<T extends object, K extends string>(
    target: T,
    key: K,
    value: unknown
): void {
    Object.defineProperty(target, key, {
        value,
        enumerable: false,
        configurable: true,
        writable: false,
    });
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
            result[key] = entry;
        }
    }

    return result;
}

function isMessageLike(value: unknown): value is MessageLike {
    if (!isRecord(value)) return false;
    return typeof value.message_id === 'number' && isChatLike(value.chat);
}

function isCallbackQueryLike(value: unknown): value is CallbackQueryLike {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string' && isUserLike(value.from);
}

function isChatLike(value: unknown): value is ChatLike {
    if (!isRecord(value)) return false;
    return typeof value.id === 'number' || typeof value.id === 'string';
}

function isUserLike(value: unknown): value is UserLike {
    if (!isRecord(value)) return false;
    return typeof value.id === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
