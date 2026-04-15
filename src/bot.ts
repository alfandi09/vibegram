import { TelegramClient } from './client';
import { Composer, Middleware } from './composer';
import { Context } from './context';
import { Update, User } from './types';
import { WebAppUtils } from './webapp';
import { BotPlugin } from './plugin';
import { InvalidTokenError } from './errors';

export type UpdateType =
    | 'message'
    | 'edited_message'
    | 'channel_post'
    | 'edited_channel_post'
    | 'inline_query'
    | 'chosen_inline_result'
    | 'callback_query'
    | 'shipping_query'
    | 'pre_checkout_query'
    | 'poll'
    | 'poll_answer'
    | 'my_chat_member'
    | 'chat_member'
    | 'chat_join_request'
    | 'chat_boost'
    | 'removed_chat_boost'
    | 'message_reaction'
    | 'message_reaction_count'
    | 'business_connection'
    | 'business_message'
    | 'edited_business_message'
    | 'deleted_business_messages'
    | 'purchased_paid_media';

export interface BotOptions {
    polling?: {
        interval?: number;
        limit?: number;
        timeout?: number;
        /** Specify the types of updates you want to receive. If not set, all types are received. */
        allowed_updates?: UpdateType[];
    };
}

export class Bot<C extends Context = Context> extends Composer<C> {
    public client: TelegramClient;
    private isPolling: boolean = false;
    private pollingOffset: number = 0;
    private _composedMiddleware: Middleware<any> | null = null;
    private _activeUpdates: number = 0;
    private _pollingTask: Promise<void> | null = null;
    private _updatesDrainedResolve?: () => void;

    constructor(
        token: string,
        public options?: BotOptions
    ) {
        super();
        if (!token) throw new Error('Telegram Bot token is required.');
        this.client = new TelegramClient(token);
    }

    override use(...fns: Middleware<C>[]): this {
        super.use(...fns);
        this._composedMiddleware = null;
        return this;
    }

    override command(command: string | string[], ...fns: Middleware<C>[]): this {
        super.command(command, ...fns);
        this._composedMiddleware = null;
        return this;
    }

    override on(updateType: string | string[], ...fns: Middleware<C>[]): this {
        super.on(updateType, ...fns);
        this._composedMiddleware = null;
        return this;
    }

    override hears(trigger: string | RegExp | (string | RegExp)[], ...fns: Middleware<C>[]): this {
        super.hears(trigger, ...fns);
        this._composedMiddleware = null;
        return this;
    }

    override action(trigger: string | RegExp | (string | RegExp)[], ...fns: Middleware<C>[]): this {
        super.action(trigger, ...fns);
        this._composedMiddleware = null;
        return this;
    }

    /**
     * Launch the bot in long-polling mode.
     * Validates the bot token via getMe() before starting the polling loop.
     * Automatically registers SIGINT/SIGTERM handlers for graceful shutdown.
     */
    async launch(options?: { onStart?: (botInfo: User) => void }): Promise<void> {
        if (this.isPolling) {
            console.warn('[VibeGram] Polling is already running.');
            return;
        }

        // Validate the token and log bot identity before starting.
        let me: User;
        try {
            me = (await this.client.callApi('getMe')) as User;
        } catch {
            throw new InvalidTokenError();
        }

        console.log(`[VibeGram] @${me.username} (${me.id}) started. Polling for updates...`);
        options?.onStart?.(me);

        // Auto-register process signal handlers for clean shutdown.
        this._registerSignals();

        this.isPolling = true;
        this._pollingTask = this.pollingLoop().finally(() => {
            this._pollingTask = null;
        });
    }

    /**
     * Gracefully stop the bot.
     * Waits for any in-flight updates to finish before resolving.
     */
    async stop(reason?: string): Promise<void> {
        if (!this.isPolling) return;

        if (reason) console.log(`[VibeGram] Shutdown initiated: ${reason}`);
        this.isPolling = false;

        if (this._pollingTask) {
            await this._pollingTask;
        }

        // Wait for all active update handlers to resolve.
        if (this._activeUpdates > 0) {
            await new Promise<void>(resolve => {
                this._updatesDrainedResolve = resolve;
            });
        }

        console.log('[VibeGram] Bot stopped gracefully.');
    }

    /**
     * Install a plugin onto this bot instance.
     */
    plugin(plugin: BotPlugin<C>): this {
        plugin.install(this);
        this._composedMiddleware = null; // Invalidate cached middleware chain.
        return this;
    }

