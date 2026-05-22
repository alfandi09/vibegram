export interface RunnerUpdate {
    update_id: number;
    message?: unknown;
    edited_message?: unknown;
    channel_post?: unknown;
    edited_channel_post?: unknown;
    callback_query?: unknown;
    my_chat_member?: unknown;
    chat_member?: unknown;
    chat_join_request?: unknown;
    message_reaction?: unknown;
    message_reaction_count?: unknown;
    business_message?: unknown;
    edited_business_message?: unknown;
    chat_boost?: unknown;
    removed_chat_boost?: unknown;
}

export interface RunnerBot {
    client: {
        callApi(method: string, payload?: Record<string, unknown>): Promise<unknown>;
    };
    handleUpdate(update: RunnerUpdate): Promise<void> | void;
}

export interface RunnerPollingOptions {
    offset?: number;
    limit?: number;
    timeout?: number;
    interval?: number;
    allowed_updates?: string[];
}

export interface RunnerOptions {
    concurrency?: number;
    orderedByChat?: boolean;
    maxQueueSize?: number;
    stopTimeoutMs?: number;
    retryDelayMs?: number;
    polling?: RunnerPollingOptions;
    onStart?: (event: RunnerLifecycleEvent) => Promise<void> | void;
    onStop?: (event: RunnerLifecycleEvent) => Promise<void> | void;
    onError?: (event: RunnerErrorEvent) => Promise<void> | void;
    onQueueFull?: (event: RunnerQueueFullEvent) => Promise<void> | void;
    onUpdateComplete?: (event: RunnerUpdateCompleteEvent) => Promise<void> | void;
}

export interface RunnerStats {
    received: number;
    processed: number;
    failed: number;
    active: number;
    pending: number;
    offset: number | undefined;
    isRunning: boolean;
    isStopping: boolean;
}

export interface RunnerLifecycleEvent {
    stats: RunnerStats;
}

export interface RunnerErrorEvent {
    phase: 'polling' | 'handleUpdate';
    error: unknown;
    update?: RunnerUpdate;
    stats: RunnerStats;
}

export interface RunnerQueueFullEvent {
    update: RunnerUpdate;
    pending: number;
    active: number;
    capacity: number;
    stats: RunnerStats;
}

export interface RunnerUpdateCompleteEvent {
    update: RunnerUpdate;
    durationMs: number;
    error?: unknown;
    stats: RunnerStats;
}

export interface RunnerHandle {
    readonly isRunning: boolean;
    readonly isStopping: boolean;
    stats(): RunnerStats;
    idle(): Promise<void>;
    done(): Promise<void>;
    stop(): Promise<void>;
}

interface NormalizedRunnerOptions {
    concurrency: number;
    orderedByChat: boolean;
    maxQueueSize: number;
    stopTimeoutMs: number;
    retryDelayMs: number;
    polling: Required<Pick<RunnerPollingOptions, 'limit' | 'timeout' | 'interval'>> &
        Pick<RunnerPollingOptions, 'offset' | 'allowed_updates'>;
    hooks: Pick<
        RunnerOptions,
        'onStart' | 'onStop' | 'onError' | 'onQueueFull' | 'onUpdateComplete'
    >;
}

interface QueuedUpdate {
    update: RunnerUpdate;
    orderingKey?: string;
}

export class RunnerStopTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`VibeGram runner did not drain in-flight updates within ${timeoutMs}ms`);
        this.name = 'RunnerStopTimeoutError';
    }
}

class VibeGramRunner implements RunnerHandle {
    private readonly queue: QueuedUpdate[] = [];
    private readonly activeKeys = new Set<string>();
    private readonly idleWaiters: Array<() => void> = [];
    private readonly capacityWaiters: Array<() => void> = [];
    private readonly donePromise: Promise<void>;

    private active = 0;
    private received = 0;
    private processed = 0;
    private failed = 0;
    private offset: number | undefined;
    private running = true;
    private stopping = false;
    private stopPromise?: Promise<void>;
    private resolveDone!: () => void;

    constructor(
        private readonly bot: RunnerBot,
        private readonly options: NormalizedRunnerOptions
    ) {
        this.offset = options.polling.offset;
        this.donePromise = new Promise((resolve) => {
            this.resolveDone = resolve;
        });

        void this.start();
    }

    get isRunning(): boolean {
        return this.running;
    }

    get isStopping(): boolean {
        return this.stopping;
    }

