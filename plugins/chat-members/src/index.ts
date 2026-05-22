export type MaybePromise<T> = T | Promise<T>;
export type ChatId = number | string;
export type UserId = number;

export type ChatMemberStatus =
    | 'creator'
    | 'administrator'
    | 'member'
    | 'restricted'
    | 'left'
    | 'kicked'
    | (string & {});

export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    [key: string]: unknown;
}

export interface TelegramChat {
    id: ChatId;
    type?: string;
    [key: string]: unknown;
}

export interface TelegramChatMember {
    status: ChatMemberStatus;
    user: TelegramUser;
    is_anonymous?: boolean;
    custom_title?: string;
    can_be_edited?: boolean;
    can_manage_chat?: boolean;
    can_delete_messages?: boolean;
    can_manage_video_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
    can_manage_direct_messages?: boolean;
    can_manage_tags?: boolean;
    can_react_to_messages?: boolean;
    until_date?: number;
    is_member?: boolean;
    can_send_messages?: boolean;
    can_send_audios?: boolean;
    can_send_documents?: boolean;
    can_send_photos?: boolean;
    can_send_videos?: boolean;
    can_send_video_notes?: boolean;
    can_send_voice_notes?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_edit_tag?: boolean;
    tag?: string;
    [key: string]: unknown;
}

export interface ChatMemberUpdatedLike {
    chat: TelegramChat;
    from?: TelegramUser;
    date?: number;
    old_chat_member?: TelegramChatMember;
    new_chat_member: TelegramChatMember;
    [key: string]: unknown;
}

export interface ChatMembersUpdateLike {
    chat_member?: ChatMemberUpdatedLike;
    my_chat_member?: ChatMemberUpdatedLike;
    [key: string]: unknown;
}

export interface ChatMembersClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface ChatMembersContext {
    update?: ChatMembersUpdateLike;
    chat?: TelegramChat;
    from?: TelegramUser;
    client: ChatMembersClient;
    chatMembers?: ChatMembersManager;
    [key: string]: unknown;
}

export type ChatMembersMiddleware<C extends ChatMembersContext = ChatMembersContext> = (
    ctx: C,
    next: () => Promise<void>
) => Promise<void>;

export type ChatMembersFlavor<C> = C & {
    chatMembers: ChatMembersManager;
};

