export type MaybePromise<T> = T | Promise<T>;
export type NextFunction = () => Promise<void>;

export type StarsPluginErrorCode =
    | 'missing_client'
    | 'missing_chat'
    | 'missing_pre_checkout_query'
    | 'missing_successful_payment'
    | 'missing_user'
    | 'invalid_invoice'
    | 'invalid_payment'
    | 'invalid_paid_media'
    | 'invalid_gift';

export interface LabeledPrice {
    label: string;
    amount: number;
}

export interface StarsInvoiceOptions {
    title: string;
    description?: string;
    payload: string;
    amount?: number;
    label?: string;
    prices?: readonly LabeledPrice[];
    subscriptionPeriod?: number;
    extra?: Record<string, unknown>;
}

export interface StarsInvoicePayload {
    title: string;
    description: string;
    payload: string;
    provider_token: '';
    currency: 'XTR';
    prices: LabeledPrice[];
    subscription_period?: number;
    [key: string]: unknown;
}

export interface StarsClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface StarsUser {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    [key: string]: unknown;
}

export interface StarsChat {
    id: number | string;
    type?: string;
    [key: string]: unknown;
}

export interface PreCheckoutQueryLike {
    id: string;
    from: StarsUser;
    currency: string;
    total_amount: number;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface SuccessfulPaymentLike {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
    provider_payment_charge_id?: string;
    subscription_expiration_date?: number;
    is_recurring?: true;
    is_first_recurring?: true;
    shipping_option_id?: string;
    order_info?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface PaidMediaPurchasedLike {
    from: StarsUser;
    paid_media_payload: string;
    [key: string]: unknown;
}

export interface StarsUpdate {
    update_id?: number;
    pre_checkout_query?: PreCheckoutQueryLike;
    message?: {
        message_id?: number;
        from?: StarsUser;
        chat?: StarsChat;
        successful_payment?: SuccessfulPaymentLike;
        [key: string]: unknown;
    };
    purchased_paid_media?: PaidMediaPurchasedLike;
    [key: string]: unknown;
}

export interface StarsContext {
    update?: StarsUpdate;
    chat?: StarsChat;
    from?: StarsUser;
    message?: StarsUpdate['message'];
    client?: StarsClient;
    stars?: StarsSession;
    [key: string]: unknown;
}

export type StarsMiddleware<C extends StarsContext = StarsContext> = (
    ctx: C,
    next: NextFunction
) => Promise<void>;

export type StarsFlavor<C> = C & {
    stars: StarsSession;
};

export interface PaymentValidationOptions {
    currency?: string;
    totalAmount?: number;
    payload?: string;
    payloadPrefix?: string;
    validatePayload?: (payload: string) => boolean;
}

export interface SendPaidMediaOptions {
    starCount: number;
    media: readonly Record<string, unknown>[];
    payload?: string;
    caption?: string;
    extra?: Record<string, unknown>;
}

export interface SendGiftOptions {
    text?: string;
    text_parse_mode?: string;
    text_entities?: readonly Record<string, unknown>[];
    pay_for_upgrade?: boolean;
    [key: string]: unknown;
}

export interface GiftPremiumOptions {
    text?: string;
    text_parse_mode?: string;
    text_entities?: readonly Record<string, unknown>[];
    [key: string]: unknown;
}

export interface StarsBusinessSession {
    getStarBalance(businessConnectionId: string): Promise<unknown>;
    transferStars(businessConnectionId: string, starCount: number): Promise<unknown>;
    getGifts(businessConnectionId: string, extra?: Record<string, unknown>): Promise<unknown>;
    convertGiftToStars(businessConnectionId: string, ownedGiftId: string): Promise<unknown>;
    upgradeGift(
        businessConnectionId: string,
        ownedGiftId: string,
        extra?: Record<string, unknown>
    ): Promise<unknown>;
    transferGift(
        businessConnectionId: string,
        ownedGiftId: string,
        newOwnerChatId: number,
        extra?: Record<string, unknown>
    ): Promise<unknown>;
}

export interface StarsGiftSession {
    available(): Promise<unknown>;
    send(userId: number, giftId: string, extra?: SendGiftOptions): Promise<unknown>;
    sendToChat(chatId: number | string, giftId: string, extra?: SendGiftOptions): Promise<unknown>;
    premium(
        userId: number,
        monthCount: number,
        starCount: number,
        extra?: GiftPremiumOptions
    ): Promise<unknown>;
}

export interface StarsSession {
    invoice(options: StarsInvoiceOptions): Promise<unknown>;
    invoicePayload(options: StarsInvoiceOptions): StarsInvoicePayload;
    createInvoiceLink(options: StarsInvoiceOptions): Promise<unknown>;
    paidMedia(options: SendPaidMediaOptions): Promise<unknown>;
    preCheckoutQuery(): PreCheckoutQueryLike;
    validatePreCheckout(options?: PaymentValidationOptions): PreCheckoutQueryLike;
    approvePreCheckout(options?: PaymentValidationOptions): Promise<PreCheckoutQueryLike>;
    declinePreCheckout(errorMessage: string): Promise<PreCheckoutQueryLike>;
    successfulPayment(): SuccessfulPaymentLike;
    requireSuccessfulPayment(options?: PaymentValidationOptions): SuccessfulPaymentLike;
    refund(userId: number, telegramPaymentChargeId: string): Promise<unknown>;
    refundSuccessfulPayment(): Promise<unknown>;
    gifts: StarsGiftSession;
    business: StarsBusinessSession;
}

const STARS_CURRENCY = 'XTR';
const STARS_PROVIDER_TOKEN = '';
const DEFAULT_LABEL = 'Stars';
const MAX_TITLE_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_PAYLOAD_BYTES = 128;
const SUBSCRIPTION_PERIOD_SECONDS = 2_592_000;

export class StarsPluginError extends Error {
    constructor(
        readonly code: StarsPluginErrorCode,
        message: string
    ) {
        super(`[vibegram/stars] ${message}`);
        this.name = 'StarsPluginError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/** Build a Telegram Stars invoice payload for sendInvoice/createInvoiceLink. */
export function buildStarsInvoice(options: StarsInvoiceOptions): StarsInvoicePayload {
    const prices = normalizeStarsPrices(options);
    const title = requiredString(options.title, 'title', MAX_TITLE_LENGTH);
    const description = requiredString(
        options.description ?? options.title,
        'description',
        MAX_DESCRIPTION_LENGTH
    );
    const payload = requiredPayload(options.payload);
    const subscriptionPeriod = options.subscriptionPeriod;

    if (
        subscriptionPeriod !== undefined &&
        subscriptionPeriod !== SUBSCRIPTION_PERIOD_SECONDS
    ) {
        throw new StarsPluginError(
            'invalid_invoice',
            'subscriptionPeriod must be 2592000 seconds for Telegram Stars subscriptions.'
        );
    }

    return compact({
        title,
        description,
        payload,
        provider_token: STARS_PROVIDER_TOKEN,
        currency: STARS_CURRENCY,
        prices,
        subscription_period: subscriptionPeriod,
        ...options.extra,
    }) as StarsInvoicePayload;
}

/** Middleware that adds request-scoped `ctx.stars` helpers. */
export function stars<C extends StarsContext = StarsContext>(): StarsMiddleware<C> {
    return async (ctx, next) => {
        const previous = ctx.stars;
        ctx.stars = createStarsSession(ctx);

        try {
            await next();
        } finally {
            if (previous) {
                ctx.stars = previous;
            } else {
                delete ctx.stars;
            }
        }
    };
}

/** Create a pre_checkout_query update fixture for tests. */
export function createPreCheckoutQueryUpdate(options: {
    id?: string;
    userId?: number;
    payload?: string;
    totalAmount?: number;
    currency?: string;
    updateId?: number;
} = {}): StarsUpdate {
    const userId = options.userId ?? 1;
    return {
        update_id: options.updateId ?? 1000,
        pre_checkout_query: {
            id: options.id ?? 'pre-checkout-1',
            from: testUser(userId),
            currency: options.currency ?? STARS_CURRENCY,
            total_amount: options.totalAmount ?? 1,
            invoice_payload: options.payload ?? `order:${userId}`,
        },
    };
}

/** Create a successful_payment message update fixture for tests. */
export function createSuccessfulPaymentUpdate(options: {
    userId?: number;
    payload?: string;
    totalAmount?: number;
    currency?: string;
    telegramPaymentChargeId?: string;
    providerPaymentChargeId?: string;
    updateId?: number;
} = {}): StarsUpdate {
    const userId = options.userId ?? 1;
    return {
        update_id: options.updateId ?? 1001,
        message: {
            message_id: 10,
            from: testUser(userId),
            chat: { id: userId, type: 'private' },
            successful_payment: {
                currency: options.currency ?? STARS_CURRENCY,
                total_amount: options.totalAmount ?? 1,
                invoice_payload: options.payload ?? `order:${userId}`,
                telegram_payment_charge_id:
                    options.telegramPaymentChargeId ?? 'telegram-charge-1',
                provider_payment_charge_id:
                    options.providerPaymentChargeId ?? 'provider-charge-1',
            },
        },
    };
}

/** Create a purchased_paid_media update fixture for tests. */
export function createPaidMediaPurchasedUpdate(options: {
    userId?: number;
    paidMediaPayload?: string;
    updateId?: number;
} = {}): StarsUpdate {
    const userId = options.userId ?? 1;
    return {
        update_id: options.updateId ?? 1002,
        purchased_paid_media: {
            from: testUser(userId),
            paid_media_payload: options.paidMediaPayload ?? `paid-media:${userId}`,
        },
    };
}

function createStarsSession<C extends StarsContext>(ctx: C): StarsSession {
    return {
        invoice(options) {
            const client = requireClient(ctx);
            const chatId = getChatId(ctx);
            return client.callApi('sendInvoice', {
                chat_id: chatId,
                ...buildStarsInvoice(options),
            });
        },
        invoicePayload(options) {
            return buildStarsInvoice(options);
        },
        createInvoiceLink(options) {
            return requireClient(ctx).callApi('createInvoiceLink', buildStarsInvoice(options));
        },
        paidMedia(options) {
            const client = requireClient(ctx);
            const chatId = getChatId(ctx);
            return client.callApi('sendPaidMedia', {
                chat_id: chatId,
                ...buildPaidMediaPayload(options),
            });
        },
        preCheckoutQuery() {
            const query = ctx.update?.pre_checkout_query;
            if (!query) {
                throw new StarsPluginError(
                    'missing_pre_checkout_query',
                    'pre_checkout_query update is required.'
                );
            }
            return query;
        },
        validatePreCheckout(options = {}) {
            const query = this.preCheckoutQuery();
            validatePaymentRecord(query, options);
            return query;
        },
        async approvePreCheckout(options = {}) {
            const query = this.validatePreCheckout(options);
            await requireClient(ctx).callApi('answerPreCheckoutQuery', {
                pre_checkout_query_id: query.id,
                ok: true,
            });
            return query;
        },
        async declinePreCheckout(errorMessage) {
            const query = this.preCheckoutQuery();
            const message = requiredString(errorMessage, 'errorMessage', 200);
            await requireClient(ctx).callApi('answerPreCheckoutQuery', {
                pre_checkout_query_id: query.id,
                ok: false,
                error_message: message,
            });
            return query;
        },
        successfulPayment() {
            const payment = ctx.message?.successful_payment ?? ctx.update?.message?.successful_payment;
            if (!payment) {
                throw new StarsPluginError(
                    'missing_successful_payment',
                    'successful_payment message is required.'
                );
            }
            return payment;
        },
        requireSuccessfulPayment(options = {}) {
            const payment = this.successfulPayment();
            validatePaymentRecord(payment, options);
            return payment;
        },
        refund(userId, telegramPaymentChargeId) {
            assertPositiveInteger(userId, 'userId', 'invalid_payment');
            return requireClient(ctx).callApi('refundStarPayment', {
                user_id: userId,
                telegram_payment_charge_id: requiredString(
                    telegramPaymentChargeId,
                    'telegramPaymentChargeId'
                ),
            });
        },
        refundSuccessfulPayment() {
            const payment = this.requireSuccessfulPayment();
            const userId = ctx.from?.id ?? ctx.message?.from?.id ?? ctx.update?.message?.from?.id;
            if (typeof userId !== 'number') {
                throw new StarsPluginError('missing_user', 'A Telegram user is required to refund.');
            }
            return this.refund(userId, payment.telegram_payment_charge_id);
        },
        gifts: createGiftSession(ctx),
        business: createBusinessSession(ctx),
    };
}

function createGiftSession<C extends StarsContext>(ctx: C): StarsGiftSession {
    return {
        available() {
            return requireClient(ctx).callApi('getAvailableGifts');
        },
        send(userId, giftId, extra = {}) {
            assertPositiveInteger(userId, 'userId', 'invalid_gift');
            return requireClient(ctx).callApi('sendGift', {
                user_id: userId,
                gift_id: requiredString(giftId, 'giftId'),
                ...extra,
            });
        },
        sendToChat(chatId, giftId, extra = {}) {
            return requireClient(ctx).callApi('sendGift', {
                chat_id: chatId,
                gift_id: requiredString(giftId, 'giftId'),
                ...extra,
            });
        },
        premium(userId, monthCount, starCount, extra = {}) {
            assertPositiveInteger(userId, 'userId', 'invalid_gift');
            assertPositiveInteger(monthCount, 'monthCount', 'invalid_gift');
            assertPositiveInteger(starCount, 'starCount', 'invalid_gift');
            return requireClient(ctx).callApi('giftPremiumSubscription', {
                user_id: userId,
                month_count: monthCount,
                star_count: starCount,
                ...extra,
            });
        },
    };
}

function createBusinessSession<C extends StarsContext>(ctx: C): StarsBusinessSession {
    return {
        getStarBalance(businessConnectionId) {
            return requireClient(ctx).callApi('getBusinessAccountStarBalance', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
            });
        },
        transferStars(businessConnectionId, starCount) {
            assertPositiveInteger(starCount, 'starCount', 'invalid_payment');
            return requireClient(ctx).callApi('transferBusinessAccountStars', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
                star_count: starCount,
            });
        },
        getGifts(businessConnectionId, extra = {}) {
            return requireClient(ctx).callApi('getBusinessAccountGifts', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
                ...extra,
            });
        },
        convertGiftToStars(businessConnectionId, ownedGiftId) {
            return requireClient(ctx).callApi('convertGiftToStars', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
                owned_gift_id: requiredString(ownedGiftId, 'ownedGiftId'),
            });
        },
        upgradeGift(businessConnectionId, ownedGiftId, extra = {}) {
            return requireClient(ctx).callApi('upgradeGift', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
                owned_gift_id: requiredString(ownedGiftId, 'ownedGiftId'),
                ...extra,
            });
        },
        transferGift(businessConnectionId, ownedGiftId, newOwnerChatId, extra = {}) {
            assertPositiveInteger(newOwnerChatId, 'newOwnerChatId', 'invalid_gift');
            return requireClient(ctx).callApi('transferGift', {
                business_connection_id: requiredString(businessConnectionId, 'businessConnectionId'),
                owned_gift_id: requiredString(ownedGiftId, 'ownedGiftId'),
                new_owner_chat_id: newOwnerChatId,
                ...extra,
            });
        },
    };
}

