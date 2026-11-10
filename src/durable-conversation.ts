import { Context } from './context';
import type { Middleware } from './composer';
import type { TelegramClient } from './client';
import { TelegramApiError } from './errors';
import type { Contact, Location, PhotoSize, Update } from './types';

/**
 * Durable conversations survive restarts and work across multiple instances or
 * serverless invocations. Instead of keeping a suspended function in memory,
 * they store the updates a conversation received plus the result of every Bot
 * API call and `conv.external()` call. On each new update the handler is
 * replayed from the start: recorded updates are fed to `wait*()` instantly and
 * recorded API results are returned without calling Telegram again, so nothing
 * is sent twice.
 *
 * Rule: the handler must be deterministic. Put anything that can differ between
 * runs (database reads/writes, `Date.now()`, `Math.random()`, HTTP calls) inside
 * `conv.external(() => ...)`, whose result is recorded and replayed.
 *
 * ```typescript
 * const conversations = new DurableConversation({ store: myRedisStore });
 *
 * conversations.define('signup', async (ctx, conv) => {
 *     await ctx.reply('What is your name?');
 *     const name = await conv.waitForText();
 *     const id = await conv.external(() => db.users.insert({ name }));
 *     await ctx.reply(`Welcome, ${name}! Your id is ${id}.`);
 * });
 *
 * bot.use(conversations.middleware());
 * bot.command('signup', ctx => conversations.enter('signup', ctx));
 * ```
 */

/** One recorded side effect: a Bot API call or a `conv.external()` call. */
export type ConversationReplayEntry =
    | { kind: 'api'; method: string; ok: true; value: unknown }
    | { kind: 'api'; method: string; ok: false; error: SerializedError }
    | { kind: 'external'; ok: true; value: unknown }
    | { kind: 'external'; ok: false; error: SerializedError };

export interface SerializedError {
    name: string;
    message: string;
    errorCode?: number;
    description?: string;
}

/** Persisted state of one active conversation. Must be JSON-serializable. */
export interface ConversationRecord {
    name: string;
    updates: Update[];
    entries: ConversationReplayEntry[];
    startedAt: number;
    expiresAt: number;
}

/** Storage adapter (Redis, a database, KV, ...). Values must round-trip through JSON. */
export interface ConversationStore {
    get(key: string): ConversationRecord | undefined | Promise<ConversationRecord | undefined>;
    set(key: string, record: ConversationRecord): void | Promise<void>;
    delete(key: string): void | Promise<void>;
}

/** In-memory store. Values are JSON-cloned to surface non-serializable state early. */
export class MemoryConversationStore implements ConversationStore {
    private readonly records = new Map<string, string>();

    get(key: string): ConversationRecord | undefined {
        const raw = this.records.get(key);
        return raw === undefined ? undefined : (JSON.parse(raw) as ConversationRecord);
    }

    set(key: string, record: ConversationRecord): void {
        this.records.set(key, JSON.stringify(record));
    }

    delete(key: string): void {
        this.records.delete(key);
    }

    get size(): number {
        return this.records.size;
    }
}

/** Thrown when a replay diverges from the recorded history (non-deterministic handler). */
export class ConversationReplayError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConversationReplayError';
    }
}

export interface DurableWaitOptions {
    /** Return false to reject the update; the conversation keeps waiting. */
    validate?: (ctx: Context) => boolean | Promise<boolean>;
    /** Message sent when validation fails. */
    validationError?: string;
}

/** Controls available inside a durable conversation handler. */
export interface DurableConversationControls {
    /** Wait for the next update from this user in this chat. */
    wait(options?: DurableWaitOptions): Promise<Context>;
    waitForText(options?: DurableWaitOptions): Promise<string>;
    waitForCallbackQuery(options?: DurableWaitOptions): Promise<string>;
    waitForPhoto(options?: DurableWaitOptions): Promise<PhotoSize[]>;
    waitForContact(options?: DurableWaitOptions): Promise<Contact>;
    waitForLocation(options?: DurableWaitOptions): Promise<Location>;
    /**
     * Run a non-deterministic side effect once and replay its (JSON-serializable)
     * result on later runs. Errors are recorded and re-thrown on replay too.
     */
    external<T>(fn: () => T | Promise<T>): Promise<T>;
}

export type DurableConversationHandler = (
    ctx: Context,
    conv: DurableConversationControls
) => Promise<void>;