    private async pollingLoop(): Promise<void> {
        const interval = this.options?.polling?.interval ?? 300;
        const limit = this.options?.polling?.limit ?? 100;
        const timeout = this.options?.polling?.timeout ?? 30;
        const allowedUpdates = this.options?.polling?.allowed_updates;

        while (this.isPolling) {
            try {
                const params: any = { offset: this.pollingOffset, limit, timeout };
                if (allowedUpdates) params.allowed_updates = allowedUpdates;

                const updates: any[] = await this.client.callApi('getUpdates', params);

                if (!this.isPolling) {
                    break;
                }

                if (updates && updates.length > 0) {
                    for (const update of updates) {
                        if (!this.isPolling) {
                            break;
                        }
                        this.pollingOffset = Math.max(this.pollingOffset, update.update_id + 1);
                        await this.handleUpdate(update);
                    }
                }
            } catch (error) {
                console.error('[VibeGram] Polling error:', error);
                if (!this.isPolling) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            if (interval > 0 && this.isPolling) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
    }

    private errorHandler?: (err: any, ctx: C) => void | Promise<void>;

    /**
     * Register a global error handler for unhandled middleware errors.
     */
    catch(handler: (err: any, ctx: C) => void | Promise<void>) {
        this.errorHandler = handler;
    }

    /**
     * Process a single Update object. Used internally by polling and webhooks.
     * Can also be called directly in custom webhook setups.
     */
    public async handleUpdate(update: Update): Promise<void> {
        const ctx = new Context(update, this.client) as C;

        // Use the cached middleware chain — avoids recomposing on every update.
        if (!this._composedMiddleware) {
            this._composedMiddleware = this.middleware();
        }

        this._activeUpdates++;
        try {
            await this._composedMiddleware(ctx, async () => {});
        } catch (err) {
            if (this.errorHandler) {
                await this.errorHandler(err, ctx);
            } else {
                throw err;
            }
        } finally {
            this._activeUpdates--;
            // If stop() is waiting, resolve it when all in-flight updates are done.
            if (!this.isPolling && this._activeUpdates === 0 && this._updatesDrainedResolve) {
                this._updatesDrainedResolve();
                this._updatesDrainedResolve = undefined;
            }
        }
    }

    /**
     * Returns a webhook handler compatible with Express.js, Koa, Fastify, and native http.
     * Validates the Telegram secret token header and the update structure before processing.
     */
    webhookCallback(secretToken?: string) {
        return async (req: any, res: any) => {
            if (req.method !== 'POST') {
                res.statusCode = 200;
                res.end();
                return;
            }

            // Validate the Telegram secret token to prevent spoofing.
            if (secretToken) {
                const headerToken = req.headers?.['x-telegram-bot-api-secret-token'];
                if (headerToken !== secretToken) {
                    res.statusCode = 403;
                    res.end('Forbidden');
                    return;
                }
            }

            const update = req.body;

            // Basic structural validation — must be an object with a numeric update_id.
            if (!update || typeof update !== 'object' || typeof update.update_id !== 'number') {
                res.statusCode = 400;
                res.end('Bad Request: Invalid update object.');
                return;
            }

            try {
                await this.handleUpdate(update as Update);
                res.statusCode = 200;
                res.end('OK');
            } catch (e) {
                console.error('[VibeGram] Webhook processing error:', e);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        };
    }

    /**
     * Delete the current webhook. Optionally drops all pending updates.
     */
    async deleteWebhook(dropPendingUpdates = false): Promise<boolean> {
        return this.client.callApi('deleteWebhook', { drop_pending_updates: dropPendingUpdates });
    }

    /**
     * Get the current webhook configuration.
     */
    async getWebhookInfo(): Promise<any> {
        return this.client.callApi('getWebhookInfo');
    }

    /**
     * Register a Webhook URL with Telegram.
     */
    async setWebhook(url: string, extra?: any): Promise<boolean> {
        return this.client.callApi('setWebhook', { url, ...extra });
    }

    /**
     * Get managed bot token (Bot API 9.6).
     */
    async getManagedBotToken(userId: number): Promise<string> {
        return this.client.callApi('getManagedBotToken', { user_id: userId });
    }

    /**
     * Replace managed bot token (Bot API 9.6).
     */
    async replaceManagedBotToken(userId: number): Promise<string> {
        return this.client.callApi('replaceManagedBotToken', { user_id: userId });
    }

    /**
     * Save a prepared keyboard button (Bot API 9.6).
     */
    async savePreparedKeyboardButton(button: any, userId: number): Promise<any> {
        return this.client.callApi('savePreparedKeyboardButton', { button, user_id: userId });
    }

    /**
     * Direct access to any Telegram Bot API method via the underlying client.
     */
    async callApi(method: string, data?: any): Promise<any> {
        return this.client.callApi(method, data);
    }

    /**
     * Validates the authenticity of Telegram Web App initData.
     */
    validateWebAppData(initData: string, options?: { maxAgeSeconds?: number }): any {
        return WebAppUtils.validate(this.client.token, initData, options);
    }

    /**
     * Get basic information about the bot (id, name, username, etc.)
     */
    async getMe(): Promise<User> {
        return this.client.callApi('getMe');
    }

    /**
     * Set the list of bot commands shown in the Telegram menu.
     */
    async setMyCommands(
        commands: { command: string; description: string }[],
        extra?: any
    ): Promise<boolean> {
        return this.client.callApi('setMyCommands', { commands, ...extra });
    }

    /**
     * Get the current list of bot commands.
     */
    async getMyCommands(extra?: any): Promise<any> {
        return this.client.callApi('getMyCommands', extra);
    }

    /**
     * Delete the list of bot commands for a given scope/language.
     */
    async deleteMyCommands(extra?: any): Promise<boolean> {
        return this.client.callApi('deleteMyCommands', extra);
    }

    /** @internal Register SIGINT/SIGTERM handlers for graceful shutdown. */
    private _registerSignals(): void {
        const handler = (signal: string) => {
            this.stop(signal)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        };
        process.once('SIGINT', () => handler('SIGINT'));
        process.once('SIGTERM', () => handler('SIGTERM'));
    }
}