function buildPaidMediaPayload(options: SendPaidMediaOptions): Record<string, unknown> {
    assertPositiveInteger(options.starCount, 'starCount', 'invalid_paid_media');
    if (!Array.isArray(options.media) || options.media.length === 0) {
        throw new StarsPluginError('invalid_paid_media', 'media must contain at least one item.');
    }
    if (options.payload !== undefined) {
        requiredPayload(options.payload, 'payload');
    }

    return compact({
        star_count: options.starCount,
        media: [...options.media],
        payload: options.payload,
        caption: options.caption,
        ...options.extra,
    });
}

function normalizeStarsPrices(options: StarsInvoiceOptions): LabeledPrice[] {
    const prices = options.prices
        ? [...options.prices]
        : [{ label: options.label ?? DEFAULT_LABEL, amount: options.amount }];

    if (prices.length !== 1) {
        throw new StarsPluginError(
            'invalid_invoice',
            'Telegram Stars invoices must contain exactly one price item.'
        );
    }

    const price = prices[0];
    if (!price || typeof price.label !== 'string' || price.label.trim() === '') {
        throw new StarsPluginError('invalid_invoice', 'Stars price label is required.');
    }
    assertPositiveInteger(price.amount, 'amount', 'invalid_invoice');

    return [{ label: price.label, amount: price.amount }];
}