export interface DurableConversationOptions {
    /** Where active conversations are stored. Defaults to MemoryConversationStore. */
    store?: ConversationStore;
    /** Inactivity timeout in ms; expired conversations are dropped. Default: 24 hours. */
    timeout?: number;
    /** Conversation key. Default: `${chat.id}:${from.id}`. */
    getKey?: (ctx: Context) => string | undefined;
}

const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

function serializeError(error: unknown): SerializedError {
    if (error instanceof TelegramApiError) {
        return {
            name: error.name,
            message: error.message,
            errorCode: error.errorCode,
            description: error.description,
        };
    }
    if (error instanceof Error) return { name: error.name, message: error.message };
    return { name: 'Error', message: String(error) };
}

function deserializeError(error: SerializedError): Error {
    if (error.errorCode !== undefined) {
        return new TelegramApiError(error.message, error.errorCode, error.description ?? '');
    }
    const rebuilt = new Error(error.message);
    rebuilt.name = error.name;
    return rebuilt;
}

function defaultKey(ctx: Context): string | undefined {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    return chatId !== undefined && userId !== undefined ? `${chatId}:${userId}` : undefined;
}

type ReplayOutcome = 'waiting' | 'done';

/**
 * Re-run `handler` against `record`, appending any new side-effect results to
 * `record.entries`. Resolves with 'waiting' when the handler needs an update
 * that has not arrived yet, or 'done' when it returned.
 */
async function replay(
    handler: DurableConversationHandler,
    record: ConversationRecord,
    baseClient: TelegramClient
): Promise<ReplayOutcome> {
    let entryIndex = 0;
    let updateIndex = 1;
    let markWaiting!: () => void;
    const waiting = new Promise<ReplayOutcome>(resolve => {
        markWaiting = () => resolve('waiting');
    });

    function takeRecorded(kind: 'api' | 'external', method?: string) {
        if (entryIndex >= record.entries.length) {
            entryIndex++;
            return undefined;
        }
        const entry = record.entries[entryIndex++];
        const recordedMethod = entry.kind === 'api' ? entry.method : undefined;
        if (entry.kind !== kind || recordedMethod !== method) {
            throw new ConversationReplayError(
                `Conversation "${record.name}" is not deterministic: expected ${
                    entry.kind === 'api' ? `callApi("${entry.method}")` : 'conv.external()'
                } but got ${kind === 'api' ? `callApi("${method}")` : 'conv.external()'}. ` +
                    'Wrap non-deterministic code in conv.external().'
            );
        }
        return entry;
    }

    const recordingClient = Object.create(baseClient) as TelegramClient;
    recordingClient.callApi = async (method: string, data?: unknown, retries?: number) => {
        const recorded = takeRecorded('api', method);
        if (recorded) {
            if (recorded.ok) return recorded.value;
            throw deserializeError(recorded.error);
        }
        try {
            const value = await baseClient.callApi(method, data, retries);
            record.entries.push({ kind: 'api', method, ok: true, value });
            return value;
        } catch (error) {
            record.entries.push({ kind: 'api', method, ok: false, error: serializeError(error) });
            throw error;
        }
    };

    const makeContext = (update: Update) => new Context(update, recordingClient);

    async function wait(options?: DurableWaitOptions): Promise<Context> {
        while (true) {
            if (updateIndex >= record.updates.length) {
                markWaiting();
                // Never settles: this replay stops here until the next update arrives.
                return new Promise<Context>(() => {});
            }
            const ctx = makeContext(record.updates[updateIndex++]);
            if (options?.validate && !(await options.validate(ctx))) {
                if (options.validationError) await ctx.reply(options.validationError);
                continue;
            }
            return ctx;
        }
    }

    function waitFor<T>(
        pick: (ctx: Context) => T | undefined,
        defaultError: string,
        options?: DurableWaitOptions
    ): Promise<T> {
        return wait({
            validationError: options?.validationError ?? defaultError,
            validate: async ctx =>
                pick(ctx) !== undefined && (options?.validate ? options.validate(ctx) : true),
        }).then(ctx => pick(ctx) as T);
    }

    const controls: DurableConversationControls = {
        wait,
        waitForText: options =>
            waitFor(ctx => ctx.message?.text, 'Please send a text message.', options),
        waitForCallbackQuery: options =>
            waitFor(ctx => ctx.update.callback_query?.data, 'Please press a button.', options),
        waitForPhoto: options =>
            waitFor(
                ctx => (ctx.message?.photo?.length ? ctx.message.photo : undefined),
                'Please send a photo.',
                options
            ),
        waitForContact: options =>
            waitFor(ctx => ctx.message?.contact, 'Please share your contact.', options),
        waitForLocation: options =>
            waitFor(ctx => ctx.message?.location, 'Please share your location.', options),
        async external<T>(fn: () => T | Promise<T>): Promise<T> {
            const recorded = takeRecorded('external');
            if (recorded) {
                if (recorded.ok) return recorded.value as T;
                throw deserializeError(recorded.error);
            }
            try {
                const value = await fn();
                record.entries.push({ kind: 'external', ok: true, value });
                return value;
            } catch (error) {
                record.entries.push({ kind: 'external', ok: false, error: serializeError(error) });
                throw error;
            }
        },
    };

    const finished = handler(makeContext(record.updates[0]), controls).then(
        (): ReplayOutcome => 'done'
    );
    return Promise.race([finished, waiting]);
}