export interface ChatMemberStore {
    get(key: string): Promise<TelegramChatMember | undefined>;
    set(key: string, value: TelegramChatMember, ttlMs: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear?(): Promise<void>;
}

export interface MemoryChatMemberStoreOptions {
    ttlMs?: number;
    maxEntries?: number;
}

export interface ChatMembersOptions {
    ttlMs?: number;
    store?: ChatMemberStore;
    keyGenerator?: (chatId: ChatId, userId: UserId) => string;
}

export interface ChatMemberLookupOptions {
    forceRefresh?: boolean;
}

export interface ChatMembersManager {
    get(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<TelegramChatMember>;
    invalidate(chatId: ChatId, userId: UserId): Promise<void>;
    isAdmin(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean>;
    isOwner(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean>;
    isMember(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean>;
}

export type GuardDeniedReason =
    | 'missing_context'
    | 'not_admin'
    | 'not_owner'
    | 'not_member'
    | 'api_error';

export interface ChatMemberGuardOptions<C extends ChatMembersContext = ChatMembersContext> {
    allowPrivate?: boolean;
    onDenied?: (
        ctx: C,
        reason: GuardDeniedReason,
        member?: TelegramChatMember
    ) => MaybePromise<void>;
    onError?: (ctx: C, error: unknown) => MaybePromise<void>;
}

/** In-memory ChatMember store with TTL expiration and simple max-entry eviction. */
export class MemoryChatMemberStore implements ChatMemberStore {
    private readonly ttlMs: number;
    private readonly maxEntries: number;
    private readonly data = new Map<string, { value: TelegramChatMember; expiresAt: number }>();

    constructor(options: MemoryChatMemberStoreOptions = {}) {
        this.ttlMs = positiveInteger(options.ttlMs, 60_000, 'ttlMs');
        this.maxEntries = positiveInteger(options.maxEntries, 10_000, 'maxEntries');
    }

    async get(key: string): Promise<TelegramChatMember | undefined> {
        const entry = this.data.get(key);
        if (!entry) return undefined;

        if (Date.now() >= entry.expiresAt) {
            this.data.delete(key);
            return undefined;
        }

        return entry.value;
    }

    async set(key: string, value: TelegramChatMember, ttlMs = this.ttlMs): Promise<void> {
        const normalizedTtl = positiveInteger(ttlMs, this.ttlMs, 'ttlMs');

        if (this.data.size >= this.maxEntries && !this.data.has(key)) {
            const oldestKey = this.data.keys().next().value;
            if (oldestKey) {
                this.data.delete(oldestKey);
            }
        }

        this.data.set(key, {
            value,
            expiresAt: Date.now() + normalizedTtl,
        });
    }

    async delete(key: string): Promise<void> {
        this.data.delete(key);
    }

    async clear(): Promise<void> {
        this.data.clear();
    }

    get size(): number {
        return this.data.size;
    }
}

/**
 * Create middleware that caches `getChatMember` calls and invalidates cached
 * members when Telegram sends `chat_member` or `my_chat_member` updates.
 */
export function chatMembers<C extends ChatMembersContext = ChatMembersContext>(
    options: ChatMembersOptions = {}
): ChatMembersMiddleware<C> {
    const ttlMs = positiveInteger(options.ttlMs, 60_000, 'ttlMs');
    const store = options.store ?? new MemoryChatMemberStore({ ttlMs });
    const keyGenerator = options.keyGenerator ?? defaultChatMemberKey;

    return async (ctx, next) => {
        const originalCallApi = ctx.client.callApi.bind(ctx.client);
        const manager = new DefaultChatMembersManager(originalCallApi, store, ttlMs, keyGenerator);
        const previousManager = ctx.chatMembers;

        await invalidateFromUpdate(ctx.update, manager);

        ctx.chatMembers = manager;
        ctx.client.callApi = async (method: string, data?: Record<string, unknown>) => {
            if (method === 'getChatMember') {
                const chatId = data?.chat_id;
                const userId = data?.user_id;

                if (isChatId(chatId) && typeof userId === 'number') {
                    return manager.get(chatId, userId);
                }
            }

            return originalCallApi(method, data);
        };

        try {
            await next();
        } finally {
            ctx.client.callApi = originalCallApi;
            if (previousManager) {
                ctx.chatMembers = previousManager;
            } else {
                delete ctx.chatMembers;
            }
        }
    };
}

/** Require the current user to be the chat owner or an administrator. */
export function requireAdmin<C extends ChatMembersContext = ChatMembersContext>(
    options: ChatMemberGuardOptions<C> = {}
): ChatMembersMiddleware<C> {
    return async (ctx, next) => {
        const target = currentTarget(ctx);
        if (!target) {
            await deny(ctx, 'missing_context', options);
            return;
        }

        if (shouldAllowPrivate(ctx, options)) {
            await next();
            return;
        }

        const member = await getMemberForGuard(ctx, target.chatId, target.userId, options);
        if (!member) return;

        if (isAdministrator(member)) {
            await next();
            return;
        }

        await deny(ctx, 'not_admin', options, member);
    };
}

/** Require the current user to be the chat owner. */
export function requireOwner<C extends ChatMembersContext = ChatMembersContext>(
    options: ChatMemberGuardOptions<C> = {}
): ChatMembersMiddleware<C> {
    return async (ctx, next) => {
        const target = currentTarget(ctx);
        if (!target) {
            await deny(ctx, 'missing_context', options);
            return;
        }

        if (shouldAllowPrivate(ctx, options)) {
            await next();
            return;
        }

        const member = await getMemberForGuard(ctx, target.chatId, target.userId, options);
        if (!member) return;

        if (isOwner(member)) {
            await next();
            return;
        }

        await deny(ctx, 'not_owner', options, member);
    };
}

/** Require the current user to still be an active member of the current chat. */
export function requireMembership<C extends ChatMembersContext = ChatMembersContext>(
    options: ChatMemberGuardOptions<C> = {}
): ChatMembersMiddleware<C> {
    return async (ctx, next) => {
        const target = currentTarget(ctx);
        if (!target) {
            await deny(ctx, 'missing_context', options);
            return;
        }

        if (shouldAllowPrivate(ctx, options)) {
            await next();
            return;
        }

        const member = await getMemberForGuard(ctx, target.chatId, target.userId, options);
        if (!member) return;

        if (isMember(member)) {
            await next();
            return;
        }

        await deny(ctx, 'not_member', options, member);
    };
}

/** Return true when Telegram reports the member as the chat creator/owner. */
export function isOwner(member: TelegramChatMember): boolean {
    return member.status === 'creator';
}

/** Return true for Telegram chat owners and administrators. */
export function isAdministrator(member: TelegramChatMember): boolean {
    return member.status === 'creator' || member.status === 'administrator';
}

/** Return true for active Telegram members, including restricted users who are still members. */
export function isMember(member: TelegramChatMember): boolean {
    if (member.status === 'left' || member.status === 'kicked') {
        return false;
    }
    if (member.status === 'restricted' && member.is_member === false) {
        return false;
    }
    return true;
}

/** Build the default cache key for one Telegram `chat_id` and `user_id` pair. */
export function defaultChatMemberKey(chatId: ChatId, userId: UserId): string {
    return JSON.stringify([chatId, userId]);
}

class DefaultChatMembersManager implements ChatMembersManager {
    constructor(
        private readonly callApi: ChatMembersClient['callApi'],
        private readonly store: ChatMemberStore,
        private readonly ttlMs: number,
        private readonly keyGenerator: (chatId: ChatId, userId: UserId) => string
    ) {}

    async get(
        chatId: ChatId,
        userId: UserId,
        options: ChatMemberLookupOptions = {}
    ): Promise<TelegramChatMember> {
        const key = this.keyGenerator(chatId, userId);

        if (!options.forceRefresh) {
            const cached = await this.store.get(key);
            if (cached) {
                return cached;
            }
        }

        const member = await this.callApi('getChatMember', {
            chat_id: chatId,
            user_id: userId,
        }) as TelegramChatMember;

        await this.store.set(key, member, this.ttlMs);
        return member;
    }

    async invalidate(chatId: ChatId, userId: UserId): Promise<void> {
        await this.store.delete(this.keyGenerator(chatId, userId));
    }

    async isAdmin(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean> {
        return isAdministrator(await this.get(chatId, userId, options));
    }

    async isOwner(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean> {
        return isOwner(await this.get(chatId, userId, options));
    }

    async isMember(chatId: ChatId, userId: UserId, options?: ChatMemberLookupOptions): Promise<boolean> {
        return isMember(await this.get(chatId, userId, options));
    }
}

async function invalidateFromUpdate(
    update: ChatMembersUpdateLike | undefined,
    manager: ChatMembersManager
): Promise<void> {
    const updates = [update?.chat_member, update?.my_chat_member];

    for (const memberUpdate of updates) {
        const chatId = memberUpdate?.chat?.id;
        const userId = memberUpdate?.new_chat_member?.user?.id;

        if (isChatId(chatId) && typeof userId === 'number') {
            await manager.invalidate(chatId, userId);
        }
    }
}

async function getMemberForGuard<C extends ChatMembersContext>(
    ctx: C,
    chatId: ChatId,
    userId: UserId,
    options: ChatMemberGuardOptions<C>
): Promise<TelegramChatMember | undefined> {
    try {
        if (ctx.chatMembers) {
            return await ctx.chatMembers.get(chatId, userId);
        }

        return await ctx.client.callApi('getChatMember', {
            chat_id: chatId,
            user_id: userId,
        }) as TelegramChatMember;
    } catch (error) {
        if (options.onError) {
            await options.onError(ctx, error);
        }
        await deny(ctx, 'api_error', options);
        return undefined;
    }
}

async function deny<C extends ChatMembersContext>(
    ctx: C,
    reason: GuardDeniedReason,
    options: ChatMemberGuardOptions<C>,
    member?: TelegramChatMember
): Promise<void> {
    if (options.onDenied) {
        await options.onDenied(ctx, reason, member);
    }
}

function currentTarget(ctx: ChatMembersContext): { chatId: ChatId; userId: UserId } | undefined {
    if (!ctx.chat || !ctx.from) {
        return undefined;
    }

    return {
        chatId: ctx.chat.id,
        userId: ctx.from.id,
    };
}

function shouldAllowPrivate<C extends ChatMembersContext>(
    ctx: C,
    options: ChatMemberGuardOptions<C>
): boolean {
    return options.allowPrivate !== false && ctx.chat?.type === 'private';
}

function isChatId(value: unknown): value is ChatId {
    return typeof value === 'number' || typeof value === 'string';
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`[vibegram/chat-members] ${name} must be a positive integer.`);
    }

    return value;
}
