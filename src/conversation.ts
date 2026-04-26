import { Context } from './context';
import { Middleware } from './composer';
import { ConversationTimeoutError } from './errors';
import type {
    Animation,
    Audio,
    Document,
    PhotoSize,
    Sticker,
    Video,
    VideoNote,
    Voice,
} from './types';

/**
 * Wait options for conversation steps.
 */
export interface WaitOptions {
    /** Timeout in ms. Rejects with ConversationTimeout if exceeded. */
    timeout?: number;
    /** Validation function. If returns false, the message is rejected and the user is re-prompted. */
    validate?: (ctx: Context) => boolean | Promise<boolean>;
    /** Message to send when validation fails */
    validationError?: string;
}

/**
 * Conversation timeout error.
 */
export class ConversationTimeout extends ConversationTimeoutError {
    constructor(public readonly chatId: number) {
        super(chatId);
        this.name = 'ConversationTimeout';
    }
}

export interface ConversationWaitForAnyText {
    type: 'text';
    text: string;
    ctx: Context;
}

export interface ConversationWaitForAnyCallback {
    type: 'callback';
    data: string;
    ctx: Context;
}

export type ConversationMediaKind =
    | 'photo'
    | 'video'
    | 'document'
    | 'audio'
    | 'voice'
    | 'video_note'
    | 'animation'
    | 'sticker';

export type ConversationWaitForAnyMedia =
    | {
          type: 'media';
          mediaType: 'photo';
          media: PhotoSize[];
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'video';
          media: Video;
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'document';
          media: Document;
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'audio';
          media: Audio;
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'voice';
          media: Voice;
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'video_note';
          media: VideoNote;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'animation';
          media: Animation;
          caption?: string;
          ctx: Context;
      }
    | {
          type: 'media';
          mediaType: 'sticker';
          media: Sticker;
          ctx: Context;
      };

export type ConversationWaitForAnyResult =
    | ConversationWaitForAnyText
    | ConversationWaitForAnyCallback
    | ConversationWaitForAnyMedia;

function getWaitForAnyResult(ctx: Context): ConversationWaitForAnyResult | undefined {
    const callbackData = ctx.update.callback_query?.data;
    if (callbackData) {
        return { type: 'callback', data: callbackData, ctx };
    }

    const message = ctx.message;
    if (!message) return undefined;

    if (message.text) {
        return { type: 'text', text: message.text, ctx };
    }

    if (message.photo?.length) {
        return {
            type: 'media',
            mediaType: 'photo',
            media: message.photo,
            caption: message.caption,
            ctx,
        };
    }

    if (message.video) {
        return {
            type: 'media',
            mediaType: 'video',
            media: message.video,
            caption: message.caption,
            ctx,
        };
    }

    if (message.document) {
        return {
            type: 'media',
            mediaType: 'document',
            media: message.document,
            caption: message.caption,
            ctx,
        };
    }

    if (message.audio) {
        return {
            type: 'media',
            mediaType: 'audio',
            media: message.audio,
            caption: message.caption,
            ctx,
        };
    }

    if (message.voice) {
        return {
            type: 'media',
            mediaType: 'voice',
            media: message.voice,
            caption: message.caption,
            ctx,
        };
    }

    if (message.video_note) {
        return { type: 'media', mediaType: 'video_note', media: message.video_note, ctx };
    }

    if (message.animation) {
        return {
            type: 'media',
            mediaType: 'animation',
            media: message.animation,
            caption: message.caption,
            ctx,
        };
    }

    if (message.sticker) {
        return { type: 'media', mediaType: 'sticker', media: message.sticker, ctx };
    }

    return undefined;
}

/**
 * Conversation context provides a wait-for-input API inside conversation handlers.
 */
export class ConversationContext {
    private _resolve: ((ctx: Context) => void) | null = null;
    private _reject: ((err: Error) => void) | null = null;

    constructor(
        public readonly ctx: Context,
        private readonly chatKey: string,
        private readonly _setWaitState: (
            waitOptions?: WaitOptions,
            waitTimer?: ReturnType<typeof setTimeout>
        ) => void = () => {}
    ) {}