    stats(): RunnerStats {
        return {
            received: this.received,
            processed: this.processed,
            failed: this.failed,
            active: this.active,
            pending: this.queue.length,
            offset: this.offset,
            isRunning: this.running,
            isStopping: this.stopping,
        };
    }

    idle(): Promise<void> {
        if (this.isIdle()) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.idleWaiters.push(resolve);
        });
    }

    done(): Promise<void> {
        return this.donePromise;
    }

    stop(): Promise<void> {
        if (this.stopPromise) {
            return this.stopPromise;
        }

        this.stopping = true;
        this.running = false;
        this.notifyCapacityWaiters();

        this.stopPromise = this.withStopTimeout(this.idle()).then(async () => {
            await this.callLifecycleHook(this.options.hooks.onStop);
        });

        return this.stopPromise;
    }

    private async start(): Promise<void> {
        try {
            await this.callLifecycleHook(this.options.hooks.onStart);
            await this.pollingLoop();
        } finally {
            this.running = false;
            this.resolveDone();
        }
    }

    private async pollingLoop(): Promise<void> {
        while (this.running) {
            try {
                const updates = await this.fetchUpdates();

                if (!this.running) {
                    break;
                }

                for (const update of updates) {
                    await this.waitForQueueSlot(update);

                    if (!this.running && this.stopping) {
                        break;
                    }

                    this.enqueue(update);
                    this.offset = Math.max(this.offset ?? 0, update.update_id + 1);
                }

                if (this.options.polling.interval > 0) {
                    await sleep(this.options.polling.interval);
                }
            } catch (error) {
                await this.callErrorHook({ phase: 'polling', error });
                await sleep(this.options.retryDelayMs);
            }
        }
    }

    private async fetchUpdates(): Promise<RunnerUpdate[]> {
        const payload: Record<string, unknown> = {
            offset: this.offset,
            limit: this.options.polling.limit,
            timeout: this.options.polling.timeout,
        };

        if (this.options.polling.allowed_updates) {
            payload.allowed_updates = this.options.polling.allowed_updates;
        }

        const result = await this.bot.client.callApi('getUpdates', payload);

        if (!Array.isArray(result)) {
            throw new TypeError('VibeGram runner expected getUpdates to return an array');
        }

        return result as RunnerUpdate[];
    }

    private async waitForQueueSlot(update: RunnerUpdate): Promise<void> {
        while (this.queue.length >= this.options.maxQueueSize && this.running) {
            await this.callQueueFullHook(update);
            await new Promise<void>((resolve) => {
                this.capacityWaiters.push(resolve);
            });
        }
    }

    private enqueue(update: RunnerUpdate): void {
        this.received += 1;
        this.queue.push({
            update,
            orderingKey: this.options.orderedByChat ? getUpdateOrderingKey(update) : undefined,
        });
        this.schedule();
    }

    private schedule(): void {
        while (this.active < this.options.concurrency) {
            const index = this.queue.findIndex((item) => this.canStart(item));

            if (index < 0) {
                break;
            }

            const item = this.queue.splice(index, 1)[0];

            if (!item) {
                break;
            }

            this.startUpdate(item);
        }

        this.notifyCapacityWaiters();
        this.notifyIdleWaiters();
    }

    private canStart(item: QueuedUpdate): boolean {
        return !item.orderingKey || !this.activeKeys.has(item.orderingKey);
    }

    private startUpdate(item: QueuedUpdate): void {
        this.active += 1;

        if (item.orderingKey) {
            this.activeKeys.add(item.orderingKey);
        }

        void this.processUpdate(item);
    }

    private async processUpdate(item: QueuedUpdate): Promise<void> {
        const startedAt = Date.now();
        let caughtError: unknown;

        try {
            await this.bot.handleUpdate(item.update);
        } catch (error) {
            caughtError = error;
            this.failed += 1;
            await this.callErrorHook({
                phase: 'handleUpdate',
                error,
                update: item.update,
            });
        } finally {
            this.active -= 1;
            this.processed += 1;

            if (item.orderingKey) {
                this.activeKeys.delete(item.orderingKey);
            }

            await this.callUpdateCompleteHook({
                update: item.update,
                durationMs: Date.now() - startedAt,
                error: caughtError,
            });

            this.schedule();
        }
    }

    private async callLifecycleHook(
        hook: ((event: RunnerLifecycleEvent) => Promise<void> | void) | undefined
    ): Promise<void> {
        if (!hook) {
            return;
        }

        try {
            await hook({ stats: this.stats() });
        } catch (error) {
            await this.callErrorHook({ phase: 'handleUpdate', error });
        }
    }

    private async callErrorHook(event: Omit<RunnerErrorEvent, 'stats'>): Promise<void> {
        try {
            await this.options.hooks.onError?.({ ...event, stats: this.stats() });
        } catch {
            // Error hooks must never crash the runner.
        }
    }

    private async callQueueFullHook(update: RunnerUpdate): Promise<void> {
        await this.options.hooks.onQueueFull?.({
            update,
            pending: this.queue.length,
            active: this.active,
            capacity: this.options.maxQueueSize,
            stats: this.stats(),
        });
    }

    private async callUpdateCompleteHook(
        event: Omit<RunnerUpdateCompleteEvent, 'stats'>
    ): Promise<void> {
        try {
            await this.options.hooks.onUpdateComplete?.({ ...event, stats: this.stats() });
        } catch (error) {
            await this.callErrorHook({ phase: 'handleUpdate', error, update: event.update });
        }
    }

    private notifyCapacityWaiters(): void {
        if (this.capacityWaiters.length === 0 || this.queue.length >= this.options.maxQueueSize) {
            return;
        }

        const waiters = this.capacityWaiters.splice(0);
        for (const waiter of waiters) {
            waiter();
        }
    }

    private notifyIdleWaiters(): void {
        if (!this.isIdle()) {
            return;
        }

        const waiters = this.idleWaiters.splice(0);
        for (const waiter of waiters) {
            waiter();
        }
    }

    private isIdle(): boolean {
        return this.active === 0 && this.queue.length === 0;
    }

    private async withStopTimeout(promise: Promise<void>): Promise<void> {
        let timeout: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                promise,
                new Promise<void>((_, reject) => {
                    timeout = setTimeout(
                        () => reject(new RunnerStopTimeoutError(this.options.stopTimeoutMs)),
                        this.options.stopTimeoutMs
                    );
                }),
            ]);
        } finally {
            if (timeout) {
                clearTimeout(timeout);
            }
        }
    }
}