export class DurableConversation {
    private readonly definitions = new Map<string, DurableConversationHandler>();
    private readonly locks = new Map<string, Promise<void>>();
    private readonly store: ConversationStore;
    private readonly timeout: number;
    private readonly getKey: (ctx: Context) => string | undefined;

    constructor(options: DurableConversationOptions = {}) {
        this.store = options.store ?? new MemoryConversationStore();
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
        this.getKey = options.getKey ?? defaultKey;
        if (!Number.isFinite(this.timeout) || this.timeout <= 0) {
            throw new TypeError('DurableConversation timeout must be a positive number.');
        }
    }

    /** Register a conversation handler under a name. */
    define(name: string, handler: DurableConversationHandler): this {
        this.definitions.set(name, handler);
        return this;
    }

    /** Start a conversation for the current user/chat, replacing any active one. */
    async enter(name: string, ctx: Context): Promise<void> {
        const handler = this.definitions.get(name);
        if (!handler) throw new Error(`Conversation "${name}" is not defined`);
        const key = this.requireKey(ctx);

        await this.withLock(key, async () => {
            const now = Date.now();
            const record: ConversationRecord = {
                name,
                updates: [ctx.update],
                entries: [],
                startedAt: now,
                expiresAt: now + this.timeout,
            };
            await this.run(key, handler, record, ctx.client);
        });
    }

    /** Cancel the active conversation for the current user/chat, if any. */
    async leave(ctx: Context): Promise<void> {
        const key = this.getKey(ctx);
        if (key === undefined) return;
        await this.withLock(key, () => Promise.resolve(this.store.delete(key)));
    }

    /** Whether the current user/chat has an active, unexpired conversation. */
    async isActive(ctx: Context): Promise<boolean> {
        const key = this.getKey(ctx);
        if (key === undefined) return false;
        const record = await this.store.get(key);
        return record !== undefined && record.expiresAt > Date.now();
    }

    /**
     * Routes updates of users with an active conversation into it. Register it
     * before command handlers. Updates are consumed while a conversation waits.
     */
    middleware(): Middleware<Context> {
        return async (ctx, next) => {
            const key = this.getKey(ctx);
            if (key === undefined) return next();

            // The lock is released before next(), so downstream handlers may call enter().
            const consumed = await this.withLock(key, async () => {
                const record = await this.store.get(key);
                if (!record) return false;

                const handler = this.definitions.get(record.name);
                if (!handler || record.expiresAt <= Date.now()) {
                    await this.store.delete(key);
                    return false;
                }

                record.updates.push(ctx.update);
                record.expiresAt = Date.now() + this.timeout;
                await this.run(key, handler, record, ctx.client);
                return true;
            });

            if (!consumed) return next();
        };
    }

    private async run(
        key: string,
        handler: DurableConversationHandler,
        record: ConversationRecord,
        client: TelegramClient
    ): Promise<void> {
        let outcome: ReplayOutcome;
        try {
            outcome = await replay(handler, record, client);
        } catch (error) {
            await this.store.delete(key);
            throw error;
        }

        if (outcome === 'done') {
            await this.store.delete(key);
        } else {
            await this.store.set(key, record);
        }
    }

    private requireKey(ctx: Context): string {
        const key = this.getKey(ctx);
        if (key === undefined) {
            throw new Error('Cannot enter a conversation: chat or user is not available');
        }
        return key;
    }

    private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
        const previous = this.locks.get(key) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>(resolve => {
            release = resolve;
        });
        const tail = previous.then(() => current);
        this.locks.set(key, tail);

        try {
            await previous;
            return await fn();
        } finally {
            release();
            if (this.locks.get(key) === tail) this.locks.delete(key);
        }
    }
}