    /**
     * Wait for the next text message from the user.
     * Returns the text string.
     */
    async waitForText(options?: WaitOptions): Promise<string> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!ctx.message?.text) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError: options?.validationError || 'Please send a text message.',
        });
        return ctx.message!.text!;
    }

    /**
     * Wait for a photo message. Returns the photo array.
     */
    async waitForPhoto(options?: WaitOptions): Promise<any[]> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!ctx.message?.photo?.length) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError: options?.validationError || 'Please send a photo.',
        });
        return ctx.message!.photo!;
    }

    /**
     * Wait for a callback query (inline button press). Returns the callback data.
     */
    async waitForCallbackQuery(options?: WaitOptions): Promise<string> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!ctx.update.callback_query?.data) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError: options?.validationError || 'Please press a button.',
        });
        return ctx.update.callback_query!.data!;
    }

    /**
     * Wait for the next supported input and return a discriminated union.
     * Supports text messages, callback query data, and common media messages.
     */
    async waitForAny(options?: WaitOptions): Promise<ConversationWaitForAnyResult> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!getWaitForAnyResult(ctx)) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError:
                options?.validationError || 'Please send text, press a button, or send media.',
        });

        const result = getWaitForAnyResult(ctx);
        if (!result) {
            throw new Error('Conversation waitForAny resolved without a supported input.');
        }

        return result;
    }

    /**
     * Wait for a contact share. Returns the contact object.
     */
    async waitForContact(options?: WaitOptions): Promise<any> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!ctx.message?.contact) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError: options?.validationError || 'Please share your contact.',
        });
        return ctx.message!.contact!;
    }

    /**
     * Wait for a location share. Returns the location object.
     */
    async waitForLocation(options?: WaitOptions): Promise<any> {
        const ctx = await this.wait({
            ...options,
            validate: async ctx => {
                if (!ctx.message?.location) return false;
                if (options?.validate) return options.validate(ctx);
                return true;
            },
            validationError: options?.validationError || 'Please share your location.',
        });
        return ctx.message!.location!;
    }

    /**
     * Wait for any update from the current user/chat. Raw await.
     */
    async wait(options?: WaitOptions): Promise<Context> {
        return new Promise<Context>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            let waitTimer: ReturnType<typeof setTimeout> | undefined;

            if (options?.timeout) {
                waitTimer = setTimeout(() => {
                    this._resolve = null;
                    this._reject = null;
                    this._setWaitState(undefined);
                    reject(new ConversationTimeout(this.ctx.chat?.id || 0));
                }, options.timeout);

                waitTimer.unref?.();
            }

            this._setWaitState(options, waitTimer);
        });
    }

    /** @internal Deliver an update to the waiting conversation */
    async _deliver(ctx: Context, options?: WaitOptions): Promise<boolean> {
        if (!this._resolve) return false;

        // Validate the incoming update
        if (options?.validate) {
            const valid = await options.validate(ctx);
            if (!valid) {
                if (options.validationError) {
                    await ctx.reply(options.validationError);
                }
                return true; // consumed but not resolved (stays waiting)
            }
        }

        const resolve = this._resolve;
        this._resolve = null;
        this._reject = null;
        this._setWaitState(undefined);
        resolve(ctx);
        return true;
    }

    /** @internal Cancel the conversation */
    _cancel(): void {
        if (this._reject) {
            this._reject(new Error('Conversation cancelled'));
            this._resolve = null;
            this._reject = null;
        }

        this._setWaitState(undefined);
    }
}

export type ConversationHandler = (ctx: Context, conv: ConversationContext) => Promise<void>;

/**
 * Conversation manager for fluent, non-linear multi-step dialogues.
 *
 * Usage:
 * ```typescript
 * const conv = new Conversation();
 *
 * conv.define('order', async (ctx, conv) => {
 *     await ctx.reply('What product do you want?');
 *     const product = await conv.waitForText();
 *
 *     await ctx.reply('How many?');
 *     const qty = await conv.waitForText({
 *         validate: (ctx) => !isNaN(parseInt(ctx.message?.text || '')),
 *         validationError: 'Please enter a valid number.'
 *     });
 *
 *     await ctx.reply(`Order: ${qty}x ${product}`);
 * });
 *
 * bot.use(conv.middleware());
 * bot.command('order', ctx => conv.enter('order', ctx));
 * ```
 */
export interface ConversationOptions {
    /**
     * Default inactivity timeout for all wait() calls in milliseconds.
     * If a user doesn't respond within this window, the conversation is cancelled automatically.
     * Default: 5 minutes (300_000ms).
     */
    defaultTimeout?: number;
}

export class Conversation {
    private definitions = new Map<string, ConversationHandler>();
    private active = new Map<
        string,
        {
            conv: ConversationContext;
            waitOptions?: WaitOptions;
            waitTimer?: ReturnType<typeof setTimeout>;
            cleanupTimer?: ReturnType<typeof setTimeout>;
        }
    >();
    private readonly defaultTimeout: number;

