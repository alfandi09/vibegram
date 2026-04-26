import { TelegramClient, TelegramClientHooks } from './client';
import { Composer, Middleware } from './composer';
import { Context } from './context';
import * as http from 'http';
import {
    BotCommand,
    BotCommandOptions,
    BotDescription,
    BotName,
    BotShortDescription,
    BusinessConnection,
    ChatAdministratorRights,
    GameHighScore,
    GetBusinessAccountGiftsOptions,
    GetChatGiftsOptions,
    GetUserGiftsOptions,
    GiftPremiumSubscriptionOptions,
    Gifts,
    InlineQueryResult,
    InputProfilePhoto,
    InputStoryContent,
    LabeledPrice,
    MenuButton,
    OwnedGifts,
    PassportElementError,
    PreparedKeyboardButton,
    PostStoryOptions,
    RepostStoryOptions,
    SendGiftOptions,
    SentWebAppMessage,
    SetWebhookOptions,
    Story,
    AcceptedGiftTypes,
    EditStoryOptions,
    TransferGiftOptions,
    UpgradeGiftOptions,
    Update,
    UserProfileAudios,
    UserProfilePhotos,
    User,
    WebhookInfo,
} from './types';
import { WebAppUtils } from './webapp';
import { BotPlugin } from './plugin';
import { InvalidTokenError, UpdateTimeoutError } from './errors';
import { createNativeHandler, matchesSecretToken } from './adapters';

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
    | 'purchased_paid_media'
    | 'managed_bot';

export interface BotOptions<C extends Context = Context> {
    /**
     * Maximum time in milliseconds allowed for processing one update.
     * Set to 0 or leave undefined to disable middleware timeout protection.
     */
    updateTimeout?: number;
    polling?: {
        interval?: number;
        limit?: number;
        timeout?: number;
        /** Specify the types of updates you want to receive. If not set, all types are received. */
        allowed_updates?: UpdateType[];
    };
    observability?: {
        client?: TelegramClientHooks;
        hooks?: BotHooks<C>;
    };
}

export interface BotWebhookLaunchOptions {
    /** Public HTTPS base URL or endpoint URL used when registering setWebhook. */
    url: string;
    /** Local port for the native HTTP webhook server. Use 0 to let Node choose a free port. */
    port: number;
    /** Local host/interface to bind. Defaults to Node's listen() default. */
    host?: string;
    /** Local webhook route. Defaults to '/webhook'. */
    path?: string;
    /** Telegram secret token sent as X-Telegram-Bot-Api-Secret-Token. */
    secretToken?: string;
    /** Optional GET route for health checks. */
    healthPath?: string;
    /** Maximum raw JSON body size accepted by the native adapter. Defaults to 1 MB. */
    maxBodySizeBytes?: number;
    /** Extra options forwarded to Telegram setWebhook(). */
    webhookOptions?: Omit<SetWebhookOptions, 'secret_token'>;
    /** Delete Telegram webhook during stop(). Defaults to false to avoid disrupting rolling deploys. */
    deleteWebhookOnStop?: boolean;
    /** Drop pending Telegram updates when deleteWebhookOnStop is enabled. Defaults to false. */
    dropPendingUpdatesOnStop?: boolean;
}

export interface BotLaunchOptions {
    onStart?: (botInfo: User) => void;
    webhook?: BotWebhookLaunchOptions;
}

export interface BotLaunchEvent {
    botInfo: User;
}

export interface BotStopEvent {
    reason?: string;
}

export interface BotUpdateEvent<C extends Context = Context> {
    ctx: C;
    update: Update;
    updateType: string;
    durationMs?: number;
}

export interface BotUpdateErrorEvent<C extends Context = Context> extends BotUpdateEvent<C> {
    error: unknown;
}

export interface BotPollingErrorEvent {
    error: unknown;
}

export interface BotWebhookErrorEvent {
    error: unknown;
    update?: unknown;
}

