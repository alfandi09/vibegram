export interface TelegramClientRequest {
    method: string;
    data?: unknown;
    retries: number;
    networkRetries: number;
}

export type TelegramClientNext = (request: TelegramClientRequest) => Promise<unknown>;
export type TelegramClientTransformer = (next: TelegramClientNext) => TelegramClientNext;

export interface ThrottleBucketOptions {
    maxConcurrent?: number;
    minTime?: number;
    priority?: number;
}

export interface ApiThrottlerOptions {
    global?: ThrottleBucketOptions | false;
    private?: ThrottleBucketOptions | false;
    out?: ThrottleBucketOptions | false;
    group?: ThrottleBucketOptions | false;
    methods?: Record<string, ThrottleBucketOptions | false>;
    maxQueueSize?: number;
    queueStrategy?: 'reject' | 'drop-oldest';
    priority?: (request: TelegramClientRequest) => number;
}

export interface ApiThrottlerStats {
    active: number;
    pending: number;
    processed: number;
    rejected: number;
    dropped: number;
    closed: boolean;
}

export interface ApiThrottler extends TelegramClientTransformer {
    stats(): ApiThrottlerStats;
    idle(): Promise<void>;
    close(): Promise<void>;
}

interface NormalizedBucketOptions {
    maxConcurrent: number;
    minTime: number;
    priority: number;
}

interface NormalizedApiThrottlerOptions {
    global?: NormalizedBucketOptions;
    private?: NormalizedBucketOptions;
    group?: NormalizedBucketOptions;
    methods: Map<string, NormalizedBucketOptions>;
    maxQueueSize: number;
    queueStrategy: 'reject' | 'drop-oldest';
    priority?: (request: TelegramClientRequest) => number;
}

interface BucketState {
    key: string;
    active: number;
    nextAvailableAt: number;
    options: NormalizedBucketOptions;
}

interface QueueJob {
    id: number;
    request: TelegramClientRequest;
    priority: number;
    run: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
}

const DEFAULT_GLOBAL: NormalizedBucketOptions = {
    maxConcurrent: 30,
    minTime: 35,
    priority: 0,
};
const DEFAULT_PRIVATE: NormalizedBucketOptions = {
    maxConcurrent: 1,
    minTime: 1000,
    priority: 0,
};
const DEFAULT_GROUP: NormalizedBucketOptions = {
    maxConcurrent: 1,
    minTime: 1000,
    priority: 0,
};

/** Error thrown when the throttler cannot accept another queued API request. */
export class ThrottlerQueueOverflowError extends Error {
    constructor(method: string) {
        super(`VibeGram throttler queue is full while scheduling ${method}.`);
        this.name = 'ThrottlerQueueOverflowError';
    }
}

/** Error thrown when scheduling a request after the throttler has been closed. */
export class ThrottlerClosedError extends Error {
    constructor(method: string) {
        super(`VibeGram throttler is closed and cannot schedule ${method}.`);
        this.name = 'ThrottlerClosedError';
    }
}

class ThrottlerScheduler {
    private readonly pending: QueueJob[] = [];
    private readonly buckets = new Map<string, BucketState>();
    private readonly idleWaiters: Array<() => void> = [];
    private timer?: ReturnType<typeof setTimeout>;
    private nextJobId = 0;
    private active = 0;
    private processed = 0;
    private rejected = 0;
    private dropped = 0;
    private closed = false;

    constructor(private readonly options: NormalizedApiThrottlerOptions) {}

    stats(): ApiThrottlerStats {
        return {
            active: this.active,
            pending: this.pending.length,
            processed: this.processed,
            rejected: this.rejected,
            dropped: this.dropped,
            closed: this.closed,
        };
    }

    schedule(request: TelegramClientRequest, run: () => Promise<unknown>): Promise<unknown> {
        if (this.closed) {
            this.rejected += 1;
            return Promise.reject(new ThrottlerClosedError(request.method));
        }

        if (this.pending.length >= this.options.maxQueueSize) {
            const overflow = new ThrottlerQueueOverflowError(request.method);

            if (this.options.queueStrategy === 'drop-oldest') {
                const dropped = this.pending.shift();
                dropped?.reject(overflow);
                this.dropped += dropped ? 1 : 0;
            } else {
                this.rejected += 1;
                return Promise.reject(overflow);
            }
        }

        return new Promise((resolve, reject) => {
            this.pending.push({
                id: this.nextJobId++,
                request,
                priority: this.getPriority(request),
                run,
                resolve,
                reject,
            });
            this.tryStartJobs();
        });
    }

