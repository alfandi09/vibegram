import { createHash, timingSafeEqual } from 'node:crypto';

export type MaybePromise<T> = T | Promise<T>;
export type ChatId = number | string;
export type UserId = number;
export type NextFunction = () => Promise<void>;

export type SecurityGuardReason =
    | 'missing_user'
    | 'missing_chat'
    | 'user_not_allowed'
    | 'chat_not_allowed'
    | 'not_admin'
    | 'api_error'
    | 'spam_burst';

export type SecurityMiddleware<C extends SecurityContext = SecurityContext> = (
    ctx: C,
    next: NextFunction
) => MaybePromise<void>;

export interface SecurityUser {
    id: UserId;
    is_bot?: boolean;
    first_name?: string;
    [key: string]: unknown;
}

export interface SecurityChat {
    id: ChatId;
    type?: string;
    [key: string]: unknown;
}

export interface SecurityChatMember {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked' | (string & {});
    user: SecurityUser;
    [key: string]: unknown;
}

export interface SecurityClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface SecurityChatMembersManager {
    get(chatId: ChatId, userId: UserId): Promise<SecurityChatMember>;
}

export interface SecuritySession {
    denyReasons: SecurityGuardReason[];
}

export interface SecurityContext {
    update?: Record<string, unknown>;
    chat?: SecurityChat;
    from?: SecurityUser;
    client?: SecurityClient;
    chatMembers?: SecurityChatMembersManager;
    security?: SecuritySession;
    reply?(text: string, extra?: Record<string, unknown>): MaybePromise<unknown>;
    [key: string]: unknown;
}

export type SecurityFlavor<C> = C & {
    security?: SecuritySession;
};

export interface GuardOptions<C extends SecurityContext = SecurityContext> {
    onDenied?: (ctx: C, reason: SecurityGuardReason) => MaybePromise<void>;
}

export interface AdminGuardOptions<C extends SecurityContext = SecurityContext> extends GuardOptions<C> {
    allowPrivate?: boolean;
    onError?: (ctx: C, error: unknown) => MaybePromise<void>;
}

export interface SpamGuardOptions<C extends SecurityContext = SecurityContext> extends GuardOptions<C> {
    limit?: number;
    windowMs?: number;
    keyGenerator?: (ctx: C) => string | undefined;
    now?: () => number;
}

export interface SafeErrorsOptions<C extends SecurityContext = SecurityContext> {
    reply?: string | false | ((ctx: C, error: unknown) => MaybePromise<string | undefined>);
    onError?: (ctx: C, error: unknown) => MaybePromise<void>;
    rethrow?: boolean;
}

export interface SecurityOptions<C extends SecurityContext = SecurityContext> {
    allowUsers?: readonly UserId[];
    allowChats?: readonly ChatId[];
    spam?: boolean | SpamGuardOptions<C>;
    safeErrors?: boolean | SafeErrorsOptions<C>;
    onDenied?: (ctx: C, reason: SecurityGuardReason) => MaybePromise<void>;
}

export interface RedactOptions {
    redact?: readonly string[];
    replacement?: string;
    maxDepth?: number;
}

type HeaderValue = string | string[] | number | undefined;
export type WebhookSecretHeaders = Headers | Record<string, HeaderValue>;

interface SpamEntry {
    count: number;
    resetAt: number;
}

const DEFAULT_REDACT_KEYS = [
    'access_token',
    'api_key',
    'authorization',
    'bot_token',
    'cookie',
    'password',
    'prompt',
    'secret',
    'secret_token',
    'token',
];
const DEFAULT_REPLACEMENT = '[REDACTED]';
const DEFAULT_MAX_DEPTH = 12;
const TELEGRAM_TOKEN_PATTERN = /\b\d{5,}:[A-Za-z0-9_-]{3,}\b/g;
const WEBHOOK_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/** Compose practical security defaults from small security middlewares. */
export function security<C extends SecurityContext = SecurityContext>(
    options: SecurityOptions<C> = {}
): SecurityMiddleware<C> {
    const middlewares: Array<SecurityMiddleware<C>> = [];

    if (options.allowUsers) {
        middlewares.push(allowUsers(options.allowUsers, { onDenied: options.onDenied }));
    }
    if (options.allowChats) {
        middlewares.push(allowChats(options.allowChats, { onDenied: options.onDenied }));
    }
    if (options.spam) {
        middlewares.push(spamGuard(
            options.spam === true ? { onDenied: options.onDenied } : {
                ...options.spam,
                onDenied: options.spam.onDenied ?? options.onDenied,
            }
        ));
    }

    const body = compose(middlewares);

    if (options.safeErrors) {
        const errorMiddleware = safeErrors<C>(options.safeErrors === true ? {} : options.safeErrors);
        return (ctx, next) => errorMiddleware(ctx, async () => {
            await body(ctx, next);
        });
    }

    return body;
}