export interface BotHooks<C extends Context = Context> {
    onLaunch?: (event: BotLaunchEvent) => void | Promise<void>;
    onStop?: (event: BotStopEvent) => void | Promise<void>;
    onUpdateStart?: (event: BotUpdateEvent<C>) => void | Promise<void>;
    onUpdateSuccess?: (event: BotUpdateEvent<C>) => void | Promise<void>;
    onUpdateError?: (event: BotUpdateErrorEvent<C>) => void | Promise<void>;
    onPollingError?: (event: BotPollingErrorEvent) => void | Promise<void>;
    onWebhookError?: (event: BotWebhookErrorEvent) => void | Promise<void>;
}

export interface WebhookRequest {
    method?: string;
    headers?: Record<string, unknown>;
    body?: unknown;
}

export interface WebhookResponse {
    statusCode: number;
    end: (body?: string) => void;
}

function isUpdate(value: unknown): value is Update {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Update).update_id === 'number'
    );
}

function assertPathOption(name: string, value: string): void {
    if (typeof value !== 'string' || !value.startsWith('/')) {
        throw new TypeError(`${name} must be a string that starts with "/".`);
    }
}

function assertWebhookLaunchOptions(options: BotWebhookLaunchOptions): void {
    if (typeof options.url !== 'string' || options.url.trim() === '') {
        throw new TypeError('webhook.url must be a non-empty string.');
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(options.url);
    } catch {
        throw new TypeError('webhook.url must be a valid HTTPS URL.');
    }

    if (parsedUrl.protocol !== 'https:') {
        throw new TypeError('webhook.url must use HTTPS.');
    }

    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
        throw new TypeError('webhook.port must be an integer between 0 and 65535.');
    }

    if (options.host !== undefined && (typeof options.host !== 'string' || options.host === '')) {
        throw new TypeError('webhook.host must be a non-empty string.');
    }

    if (options.path !== undefined) {
        assertPathOption('webhook.path', options.path);
    }

    if (options.healthPath !== undefined) {
        assertPathOption('webhook.healthPath', options.healthPath);
    }
}

function buildWebhookUrl(publicUrl: string, path: string): string {
    const url = new URL(publicUrl);
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString();
}

function getRequestPath(url?: string): string | undefined {
    if (!url) return undefined;

    try {
        return new URL(url, 'http://localhost').pathname;
    } catch {
        return undefined;
    }
}

/**
 * Main bot class for polling, webhooks, middleware routing, and direct Bot API calls.
 *
 * @example
 * ```typescript
 * const bot = new Bot(process.env.BOT_TOKEN!, { updateTimeout: 5000 });
 *
 * bot.start(ctx => ctx.reply('Welcome!'));
 * bot.on('photo', ctx => ctx.reply('Nice photo.'));
 *
 * await bot.launch();
 * ```
 */
export class Bot<C extends Context = Context> extends Composer<C> {
    private static readonly NOOP_NEXT = async () => {};
    public client: TelegramClient;
    private isPolling: boolean = false;
    private pollingOffset: number = 0;
    private _composedMiddleware: Middleware<any> | null = null;
    private _activeUpdates: number = 0;
    private _pollingTask: Promise<void> | null = null;
    private _webhookServer: http.Server | null = null;
    private _isWebhookRunning: boolean = false;
    private _deleteWebhookOnStop: boolean = false;
    private _dropPendingUpdatesOnStop: boolean = false;
    private _updatesDrainedResolve?: () => void;

    constructor(
        token: string,
        public options?: BotOptions<C>
    ) {
        super();
        if (!token) throw new Error('Telegram Bot token is required.');
        if (
            this.options?.updateTimeout !== undefined &&
            (!Number.isFinite(this.options.updateTimeout) || this.options.updateTimeout < 0)
        ) {
            throw new TypeError('updateTimeout must be a non-negative number.');
        }
        this.client = new TelegramClient(token, { hooks: this.options?.observability?.client });
    }