    idle(): Promise<void> {
        if (this.isIdle()) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.idleWaiters.push(resolve);
        });
    }

    close(): Promise<void> {
        this.closed = true;
        return this.idle();
    }

    private getPriority(request: TelegramClientRequest): number {
        const methodPriority = this.options.methods.get(request.method)?.priority ?? 0;
        const dynamicPriority = this.options.priority?.(request) ?? 0;
        return methodPriority + dynamicPriority;
    }

    private tryStartJobs(): void {
        this.clearWakeTimer();

        while (true) {
            const nextIndex = this.findStartableJobIndex();

            if (nextIndex < 0) {
                break;
            }

            const [job] = this.pending.splice(nextIndex, 1);
            if (!job) {
                break;
            }

            this.startJob(job);
        }

        this.scheduleWakeTimer();
        this.notifyIdle();
    }

    private findStartableJobIndex(): number {
        const now = Date.now();
        let selectedIndex = -1;
        let selected: QueueJob | undefined;

        for (let index = 0; index < this.pending.length; index++) {
            const job = this.pending[index];
            if (!job || !this.canStart(job, now)) {
                continue;
            }

            if (!selected || compareJobs(job, selected) < 0) {
                selected = job;
                selectedIndex = index;
            }
        }

        return selectedIndex;
    }

    private canStart(job: QueueJob, now: number): boolean {
        return this.getBuckets(job.request).every(bucket => canStartBucket(bucket, now));
    }

    private startJob(job: QueueJob): void {
        const now = Date.now();
        const buckets = this.getBuckets(job.request);

        for (const bucket of buckets) {
            bucket.active += 1;
            bucket.nextAvailableAt = Math.max(bucket.nextAvailableAt, now + bucket.options.minTime);
        }

        this.active += 1;

        void job
            .run()
            .then(job.resolve, job.reject)
            .finally(() => {
                for (const bucket of buckets) {
                    bucket.active -= 1;
                }

                this.active -= 1;
                this.processed += 1;
                this.tryStartJobs();
            });
    }

    private getBuckets(request: TelegramClientRequest): BucketState[] {
        const bucketOptions: Array<[string, NormalizedBucketOptions | undefined]> = [
            ['global', this.options.global],
            [`method:${request.method}`, this.options.methods.get(request.method)],
        ];
        const chatBucket = this.getChatBucket(request);

        if (chatBucket) {
            bucketOptions.push(chatBucket);
        }

        return bucketOptions
            .filter((entry): entry is [string, NormalizedBucketOptions] => Boolean(entry[1]))
            .map(([key, options]) => this.getBucket(key, options));
    }

    private getChatBucket(
        request: TelegramClientRequest
    ): [string, NormalizedBucketOptions] | undefined {
        const chatId = getChatId(request.data);
        if (chatId === undefined) {
            return undefined;
        }

        const isGroup = isGroupChatId(chatId);
        const options = isGroup ? this.options.group : this.options.private;

        if (!options) {
            return undefined;
        }

        return [`${isGroup ? 'group' : 'private'}:${chatId}`, options];
    }

    private getBucket(key: string, options: NormalizedBucketOptions): BucketState {
        const existing = this.buckets.get(key);

        if (existing) {
            return existing;
        }

        const created: BucketState = {
            key,
            active: 0,
            nextAvailableAt: 0,
            options,
        };
        this.buckets.set(key, created);
        return created;
    }

    private scheduleWakeTimer(): void {
        const nextWakeAt = this.getNextWakeAt();

        if (nextWakeAt === undefined) {
            return;
        }

        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.tryStartJobs();
        }, Math.max(0, nextWakeAt - Date.now()));
    }

    private getNextWakeAt(): number | undefined {
        let nextWakeAt: number | undefined;

        for (const job of this.pending) {
            const buckets = this.getBuckets(job.request);

            if (buckets.some(bucket => bucket.active >= bucket.options.maxConcurrent)) {
                continue;
            }

            const jobWakeAt = buckets.reduce(
                (latest, bucket) => Math.max(latest, bucket.nextAvailableAt),
                0
            );

            nextWakeAt =
                nextWakeAt === undefined ? jobWakeAt : Math.min(nextWakeAt, jobWakeAt);
        }

        return nextWakeAt;
    }

    private clearWakeTimer(): void {
        if (!this.timer) {
            return;
        }

        clearTimeout(this.timer);
        this.timer = undefined;
    }

    private notifyIdle(): void {
        if (!this.isIdle()) {
            return;
        }

        const waiters = this.idleWaiters.splice(0);
        for (const waiter of waiters) {
            waiter();
        }
    }

    private isIdle(): boolean {
        return this.active === 0 && this.pending.length === 0;
    }
}