function validatePaymentRecord(
    payment: PreCheckoutQueryLike | SuccessfulPaymentLike,
    options: PaymentValidationOptions
): void {
    const expectedCurrency = options.currency ?? STARS_CURRENCY;
    if (payment.currency !== expectedCurrency) {
        throw new StarsPluginError(
            'invalid_payment',
            `Expected payment currency ${expectedCurrency}.`
        );
    }
    if (options.totalAmount !== undefined && payment.total_amount !== options.totalAmount) {
        throw new StarsPluginError('invalid_payment', 'Payment total_amount does not match.');
    }
    if (options.payload !== undefined && payment.invoice_payload !== options.payload) {
        throw new StarsPluginError('invalid_payment', 'Payment invoice_payload does not match.');
    }
    if (
        options.payloadPrefix !== undefined &&
        !payment.invoice_payload.startsWith(options.payloadPrefix)
    ) {
        throw new StarsPluginError('invalid_payment', 'Payment invoice_payload prefix is invalid.');
    }
    if (options.validatePayload && !options.validatePayload(payment.invoice_payload)) {
        throw new StarsPluginError('invalid_payment', 'Payment invoice_payload failed validation.');
    }
}

function requireClient(ctx: StarsContext): StarsClient {
    if (!ctx.client) {
        throw new StarsPluginError('missing_client', 'ctx.client is required.');
    }
    return ctx.client;
}

