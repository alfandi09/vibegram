import { TelegramClient } from './client';

/**
 * Job queue for rate-limited broadcasting and scheduled tasks.
 * Prevents 429 (Too Many Requests) errors when sending to many users.
 */

export interface QueueOptions {
    /** Max concurrent API calls (default: 25) */
    concurrency?: number;
    /** Delay between batches in ms (default: 1000) */
    delayMs?: number;
    /** Callback when a single job fails */
    onError?: (error: Error, chatId: number | string) => void;
    /** Callback for progress tracking */
    onProgress?: (completed: number, total: number) => void;
}

export interface BroadcastResult {
    total: number;
    success: number;
    failed: number;
    errors: Array<{ chatId: number | string; error: Error }>;
    durationMs: number;
}

export interface ScheduledJob {
    id: string;
    handler: () => void | Promise<void>;
    interval: ReturnType<typeof setInterval> | null;
    timeout: ReturnType<typeof setTimeout> | null;
}

/**
 * Rate-limited job queue for safe mass broadcasting and scheduling.
 *
 * Usage:
 * ```typescript
 * const queue = new BotQueue(bot.client);
 *
 * // Broadcast to many users safely
 * const result = await queue.broadcast(userIds, async (chatId) => {
 *     await bot.callApi('sendMessage', { chat_id: chatId, text: 'Update!' });
 * });
 *
 * console.log(`Sent: ${result.success}, Failed: ${result.failed}`);
 * ```
 */
export class BotQueue {
    private client: TelegramClient;
    private options: Required<Omit<QueueOptions, 'onError' | 'onProgress'>> & Pick<QueueOptions, 'onError' | 'onProgress'>;
    private scheduledJobs = new Map<string, ScheduledJob>();
    private isProcessing = false;

    constructor(client: TelegramClient, options?: QueueOptions) {
        this.client = client;
        this.options = {
            concurrency: options?.concurrency ?? 25,
            delayMs: options?.delayMs ?? 1000,
            onError: options?.onError,
            onProgress: options?.onProgress
        };
    }

    /**
     * Broadcast a function to multiple chat IDs with automatic rate limiting.
     * Processes in batches to respect Telegram's rate limits.
     */
    async broadcast(
        chatIds: (number | string)[],
        fn: (chatId: number | string) => Promise<void>,
        options?: Partial<QueueOptions>
    ): Promise<BroadcastResult> {
        const concurrency = options?.concurrency ?? this.options.concurrency;
        const delayMs = options?.delayMs ?? this.options.delayMs;
        const onError = options?.onError ?? this.options.onError;
        const onProgress = options?.onProgress ?? this.options.onProgress;

        const startTime = Date.now();
        let success = 0;
        let failed = 0;
        const errors: Array<{ chatId: number | string; error: Error }> = [];

        this.isProcessing = true;

        // Process in batches
        for (let i = 0; i < chatIds.length; i += concurrency) {
            if (!this.isProcessing) break;

            const batch = chatIds.slice(i, i + concurrency);
            const results = await Promise.allSettled(
                batch.map(chatId => fn(chatId))
            );

            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.status === 'fulfilled') {
                    success++;
                } else {
                    failed++;
                    const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason));
                    errors.push({ chatId: batch[j], error });
                    if (onError) onError(error, batch[j]);
                }
            }

            if (onProgress) onProgress(success + failed, chatIds.length);

            // Rate limiting delay between batches
            if (i + concurrency < chatIds.length && this.isProcessing) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        this.isProcessing = false;

        return {
            total: chatIds.length,
            success,
            failed,
            errors,
            durationMs: Date.now() - startTime
        };
    }

    /**
     * Send a message to multiple chats with rate limiting.
     */
    async broadcastMessage(
        chatIds: (number | string)[],
        text: string,
        extra?: any
    ): Promise<BroadcastResult> {
        return this.broadcast(chatIds, async (chatId) => {
            await this.client.callApi('sendMessage', {
                chat_id: chatId,
                text,
                ...extra
            });
        });
    }

    /**
     * Schedule a recurring job.
     */
    scheduleInterval(id: string, intervalMs: number, handler: () => void | Promise<void>): ScheduledJob {
        this.cancelScheduled(id);

        const job: ScheduledJob = {
            id,
            handler,
            interval: setInterval(async () => {
                try {
                    await handler();
                } catch (err) {
                    if (this.options.onError) {
                        this.options.onError(err instanceof Error ? err : new Error(String(err)), id);
                    }
                }
            }, intervalMs),
            timeout: null
        };

        this.scheduledJobs.set(id, job);
        return job;
    }

    /**
     * Schedule a one-time delayed job.
     */
    scheduleOnce(id: string, delayMs: number, handler: () => void | Promise<void>): ScheduledJob {
        this.cancelScheduled(id);

        const job: ScheduledJob = {
            id,
            handler,
            interval: null,
            timeout: setTimeout(async () => {
                try {
                    await handler();
                } catch (err) {
                    if (this.options.onError) {
                        this.options.onError(err instanceof Error ? err : new Error(String(err)), id);
                    }
                }
                this.scheduledJobs.delete(id);
            }, delayMs)
        };

        this.scheduledJobs.set(id, job);
        return job;
    }

    /**
     * Cancel a scheduled job by ID.
     */
    cancelScheduled(id: string): boolean {
        const job = this.scheduledJobs.get(id);
        if (!job) return false;

        if (job.interval) clearInterval(job.interval);
        if (job.timeout) clearTimeout(job.timeout);
        this.scheduledJobs.delete(id);
        return true;
    }

    /**
     * Cancel all scheduled jobs.
     */
    cancelAllScheduled(): void {
        for (const [id] of this.scheduledJobs) {
            this.cancelScheduled(id);
        }
    }

    /**
     * Stop a running broadcast.
     */
    stopBroadcast(): void {
        this.isProcessing = false;
    }

    /**
     * Get count of active scheduled jobs.
     */
    get activeJobs(): number {
        return this.scheduledJobs.size;
    }
}