    private async invokeHook(name: string, hook?: () => void | Promise<void>): Promise<void> {
        if (!hook) return;

        try {
            await hook();
        } catch (error) {
            console.error(`[VibeGram] ${name} hook error:`, error);
        }
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

    private get isRunning(): boolean {
        return this.isPolling || this._isWebhookRunning;
    }

    private async getBotInfoOrThrow(): Promise<User> {
        let me: User;
        try {
            me = (await this.client.callApi('getMe')) as User;
        } catch {
            throw new InvalidTokenError();
        }

        return me;
    }

    private async emitLaunch(botInfo: User, onStart?: (botInfo: User) => void): Promise<void> {
        onStart?.(botInfo);
        await this.invokeHook('onLaunch', () =>
            this.options?.observability?.hooks?.onLaunch?.({ botInfo })
        );
    }

    /**
     * Launch the bot in long-polling mode by default, or native webhook mode
     * when options.webhook is provided. Validates the bot token via getMe()
     * before starting and registers SIGINT/SIGTERM handlers for graceful shutdown.
     */
    async launch(options?: BotLaunchOptions): Promise<void> {
        if (options?.webhook) {
            await this.launchWebhook(options.webhook, options.onStart);
            return;
        }

        if (this.isRunning) {
            console.warn('[VibeGram] Bot is already running.');
            return;
        }

        const me = await this.getBotInfoOrThrow();

        console.log(`[VibeGram] @${me.username} (${me.id}) started. Polling for updates...`);
        await this.emitLaunch(me, options?.onStart);
        this._registerSignals();

        this.isPolling = true;
        this._pollingTask = this.pollingLoop().finally(() => {
            this._pollingTask = null;
        });
    }

    private async launchWebhook(
        options: BotWebhookLaunchOptions,
        onStart?: (botInfo: User) => void
    ): Promise<void> {
        if (this.isRunning) {
            console.warn('[VibeGram] Bot is already running.');
            return;
        }

        assertWebhookLaunchOptions(options);

        const me = await this.getBotInfoOrThrow();
        const path = options.path ?? '/webhook';
        const webhookUrl = buildWebhookUrl(options.url, path);
        const nativeHandler = createNativeHandler(this, {
            secretToken: options.secretToken,
            healthPath: options.healthPath,
            maxBodySizeBytes: options.maxBodySizeBytes,
        });

        const server = http.createServer((req, res) => {
            const requestPath = getRequestPath(req.url);
            const isWebhookPath = requestPath === path;
            const isHealthPath =
                options.healthPath !== undefined && requestPath === options.healthPath;

            if (!isWebhookPath && !isHealthPath) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }

            void nativeHandler(req, res);
        });

        try {
            await this.listenWebhookServer(server, options.port, options.host);
            await this.setWebhook(webhookUrl, {
                ...options.webhookOptions,
                secret_token: options.secretToken,
            });
        } catch (error) {
            await this.closeWebhookServer(server);
            throw error;
        }

        this._webhookServer = server;
        this._isWebhookRunning = true;
        this._deleteWebhookOnStop = options.deleteWebhookOnStop ?? false;
        this._dropPendingUpdatesOnStop = options.dropPendingUpdatesOnStop ?? false;

        console.log(`[VibeGram] @${me.username} (${me.id}) started. Webhook listening on ${path}.`);
        await this.emitLaunch(me, onStart);
        this._registerSignals();
    }

    private async listenWebhookServer(
        server: http.Server,
        port: number,
        host?: string
    ): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const onError = (error: Error) => {
                server.off('listening', onListening);
                reject(error);
            };
            const onListening = () => {
                server.off('error', onError);
                resolve();
            };

            server.once('error', onError);
            server.once('listening', onListening);