function getChatId(ctx: StarsContext): number | string {
    const chatId = ctx.chat?.id ?? ctx.message?.chat?.id ?? ctx.update?.message?.chat?.id;
    if (typeof chatId !== 'number' && typeof chatId !== 'string') {
        throw new StarsPluginError('missing_chat', 'A Telegram chat is required.');
    }
    return chatId;
}

function requiredString(value: string | undefined, name: string, maxLength?: number): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new StarsPluginError('invalid_invoice', `${name} is required.`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
        throw new StarsPluginError(
            'invalid_invoice',
            `${name} must be at most ${maxLength} characters.`
        );
    }
    return value;
}

function requiredPayload(value: string | undefined, name = 'payload'): string {
    const payload = requiredString(value, name);
    if (Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES) {
        throw new StarsPluginError(
            'invalid_invoice',
            `${name} must be at most ${MAX_PAYLOAD_BYTES} bytes.`
        );
    }
    return payload;
}

function assertPositiveInteger(
    value: unknown,
    name: string,
    code: StarsPluginErrorCode
): asserts value is number {
    if (!Number.isInteger(value) || Number(value) <= 0) {
        throw new StarsPluginError(code, `${name} must be a positive integer.`);
    }
}

function compact<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
            output[key] = entry;
        }
    }
    return output;
}

function testUser(id: number): StarsUser {
    return {
        id,
        is_bot: false,
        first_name: `User ${id}`,
    };
}
