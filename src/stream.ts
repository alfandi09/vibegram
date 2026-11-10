import type { Middleware } from './composer';
import type { Context } from './context';
import type { ExtraReplyMessage, Message } from './types';

/**
 * Stream generated text (for example LLM tokens) into a Telegram chat.
 *
 * In private chats the text appears live through message drafts
 * (`sendMessageDraft`) with an optional stop button; the final text is then
 * sent as a regular message. In other chats only the final message is sent.
 *
 * ```typescript
 * const streams = new ReplyStreamer();
 * bot.use(streams.middleware()); // handles the draft stop button
 *
 * bot.on(':text', ctx => {
 *     // Not awaited, so long polling can deliver the stop-button update meanwhile.
 *     void streams.reply(ctx, generateAnswer(ctx.message.text));
 * });
 * ```
 */

/** Maximum Telegram text length per message. */
export const TELEGRAM_MESSAGE_LIMIT = 4096;

export interface StreamReplyOptions {
    /** Minimum delay between draft updates in ms. Default: 400. */
    throttleMs?: number;
    /** Show a stop button under the draft (Bot API 10.3). Default: true. */
    canStop?: boolean;
    /** What to do with the partial text when the user presses stop. Default: 'send'. */
    onStop?: 'send' | 'discard';
    /** Parse mode for the final message(s). Drafts are always plain text. */
    parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
    /** Extra parameters for the final message(s), e.g. reply_markup on the last one. */
    extra?: ExtraReplyMessage;
    /** Abort the stream from outside (e.g. a timeout). Treated like a stop. */
    signal?: AbortSignal;
    /** Fixed draft id; a random one is used by default. */
    draftId?: number;
}

export interface StreamReplyResult {
    /** The full text received (or the partial text when stopped). */
    text: string;
    /** True when the user pressed stop or the signal aborted the stream. */
    stopped: boolean;
    /** Final messages sent (several when the text exceeds 4096 characters). */
    messages: Message[];
}

/**
 * Split text into chunks of at most `limit` characters, preferring paragraph
 * and line breaks, then spaces, so messages do not cut words in half.
 */
export function splitMessageText(text: string, limit: number = TELEGRAM_MESSAGE_LIMIT): string[] {
    if (!Number.isInteger(limit) || limit <= 0) {
        throw new TypeError('limit must be a positive integer.');
    }

    const chunks: string[] = [];
    let rest = text;
    while (rest.length > limit) {
        const window = rest.slice(0, limit);
        let cut = window.lastIndexOf('\n\n');
        if (cut < limit / 2) cut = window.lastIndexOf('\n');
        if (cut < limit / 2) cut = window.lastIndexOf(' ');
        if (cut <= 0) cut = limit;
        chunks.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).replace(/^\s+/, '');
    }
    if (rest.length > 0 || chunks.length === 0) chunks.push(rest);
    return chunks;
}

function randomDraftId(): number {
    return 1 + Math.floor(Math.random() * 0x7ffffffe);
}

function streamKey(chatId: number, draftId: number): string {
    return `${chatId}:${draftId}`;
}

export class ReplyStreamer {
    private readonly active = new Map<string, AbortController>();

    /** Number of streams currently running. */
    get activeCount(): number {
        return this.active.size;
    }

    /**
     * Handles `stopped_message_generation` updates for streams started by this
     * streamer. Updates for unknown drafts continue down the chain.
     */
    middleware(): Middleware<Context> {
        return (ctx, next) => {
            const stopped = ctx.update.stopped_message_generation;
            if (!stopped) return next();

            const controller = this.active.get(streamKey(stopped.chat.id, stopped.draft_id));
            if (!controller) return next();
            controller.abort();
        };
    }

    /** Stop a running stream by chat and draft id. Returns false when none was running. */
    stop(chatId: number, draftId: number): boolean {
        const controller = this.active.get(streamKey(chatId, draftId));
        controller?.abort();
        return controller !== undefined;
    }

    /**
     * Stream `source` (text deltas) into the chat of `ctx`. Resolves after the
     * final message(s) are sent. The source iterator is closed on stop, which
     * lets SDKs cancel the underlying generation.
     */
    async reply(
        ctx: Context,
        source: AsyncIterable<string>,
        options: StreamReplyOptions = {}
    ): Promise<StreamReplyResult> {
        const chat = ctx.chat;
        if (!chat) throw new Error('Cannot stream a reply: Chat ID is not available');

        const throttleMs = options.throttleMs ?? 400;
        if (!Number.isFinite(throttleMs) || throttleMs < 0) {
            throw new TypeError('throttleMs must be a non-negative number.');
        }

        // Drafts are only supported in private chats.
        const useDrafts = chat.type === 'private';
        const draftId = options.draftId ?? randomDraftId();
        const key = streamKey(chat.id, draftId);
        const controller = new AbortController();
        const onExternalAbort = () => controller.abort();
        options.signal?.addEventListener('abort', onExternalAbort, { once: true });
        if (options.signal?.aborted) controller.abort();
        this.active.set(key, controller);

        let text = '';
        let lastDraftText = '';
        let lastDraftAt = 0;
        let draftsFailed = false;

        const pushDraft = async () => {
            if (!useDrafts || draftsFailed || text === lastDraftText || text.trim() === '') return;
            const now = Date.now();
            if (now - lastDraftAt < throttleMs) return;
            lastDraftAt = now;
            lastDraftText = text;
            try {
                await ctx.client.callApi('sendMessageDraft', {
                    chat_id: chat.id,
                    draft_id: draftId,
                    // Drafts are capped like messages; show the latest window.
                    text:
                        text.length > TELEGRAM_MESSAGE_LIMIT
                            ? text.slice(-TELEGRAM_MESSAGE_LIMIT)
                            : text,
                    message_thread_id: ctx.message?.message_thread_id,
                    ...(options.canStop !== false ? { can_stop: true } : {}),
                });
            } catch {
                // Previews are best-effort; the final message is still sent.
                draftsFailed = true;
            }
        };

        try {
            const iterator = source[Symbol.asyncIterator]();
            const aborted = new Promise<'aborted'>(resolve => {
                if (controller.signal.aborted) resolve('aborted');
                controller.signal.addEventListener('abort', () => resolve('aborted'), {
                    once: true,
                });
            });

            while (true) {
                const next = await Promise.race([iterator.next(), aborted]);
                if (next === 'aborted') {
                    await iterator.return?.();
                    break;
                }
                if (next.done) break;
                text += next.value;
                await pushDraft();
            }

            const stopped = controller.signal.aborted;
            if (stopped && options.onStop === 'discard') {
                return { text, stopped, messages: [] };
            }
            if (text.trim() === '') {
                return { text, stopped, messages: [] };
            }

            const chunks = splitMessageText(text);
            const messages: Message[] = [];
            for (let index = 0; index < chunks.length; index++) {
                const isLast = index === chunks.length - 1;
                const { reply_markup, ...extra } = options.extra ?? {};
                messages.push(
                    (await ctx.reply(chunks[index], {
                        ...(options.parseMode ? { parse_mode: options.parseMode } : {}),
                        ...extra,
                        ...(isLast && reply_markup ? { reply_markup } : {}),
                    })) as Message
                );
            }
            return { text, stopped, messages };
        } finally {
            options.signal?.removeEventListener('abort', onExternalAbort);
            this.active.delete(key);
        }
    }
}