export function run(bot: RunnerBot, options: RunnerOptions = {}): RunnerHandle {
    return new VibeGramRunner(bot, normalizeOptions(options));
}

function normalizeOptions(options: RunnerOptions): NormalizedRunnerOptions {
    return {
        concurrency: positiveInteger(options.concurrency, 16, 'concurrency'),
        orderedByChat: options.orderedByChat ?? true,
        maxQueueSize: positiveInteger(options.maxQueueSize, 1000, 'maxQueueSize'),
        stopTimeoutMs: positiveInteger(options.stopTimeoutMs, 30_000, 'stopTimeoutMs'),
        retryDelayMs: positiveInteger(options.retryDelayMs, 3000, 'retryDelayMs'),
        polling: {
            offset: options.polling?.offset,
            limit: positiveInteger(options.polling?.limit, 100, 'polling.limit'),
            timeout: nonNegativeInteger(options.polling?.timeout, 30, 'polling.timeout'),
            interval: nonNegativeInteger(options.polling?.interval, 0, 'polling.interval'),
            allowed_updates: options.polling?.allowed_updates,
        },
        hooks: {
            onStart: options.onStart,
            onStop: options.onStop,
            onError: options.onError,
            onQueueFull: options.onQueueFull,
            onUpdateComplete: options.onUpdateComplete,
        },
    };
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new RangeError(`${name} must be a positive integer`);
    }

    return value;
}

function nonNegativeInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`${name} must be a non-negative integer`);
    }

    return value;
}

function getUpdateOrderingKey(update: RunnerUpdate): string | undefined {
    return (
        readChatId(update.message) ??
        readChatId(update.edited_message) ??
        readChatId(update.channel_post) ??
        readChatId(update.edited_channel_post) ??
        readChatId(update.business_message) ??
        readChatId(update.edited_business_message) ??
        readChatId(readRecord(update.callback_query)?.message) ??
        readChatId(update.my_chat_member) ??
        readChatId(update.chat_member) ??
        readChatId(update.chat_join_request) ??
        readChatId(update.message_reaction) ??
        readChatId(update.message_reaction_count) ??
        readChatId(update.chat_boost) ??
        readChatId(update.removed_chat_boost)
    );
}

function readChatId(value: unknown): string | undefined {
    const record = readRecord(value);
    const chat = readRecord(record?.chat);
    const id = chat?.id;

    if (typeof id === 'number' || typeof id === 'string') {
        return String(id);
    }

    return undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

async function sleep(ms: number): Promise<void> {
    if (ms <= 0) {
        return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
}