/**
 * Creates a Telegram client transformer that queues outgoing Bot API calls through
 * global, per-method, and per-chat throttle buckets.
 */
export function apiThrottler(options: ApiThrottlerOptions = {}): ApiThrottler {
    const scheduler = new ThrottlerScheduler(normalizeOptions(options));
    const transformer = ((next: TelegramClientNext) => (request: TelegramClientRequest) =>
        scheduler.schedule(request, () => next(request))) as ApiThrottler;

    transformer.stats = () => scheduler.stats();
    transformer.idle = () => scheduler.idle();
    transformer.close = () => scheduler.close();

    return transformer;
}

function normalizeOptions(options: ApiThrottlerOptions): NormalizedApiThrottlerOptions {
    return {
        global: normalizeBucketOption(options.global, DEFAULT_GLOBAL),
        private: normalizeBucketOption(options.private ?? options.out, DEFAULT_PRIVATE),
        group: normalizeBucketOption(options.group, DEFAULT_GROUP),
        methods: normalizeMethods(options.methods),
        maxQueueSize: positiveInteger(options.maxQueueSize, 1000, 'maxQueueSize'),
        queueStrategy: normalizeQueueStrategy(options.queueStrategy),
        priority: options.priority,
    };
}

function normalizeMethods(
    methods: Record<string, ThrottleBucketOptions | false> | undefined
): Map<string, NormalizedBucketOptions> {
    const normalized = new Map<string, NormalizedBucketOptions>();

    if (!methods) {
        return normalized;
    }

    for (const [method, options] of Object.entries(methods)) {
        const bucket = normalizeBucketOption(options, {
            maxConcurrent: 1,
            minTime: 0,
            priority: 0,
        });

        if (bucket) {
            normalized.set(method, bucket);
        }
    }

    return normalized;
}

function normalizeBucketOption(
    value: ThrottleBucketOptions | false | undefined,
    fallback: NormalizedBucketOptions
): NormalizedBucketOptions | undefined {
    if (value === false) {
        return undefined;
    }

    return {
        maxConcurrent: positiveInteger(value?.maxConcurrent, fallback.maxConcurrent, 'maxConcurrent'),
        minTime: nonNegativeNumber(value?.minTime, fallback.minTime, 'minTime'),
        priority: finiteNumber(value?.priority, fallback.priority, 'priority'),
    };
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`${name} must be a positive integer.`);
    }

    return value;
}

function nonNegativeNumber(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isFinite(value) || value < 0) {
        throw new TypeError(`${name} must be a non-negative number.`);
    }

    return value;
}

function finiteNumber(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isFinite(value)) {
        throw new TypeError(`${name} must be a finite number.`);
    }

    return value;
}

function normalizeQueueStrategy(
    value: ApiThrottlerOptions['queueStrategy'] | undefined
): 'reject' | 'drop-oldest' {
    if (value === undefined) {
        return 'reject';
    }

    if (value !== 'reject' && value !== 'drop-oldest') {
        throw new TypeError('queueStrategy must be either "reject" or "drop-oldest".');
    }

    return value;
}

function compareJobs(a: QueueJob, b: QueueJob): number {
    if (a.priority !== b.priority) {
        return b.priority - a.priority;
    }

    return a.id - b.id;
}

function canStartBucket(bucket: BucketState, now: number): boolean {
    return bucket.active < bucket.options.maxConcurrent && now >= bucket.nextAvailableAt;
}

function getChatId(data: unknown): string | number | undefined {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return undefined;
    }

    const chatId = (data as Record<string, unknown>).chat_id;

    if (typeof chatId === 'number' || typeof chatId === 'string') {
        return chatId;
    }

    return undefined;
}

function isGroupChatId(chatId: string | number): boolean {
    if (typeof chatId === 'number') {
        return chatId < 0;
    }

    if (chatId.startsWith('-')) {
        return true;
    }

    const numeric = Number(chatId);
    return Number.isFinite(numeric) ? numeric < 0 : false;
}