            if (host) {
                server.listen(port, host);
            } else {
                server.listen(port);
            }
        });
    }

    private async closeWebhookServer(server: http.Server): Promise<void> {
        if (!server.listening) return;

        await new Promise<void>((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Gracefully stop the bot.
     * Waits for any in-flight updates to finish before resolving.
     */
    async stop(reason?: string): Promise<void> {
        if (!this.isRunning) return;

        if (reason) console.log(`[VibeGram] Shutdown initiated: ${reason}`);
        const webhookServer = this._webhookServer;
        const shouldDeleteWebhook = this._deleteWebhookOnStop;
        const shouldDropPendingUpdates = this._dropPendingUpdatesOnStop;

        this.isPolling = false;
        this._isWebhookRunning = false;

        if (this._pollingTask) {
            await this._pollingTask;
        }

        if (webhookServer) {
            await this.closeWebhookServer(webhookServer);
            this._webhookServer = null;
        }

        // Wait for all active update handlers to resolve.
        if (this._activeUpdates > 0) {
            await new Promise<void>(resolve => {
                this._updatesDrainedResolve = resolve;
            });
        }

        if (shouldDeleteWebhook) {
            await this.deleteWebhook(shouldDropPendingUpdates);
        }

        this._deleteWebhookOnStop = false;
        this._dropPendingUpdatesOnStop = false;

        console.log('[VibeGram] Bot stopped gracefully.');
        await this.invokeHook('onStop', () =>
            this.options?.observability?.hooks?.onStop?.({ reason })
        );
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
                await this.invokeHook('onPollingError', () =>
                    this.options?.observability?.hooks?.onPollingError?.({ error })
                );
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

    private async runUpdateMiddleware(ctx: C, update: Update): Promise<void> {
        if (!this._composedMiddleware) {
            this._composedMiddleware = this.middleware();
        }

        const middlewarePromise = Promise.resolve(this._composedMiddleware(ctx, Bot.NOOP_NEXT));
        const timeoutMs = this.options?.updateTimeout;

        if (!timeoutMs || timeoutMs <= 0) {
            return middlewarePromise;
        }

        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new UpdateTimeoutError(update.update_id, timeoutMs));
            }, timeoutMs);
            timeoutHandle.unref?.();
        });

        try {
            await Promise.race([middlewarePromise, timeoutPromise]);
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        }
    }

    /**
     * Process a single Update object. Used internally by polling and webhooks.
     * Can also be called directly in custom webhook setups.
     */
    public async handleUpdate(update: Update): Promise<void> {
        const ctx = new Context(update, this.client) as C;
        const updateType = ctx.updateType;
        const start = Date.now();

        this._activeUpdates++;
        try {
            await this.invokeHook('onUpdateStart', () =>
                this.options?.observability?.hooks?.onUpdateStart?.({ ctx, update, updateType })
            );
            await this.runUpdateMiddleware(ctx, update);
            await this.invokeHook('onUpdateSuccess', () =>
                this.options?.observability?.hooks?.onUpdateSuccess?.({
                    ctx,
                    update,
                    updateType,
                    durationMs: Date.now() - start,
                })
            );
        } catch (err) {
            await this.invokeHook('onUpdateError', () =>
                this.options?.observability?.hooks?.onUpdateError?.({
                    ctx,
                    update,
                    updateType,
                    durationMs: Date.now() - start,
                    error: err,
                })
            );
            if (this.errorHandler) {
                await this.errorHandler(err, ctx);
            } else {
                throw err;
            }
        } finally {
            this._activeUpdates--;
            // If stop() is waiting, resolve it when all in-flight updates are done.
            if (!this.isRunning && this._activeUpdates === 0 && this._updatesDrainedResolve) {
                this._updatesDrainedResolve();
                this._updatesDrainedResolve = undefined;
            }
        }
    }

    /**
     * Returns a webhook handler compatible with Express.js, Koa, Fastify, and native http.
     * Validates the Telegram secret token header and the update structure before processing.
     */
    webhookCallback(
        secretToken?: string
    ): (req: WebhookRequest, res: WebhookResponse) => Promise<void> {
        return async (req, res) => {
            if (req.method !== 'POST') {
                res.statusCode = 200;
                res.end();
                return;
            }

            // Validate the Telegram secret token to prevent spoofing.
            if (secretToken) {
                const headerToken = req.headers?.['x-telegram-bot-api-secret-token'];
                if (!matchesSecretToken(headerToken, secretToken)) {
                    res.statusCode = 403;
                    res.end('Forbidden');
                    return;
                }
            }

            const update = req.body;

            // Basic structural validation — must be an object with a numeric update_id.
            if (!isUpdate(update)) {
                res.statusCode = 400;
                res.end('Bad Request: Invalid update object.');
                return;
            }

            try {
                await this.handleUpdate(update);
                res.statusCode = 200;
                res.end('OK');
            } catch (e) {
                await this.invokeHook('onWebhookError', () =>
                    this.options?.observability?.hooks?.onWebhookError?.({ error: e, update })
                );
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
    async getWebhookInfo(): Promise<WebhookInfo> {
        return this.client.callApi('getWebhookInfo');
    }

    /**
     * Register a Webhook URL with Telegram.
     */
    async setWebhook(url: string, extra?: SetWebhookOptions): Promise<boolean> {
        return this.client.callApi('setWebhook', { url, ...extra });
    }

    /**
     * Log the bot out from the cloud Bot API server before switching to a local server.
     */
    async logOut(): Promise<boolean> {
        return this.client.callApi('logOut');
    }

    /**
     * Close the bot instance before moving it between local Bot API servers.
     */
    async close(): Promise<boolean> {
        return this.client.callApi('close');
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
    async savePreparedKeyboardButton(
        button: PreparedKeyboardButton,
        userId: number
    ): Promise<PreparedKeyboardButton> {
        return this.client.callApi('savePreparedKeyboardButton', { button, user_id: userId });
    }

    /**
     * Get information about a business connection.
     */
    async getBusinessConnection(businessConnectionId: string): Promise<BusinessConnection> {
        return this.client.callApi('getBusinessConnection', {
            business_connection_id: businessConnectionId,
        });
    }

    /**
     * Mark an incoming business message as read.
     */
    async readBusinessMessage(
        businessConnectionId: string,
        chatId: number,
        messageId: number
    ): Promise<boolean> {
        return this.client.callApi('readBusinessMessage', {
            business_connection_id: businessConnectionId,
            chat_id: chatId,
            message_id: messageId,
        });
    }

    /**
     * Delete messages on behalf of a managed business account.
     */
    async deleteBusinessMessages(
        businessConnectionId: string,
        messageIds: number[]
    ): Promise<boolean> {
        return this.client.callApi('deleteBusinessMessages', {
            business_connection_id: businessConnectionId,
            message_ids: messageIds,
        });
    }

    /**
     * Change the first and last name of a managed business account.
     */
    async setBusinessAccountName(
        businessConnectionId: string,
        firstName: string,
        extra?: { last_name?: string }
    ): Promise<boolean> {
        return this.client.callApi('setBusinessAccountName', {
            business_connection_id: businessConnectionId,
            first_name: firstName,
            ...extra,
        });
    }

    /**
     * Change the username of a managed business account.
     */
    async setBusinessAccountUsername(
        businessConnectionId: string,
        username?: string
    ): Promise<boolean> {
        return this.client.callApi('setBusinessAccountUsername', {
            business_connection_id: businessConnectionId,
            username,
        });
    }

    /**
     * Change the bio of a managed business account.
     */
    async setBusinessAccountBio(businessConnectionId: string, bio?: string): Promise<boolean> {
        return this.client.callApi('setBusinessAccountBio', {
            business_connection_id: businessConnectionId,
            bio,
        });
    }

    /**
     * Change the profile photo of a managed business account.
     */
    async setBusinessAccountProfilePhoto(
        businessConnectionId: string,
        photo: InputProfilePhoto,
        extra?: { is_public?: boolean }
    ): Promise<boolean> {
        return this.client.callApi('setBusinessAccountProfilePhoto', {
            business_connection_id: businessConnectionId,
            photo,
            ...extra,
        });
    }

    /**
     * Remove the profile photo of a managed business account.
     */
    async removeBusinessAccountProfilePhoto(
        businessConnectionId: string,
        extra?: { is_public?: boolean }
    ): Promise<boolean> {
        return this.client.callApi('removeBusinessAccountProfilePhoto', {
            business_connection_id: businessConnectionId,
            ...extra,
        });
    }

    /**
     * Change incoming gift settings for a managed business account.
     */
    async setBusinessAccountGiftSettings(
        businessConnectionId: string,
        showGiftButton: boolean,
        acceptedGiftTypes: AcceptedGiftTypes
    ): Promise<boolean> {
        return this.client.callApi('setBusinessAccountGiftSettings', {
            business_connection_id: businessConnectionId,
            show_gift_button: showGiftButton,
            accepted_gift_types: acceptedGiftTypes,
        });
    }

    /**
     * Get gifts that can be sent by the bot.
     */
    async getAvailableGifts(): Promise<Gifts> {
        return this.client.callApi('getAvailableGifts');
    }

    /**
     * Send a Star gift to a user.
     */
    async sendGift(userId: number, giftId: string, extra?: SendGiftOptions): Promise<boolean> {
        return this.client.callApi('sendGift', {
            user_id: userId,
            gift_id: giftId,
            ...extra,
        });
    }

    /**
     * Send a Star gift to a channel or chat.
     */
    async sendGiftToChat(
        chatId: number | string,
        giftId: string,
        extra?: SendGiftOptions
    ): Promise<boolean> {
        return this.client.callApi('sendGift', {
            chat_id: chatId,
            gift_id: giftId,
            ...extra,
        });
    }

    /**
     * Gift Telegram Premium to a user.
     */
    async giftPremiumSubscription(
        userId: number,
        monthCount: number,
        starCount: number,
        extra?: GiftPremiumSubscriptionOptions
    ): Promise<boolean> {
        return this.client.callApi('giftPremiumSubscription', {
            user_id: userId,
            month_count: monthCount,
            star_count: starCount,
            ...extra,
        });
    }

    /**
     * Get gifts owned and hosted by a user.
     */
    async getUserGifts(userId: number, extra?: GetUserGiftsOptions): Promise<OwnedGifts> {
        return this.client.callApi('getUserGifts', {
            user_id: userId,
            ...extra,
        });
    }

    /**
     * Get gifts owned by a chat.
     */
    async getChatGifts(chatId: number | string, extra?: GetChatGiftsOptions): Promise<OwnedGifts> {
        return this.client.callApi('getChatGifts', {
            chat_id: chatId,
            ...extra,
        });
    }

    /**
     * Get gifts owned by a managed business account.
     */
    async getBusinessAccountGifts(
        businessConnectionId: string,
        extra?: GetBusinessAccountGiftsOptions
    ): Promise<OwnedGifts> {
        return this.client.callApi('getBusinessAccountGifts', {
            business_connection_id: businessConnectionId,
            ...extra,
        });
    }

    /**
     * Upgrade a regular gift owned by a business account.
     */
    async upgradeGift(
        businessConnectionId: string,
        ownedGiftId: string,
        extra?: UpgradeGiftOptions
    ): Promise<boolean> {
        return this.client.callApi('upgradeGift', {
            business_connection_id: businessConnectionId,
            owned_gift_id: ownedGiftId,
            ...extra,
        });
    }

    /**
     * Transfer a unique gift owned by a business account to another user.
     */
    async transferGift(
        businessConnectionId: string,
        ownedGiftId: string,
        newOwnerChatId: number,
        extra?: TransferGiftOptions
    ): Promise<boolean> {
        return this.client.callApi('transferGift', {
            business_connection_id: businessConnectionId,
            owned_gift_id: ownedGiftId,
            new_owner_chat_id: newOwnerChatId,
            ...extra,
        });
    }

    /**
     * Post a story on behalf of a managed business account.
     */
    async postStory(
        businessConnectionId: string,
        content: InputStoryContent,
        activePeriod: number,
        extra?: PostStoryOptions
    ): Promise<Story> {
        return this.client.callApi('postStory', {
            business_connection_id: businessConnectionId,
            content,
            active_period: activePeriod,
            ...extra,
        });
    }

    /**
     * Repost a story on behalf of a managed business account.
     */
    async repostStory(
        businessConnectionId: string,
        fromChatId: number,
        fromStoryId: number,
        activePeriod: number,
        extra?: RepostStoryOptions
    ): Promise<Story> {
        return this.client.callApi('repostStory', {
            business_connection_id: businessConnectionId,
            from_chat_id: fromChatId,
            from_story_id: fromStoryId,
            active_period: activePeriod,
            ...extra,
        });
    }

    /**
     * Edit a story posted by the bot on behalf of a managed business account.
     */
    async editStory(
        businessConnectionId: string,
        storyId: number,
        content: InputStoryContent,
        extra?: EditStoryOptions
    ): Promise<Story> {
        return this.client.callApi('editStory', {
            business_connection_id: businessConnectionId,
            story_id: storyId,
            content,
            ...extra,
        });
    }

    /**
     * Delete a story posted by the bot on behalf of a managed business account.
     */
    async deleteStory(businessConnectionId: string, storyId: number): Promise<boolean> {
        return this.client.callApi('deleteStory', {
            business_connection_id: businessConnectionId,
            story_id: storyId,
        });
    }

    /**
     * Direct access to any Telegram Bot API method via the underlying client.
     */
    async callApi<T = unknown>(method: string, data?: unknown): Promise<T> {
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
     * Set the bot display name.
     */
    async setMyName(name?: string, extra?: { language_code?: string }): Promise<boolean> {
        return this.client.callApi('setMyName', { name, ...extra });
    }

    /**
     * Get the bot display name.
     */
    async getMyName(extra?: { language_code?: string }): Promise<BotName> {
        return this.client.callApi('getMyName', extra);
    }

    /**
     * Set the bot description shown in an empty chat.
     */
    async setMyDescription(
        description?: string,
        extra?: { language_code?: string }
    ): Promise<boolean> {
        return this.client.callApi('setMyDescription', { description, ...extra });
    }

    /**
     * Get the bot description shown in an empty chat.
     */
    async getMyDescription(extra?: { language_code?: string }): Promise<BotDescription> {
        return this.client.callApi('getMyDescription', extra);
    }

    /**
     * Set the bot short description shown on the profile page.
     */
    async setMyShortDescription(
        shortDescription?: string,
        extra?: { language_code?: string }
    ): Promise<boolean> {
        return this.client.callApi('setMyShortDescription', {
            short_description: shortDescription,
            ...extra,
        });
    }

    /**
     * Get the bot short description shown on the profile page.
     */
    async getMyShortDescription(extra?: { language_code?: string }): Promise<BotShortDescription> {
        return this.client.callApi('getMyShortDescription', extra);
    }

    /**
     * Set the menu button shown in a chat.
     */
    async setChatMenuButton(extra?: {
        chat_id?: number | string;
        menu_button?: MenuButton;
    }): Promise<boolean> {
        return this.client.callApi('setChatMenuButton', extra);
    }

    /**
     * Get the menu button shown in a chat.
     */
    async getChatMenuButton(extra?: { chat_id?: number | string }): Promise<MenuButton> {
        return this.client.callApi('getChatMenuButton', extra);
    }

    /**
     * Set default administrator rights requested by the bot.
     */
    async setMyDefaultAdministratorRights(extra?: {
        rights?: ChatAdministratorRights;
        for_channels?: boolean;
    }): Promise<boolean> {
        return this.client.callApi('setMyDefaultAdministratorRights', extra);
    }

    /**
     * Get default administrator rights requested by the bot.
     */
    async getMyDefaultAdministratorRights(extra?: {
        for_channels?: boolean;
    }): Promise<ChatAdministratorRights> {
        return this.client.callApi('getMyDefaultAdministratorRights', extra);
    }

    /**
     * Get a user's profile photos.
     */
    async getUserProfilePhotos(
        userId: number,
        extra?: { offset?: number; limit?: number }
    ): Promise<UserProfilePhotos> {
        return this.client.callApi('getUserProfilePhotos', { user_id: userId, ...extra });
    }

    /**
     * Set the bot profile photo.
     */
    async setMyProfilePhoto(photo: InputProfilePhoto): Promise<boolean> {
        return this.client.callApi('setMyProfilePhoto', { photo });
    }

    /**
     * Remove the bot profile photo.
     */
    async removeMyProfilePhoto(): Promise<boolean> {
        return this.client.callApi('removeMyProfilePhoto');
    }

    /**
     * Get a user's profile audio files.
     */
    async getUserProfileAudios(
        userId: number,
        extra?: { offset?: number; limit?: number }
    ): Promise<UserProfileAudios> {
        return this.client.callApi('getUserProfileAudios', { user_id: userId, ...extra });
    }

    /**
     * Create an invoice link without sending an invoice message.
     */
    async createInvoiceLink(
        title: string,
        description: string,
        payload: string,
        currency: string,
        prices: LabeledPrice[],
        extra?: Record<string, unknown>
    ): Promise<string> {
        return this.client.callApi('createInvoiceLink', {
            title,
            description,
            payload,
            currency,
            prices,
            ...extra,
        });
    }

    /**
     * Edit a user's Telegram Star subscription.
     */
    async editUserStarSubscription(
        userId: number,
        telegramPaymentChargeId: string,
        isCanceled: boolean
    ): Promise<boolean> {
        return this.client.callApi('editUserStarSubscription', {
            user_id: userId,
            telegram_payment_charge_id: telegramPaymentChargeId,
            is_canceled: isCanceled,
        });
    }

    /**
     * Answer a Web App query with an inline result.
     */
    async answerWebAppQuery(
        webAppQueryId: string,
        result: InlineQueryResult
    ): Promise<SentWebAppMessage> {
        return this.client.callApi('answerWebAppQuery', {
            web_app_query_id: webAppQueryId,
            result,
        });
    }

    /**
     * Save a prepared inline message for a user.
     */
    async savePreparedInlineMessage(
        userId: number,
        result: InlineQueryResult,
        extra?: Record<string, unknown>
    ): Promise<{ id: string; expiration_date?: number }> {
        return this.client.callApi('savePreparedInlineMessage', {
            user_id: userId,
            result,
            ...extra,
        });
    }

    /**
     * Send Telegram Passport validation errors.
     */
    async setPassportDataErrors(userId: number, errors: PassportElementError[]): Promise<boolean> {
        return this.client.callApi('setPassportDataErrors', { user_id: userId, errors });
    }

    /**
     * Set a user's game score.
     */
    async setGameScore(
        userId: number,
        score: number,
        extra?: Record<string, unknown>
    ): Promise<boolean> {
        return this.client.callApi('setGameScore', { user_id: userId, score, ...extra });
    }

    /**
     * Get game high scores.
     */
    async getGameHighScores(
        userId: number,
        extra?: Record<string, unknown>
    ): Promise<GameHighScore[]> {
        return this.client.callApi('getGameHighScores', { user_id: userId, ...extra });
    }

    /**
     * Set the list of bot commands shown in the Telegram menu.
     */
    async setMyCommands(commands: BotCommand[], extra?: BotCommandOptions): Promise<boolean> {
        return this.client.callApi('setMyCommands', { commands, ...extra });
    }

    /**
     * Get the current list of bot commands.
     */
    async getMyCommands(extra?: BotCommandOptions): Promise<BotCommand[]> {
        return this.client.callApi('getMyCommands', extra);
    }

    /**
     * Delete the list of bot commands for a given scope/language.
     */
    async deleteMyCommands(extra?: BotCommandOptions): Promise<boolean> {
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