    constructor(options: ConversationOptions = {}) {
        this.defaultTimeout = options.defaultTimeout ?? 5 * 60 * 1000; // 5 minutes default
    }

    private createCleanupTimer(chatKey: string): ReturnType<typeof setTimeout> {
        const cleanupTimer = setTimeout(() => {
            if (this.active.has(chatKey)) {
                this.active.get(chatKey)?.conv._cancel();
                this.active.delete(chatKey);
            }
        }, this.defaultTimeout);

        cleanupTimer.unref?.();
        return cleanupTimer;
    }

    private refreshCleanupTimer(chatKey: string): void {
        const entry = this.active.get(chatKey);
        if (!entry) return;

        if (entry.cleanupTimer) {
            clearTimeout(entry.cleanupTimer);
        }

        entry.cleanupTimer = this.createCleanupTimer(chatKey);
    }

    /**
     * Define a named conversation flow.
     */
    define(name: string, handler: ConversationHandler): this {
        this.definitions.set(name, handler);
        return this;
    }

    /**
     * Enter a conversation by name. The handler runs asynchronously.
     * Automatically schedules cleanup after defaultTimeout to prevent memory leaks.
     */
    async enter(name: string, ctx: Context): Promise<void> {
        const handler = this.definitions.get(name);
        if (!handler) throw new Error(`Conversation "${name}" is not defined`);

        const chatKey = this.getChatKey(ctx);

        // Cancel any existing conversation for this chat first.
        this.leave(chatKey);

        const conv = new ConversationContext(ctx, chatKey, (waitOptions, waitTimer) => {
            const entry = this.active.get(chatKey);
            if (!entry) return;

            if (entry.waitTimer && entry.waitTimer !== waitTimer) {
                clearTimeout(entry.waitTimer);
            }

            entry.waitOptions = waitOptions;
            entry.waitTimer = waitTimer;
        });

        this.active.set(chatKey, { conv });
        // Auto-cleanup: cancel and remove the conversation if it idles beyond the timeout.
        this.refreshCleanupTimer(chatKey);

        // Run the handler asynchronously — it will suspend at each conv.waitFor*() call.
        handler(ctx, conv)
            .catch(error => {
                if (error instanceof ConversationTimeoutError) {
                    return;
                }

                if (error instanceof Error && error.message === 'Conversation cancelled') {
                    return;
                }

                console.error('[VibeGram] Conversation error:', error);
            })
            .finally(() => {
                const entry = this.active.get(chatKey);
                if (entry?.waitTimer) {
                    clearTimeout(entry.waitTimer);
                }
                if (entry?.cleanupTimer) {
                    clearTimeout(entry.cleanupTimer);
                }
                this.active.delete(chatKey);
            });
    }

    /**
     * Leave/cancel the active conversation for a chat.
     */
    leave(chatKeyOrCtx: string | Context): void {
        const key = typeof chatKeyOrCtx === 'string' ? chatKeyOrCtx : this.getChatKey(chatKeyOrCtx);

        const entry = this.active.get(key);
        if (entry) {
            clearTimeout(entry.cleanupTimer); // Clear auto-cleanup timer.
            if (entry.waitTimer) {
                clearTimeout(entry.waitTimer);
            }
            entry.conv._cancel();
            this.active.delete(key);
        }
    }

    /**
     * Cancel every active conversation and clear their timers.
     * Useful from graceful shutdown handlers before closing external resources.
     */
    cancelAll(): void {
        for (const key of Array.from(this.active.keys())) {
            this.leave(key);
        }
    }

    /**
     * Check if a chat has an active conversation.
     */
    isActive(ctx: Context): boolean {
        return this.active.has(this.getChatKey(ctx));
    }

    /**
     * Middleware that intercepts updates for active conversations.
     */
    middleware(): Middleware<any> {
        return async (ctx, next) => {
            const chatKey = this.getChatKey(ctx);
            const entry = this.active.get(chatKey);

            if (entry) {
                // User activity should extend the inactivity timeout window.
                this.refreshCleanupTimer(chatKey);
                // Deliver the update to the waiting conversation
                const consumed = await entry.conv._deliver(ctx, entry.waitOptions);
                if (consumed) return; // Don't pass to other handlers
            }

            return next();
        };
    }

    private getChatKey(ctx: Context): string {
        const chatId = ctx.chat?.id || ctx.update.callback_query?.message?.chat?.id || 0;
        const fromId = ctx.from?.id || ctx.update.callback_query?.from?.id || 0;
        return `${chatId}:${fromId}`;
    }

    /** Get count of active conversations */
    get activeCount(): number {
        return this.active.size;
    }
}