/** Allow only selected Telegram user IDs through the middleware chain. */
export function allowUsers<C extends SecurityContext = SecurityContext>(
    userIds: readonly UserId[],
    options: GuardOptions<C> = {}
): SecurityMiddleware<C> {
    const allowed = new Set(userIds);

    return async (ctx, next) => {
        ensureSecuritySession(ctx);
        const userId = ctx.from?.id;
        if (typeof userId !== 'number') {
            await deny(ctx, 'missing_user', options);
            return;
        }

        if (!allowed.has(userId)) {
            await deny(ctx, 'user_not_allowed', options);
            return;
        }

        await next();
    };
}

/** Allow only selected Telegram chat IDs through the middleware chain. */
export function allowChats<C extends SecurityContext = SecurityContext>(
    chatIds: readonly ChatId[],
    options: GuardOptions<C> = {}
): SecurityMiddleware<C> {
    const allowed = new Set(chatIds.map(String));

    return async (ctx, next) => {
        ensureSecuritySession(ctx);
        const chatId = ctx.chat?.id;
        if (!isChatId(chatId)) {
            await deny(ctx, 'missing_chat', options);
            return;
        }

        if (!allowed.has(String(chatId))) {
            await deny(ctx, 'chat_not_allowed', options);
            return;
        }

        await next();
    };
}

/** Require the current Telegram user to be a chat creator or administrator. */
export function requireAdmin<C extends SecurityContext = SecurityContext>(
    options: AdminGuardOptions<C> = {}
): SecurityMiddleware<C> {
    return async (ctx, next) => {
        ensureSecuritySession(ctx);

        if (ctx.chat?.type === 'private' && options.allowPrivate !== false) {
            await next();
            return;
        }

        const chatId = ctx.chat?.id;
        const userId = ctx.from?.id;
        if (!isChatId(chatId)) {
            await deny(ctx, 'missing_chat', options);
            return;
        }
        if (typeof userId !== 'number') {
            await deny(ctx, 'missing_user', options);
            return;
        }

        try {
            const member = await getChatMember(ctx, chatId, userId);
            if (isAdministrator(member)) {
                await next();
                return;
            }
            await deny(ctx, 'not_admin', options);
        } catch (error) {
            if (options.onError) {
                await options.onError(ctx, error);
            }
            await deny(ctx, 'api_error', options);
        }
    };
}

/** Block bursty updates with a small in-memory fixed-window limiter. */
export function spamGuard<C extends SecurityContext = SecurityContext>(
    options: SpamGuardOptions<C> = {}
): SecurityMiddleware<C> {
    const limit = positiveInteger(options.limit, 5, 'limit');
    const windowMs = positiveInteger(options.windowMs, 10_000, 'windowMs');
    const now = options.now ?? Date.now;
    const keyGenerator = options.keyGenerator ?? defaultSpamKey;
    const buckets = new Map<string, SpamEntry>();

    return async (ctx, next) => {
        ensureSecuritySession(ctx);
        const key = keyGenerator(ctx);
        if (!key) {
            await next();
            return;
        }

        const currentTime = now();
        const existing = buckets.get(key);
        const bucket = !existing || existing.resetAt <= currentTime
            ? { count: 0, resetAt: currentTime + windowMs }
            : existing;
        bucket.count += 1;
        buckets.set(key, bucket);

        if (bucket.count > limit) {
            await deny(ctx, 'spam_burst', options);
            return;
        }

        await next();
    };
}

/** Catch downstream errors and reply with a safe generic message. */
export function safeErrors<C extends SecurityContext = SecurityContext>(
    options: SafeErrorsOptions<C> = {}
): SecurityMiddleware<C> {
    const fallbackReply = options.reply ?? 'Something went wrong.';

    return async (ctx, next) => {
        try {
            await next();
        } catch (error) {
            if (options.onError) {
                await options.onError(ctx, error);
            }

            const message = typeof fallbackReply === 'function'
                ? await fallbackReply(ctx, error)
                : fallbackReply;
            if (message && ctx.reply) {
                await ctx.reply(message);
            }

            if (options.rethrow) {
                throw error;
            }
        }
    };
}

/** Verify Telegram's official webhook secret header. */
export function verifyWebhookSecret(headers: WebhookSecretHeaders, expected: string): boolean {
    const actual = readHeader(headers, WEBHOOK_SECRET_HEADER);
    return actual !== undefined && safeTokenEquals(actual, expected);
}

/** Return true for Telegram chat creators and administrators. */
export function isAdministrator(member: SecurityChatMember): boolean {
    return member.status === 'creator' || member.status === 'administrator';
}

/** Deeply redact sensitive keys and Telegram bot-token shaped strings. */
export function redactValue(value: unknown, options: RedactOptions = {}): unknown {
    const normalized = normalizeRedactOptions(options);
    return redactDeep(value, normalized, 0, new WeakSet<object>());
}

/** Convert an unknown thrown value to safe log metadata. */
export function redactError(error: unknown, options: RedactOptions = {}): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: redactString(error.message, normalizeRedactOptions(options)),
        };
    }

    return {
        message: redactValue(String(error), options),
    };
}

async function getChatMember(
    ctx: SecurityContext,
    chatId: ChatId,
    userId: UserId
): Promise<SecurityChatMember> {
    if (ctx.chatMembers) {
        return ctx.chatMembers.get(chatId, userId);
    }

    if (!ctx.client) {
        throw new Error('[vibegram/security] ctx.client is required for requireAdmin().');
    }

    return await ctx.client.callApi('getChatMember', {
        chat_id: chatId,
        user_id: userId,
    }) as SecurityChatMember;
}

function compose<C extends SecurityContext>(middlewares: Array<SecurityMiddleware<C>>): SecurityMiddleware<C> {
    return async (ctx, next) => {
        let index = -1;

        async function dispatch(position: number): Promise<void> {
            if (position <= index) {
                throw new Error('[vibegram/security] next() called multiple times.');
            }
            index = position;
            const middleware = middlewares[position];
            if (!middleware) {
                await next();
                return;
            }
            await middleware(ctx, () => dispatch(position + 1));
        }

        await dispatch(0);
    };
}

async function deny<C extends SecurityContext>(
    ctx: C,
    reason: SecurityGuardReason,
    options: GuardOptions<C>
): Promise<void> {
    ensureSecuritySession(ctx).denyReasons.push(reason);
    if (options.onDenied) {
        await options.onDenied(ctx, reason);
    }
}

function ensureSecuritySession<C extends SecurityContext>(ctx: C): SecuritySession {
    if (!ctx.security) {
        ctx.security = { denyReasons: [] };
    }
    return ctx.security;
}

function defaultSpamKey(ctx: SecurityContext): string | undefined {
    if (typeof ctx.from?.id === 'number') {
        return `user:${ctx.from.id}`;
    }
    if (isChatId(ctx.chat?.id)) {
        return `chat:${ctx.chat.id}`;
    }
    return undefined;
}

function readHeader(headers: WebhookSecretHeaders, name: string): string | undefined {
    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined;
    }

    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== target) {
            continue;
        }
        if (Array.isArray(value)) {
            return value[0];
        }
        if (typeof value === 'number') {
            return String(value);
        }
        return value;
    }

    return undefined;
}

function safeTokenEquals(actual: string, expected: string): boolean {
    const actualHash = createHash('sha256').update(actual).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(actualHash, expectedHash);
}

interface NormalizedRedactOptions {
    redact: Set<string>;
    replacement: string;
    maxDepth: number;
}

function normalizeRedactOptions(options: RedactOptions): NormalizedRedactOptions {
    return {
        redact: new Set([...DEFAULT_REDACT_KEYS, ...(options.redact ?? [])].map(key => key.toLowerCase())),
        replacement: options.replacement ?? DEFAULT_REPLACEMENT,
        maxDepth: positiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, 'maxDepth'),
    };
}

function redactDeep(
    value: unknown,
    options: NormalizedRedactOptions,
    depth: number,
    seen: WeakSet<object>
): unknown {
    if (depth > options.maxDepth) {
        return '[MaxDepth]';
    }

    if (typeof value === 'string') {
        return redactString(value, options);
    }
    if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (typeof value === 'function') {
        return '[Function]';
    }
    if (typeof value !== 'object') {
        return String(value);
    }
    if (value instanceof Error) {
        return redactError(value, {
            redact: Array.from(options.redact),
            replacement: options.replacement,
            maxDepth: options.maxDepth,
        });
    }
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (seen.has(value)) {
        return '[Circular]';
    }
    seen.add(value);

    if (Array.isArray(value)) {
        return value.map(entry => redactDeep(entry, options, depth + 1, seen));
    }

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (options.redact.has(key.toLowerCase())) {
            result[key] = options.replacement;
        } else {
            result[key] = redactDeep(entry, options, depth + 1, seen);
        }
    }
    return result;
}

function redactString(value: string, options: NormalizedRedactOptions): string {
    return value.replace(TELEGRAM_TOKEN_PATTERN, options.replacement);
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`[vibegram/security] ${name} must be a positive integer.`);
    }
    return value;
}

function isChatId(value: unknown): value is ChatId {
    return typeof value === 'number' || typeof value === 'string';
}
