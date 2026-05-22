import { createHmac, timingSafeEqual } from 'node:crypto';

export type MaybePromise<T> = T | Promise<T>;
export type NextFunction = () => Promise<void>;

export type WebAppKitErrorCode =
    | 'missing_bot_token'
    | 'missing_init_data'
    | 'missing_hash'
    | 'invalid_hash'
    | 'hash_mismatch'
    | 'missing_auth_date'
    | 'invalid_auth_date'
    | 'auth_date_in_future'
    | 'expired'
    | 'missing_web_app_data'
    | 'invalid_web_app_data'
    | 'invalid_launch_payload'
    | 'invalid_web_app_url'
    | 'missing_reply'
    | 'missing_client';

export interface WebAppUser {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: true;
    added_to_attachment_menu?: true;
    allows_write_to_pm?: true;
    photo_url?: string;
    [key: string]: unknown;
}

export interface WebAppChat {
    id: number;
    type: 'group' | 'supergroup' | 'channel' | (string & {});
    title: string;
    username?: string;
    photo_url?: string;
    [key: string]: unknown;
}

export interface WebAppInitData {
    query_id?: string;
    user?: WebAppUser;
    receiver?: WebAppUser;
    chat?: WebAppChat;
    chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel' | (string & {});
    chat_instance?: string;
    start_param?: string;
    can_send_after?: number;
    auth_date: number;
    signature?: string;
    [key: string]: unknown;
}

export interface ValidatedInitData<T extends WebAppInitData = WebAppInitData> {
    ok: true;
    data: T;
    raw: Record<string, string>;
    hash: string;
}

export interface InvalidInitData {
    ok: false;
    error: WebAppKitError;
}

export type InitDataValidationResult<T extends WebAppInitData = WebAppInitData> =
    | ValidatedInitData<T>
    | InvalidInitData;

export interface InitDataValidationOptions {
    botToken: string;
    maxAgeSeconds?: number;
    futureSkewSeconds?: number;
    now?: () => number;
}

export interface ParseWebAppDataOptions<T> {
    maxBytes?: number;
    validate?: (value: unknown) => value is T;
}

export type LaunchPayloadFormat = 'raw' | 'json' | 'base64json' | 'urlsearchparams';

export interface ParseLaunchPayloadOptions<T> {
    format?: LaunchPayloadFormat;
    parser?: (value: string) => T;
}

export interface WebAppDataLike {
    data: string;
    button_text?: string;
}

export interface WebAppClient {
    callApi(method: string, data?: Record<string, unknown>): Promise<unknown>;
}

export interface WebAppContext {
    message?: {
        web_app_data?: WebAppDataLike;
        [key: string]: unknown;
    };
    client?: WebAppClient;
    reply?(text: string, extra?: Record<string, unknown>): MaybePromise<unknown>;
    webApp?: WebAppSession;
    [key: string]: unknown;
}

export type WebAppMiddleware<C extends WebAppContext = WebAppContext> = (
    ctx: C,
    next: NextFunction
) => Promise<void>;

export type WebAppFlavor<C> = C & {
    webApp: WebAppSession;
};

export interface WebAppKitOptions {
    botToken: string;
    maxAgeSeconds?: number;
    futureSkewSeconds?: number;
    now?: () => number;
}

export interface WebAppInlineKeyboardMarkup {
    inline_keyboard: Array<Array<{ text: string; web_app: { url: string } }>>;
}

export interface WebAppReplyKeyboardMarkup {
    keyboard: Array<Array<{ text: string; web_app: { url: string } }>>;
    resize_keyboard: boolean;
    one_time_keyboard: boolean;
    is_persistent?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
}

export interface WebAppReplyKeyboardOptions {
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    is_persistent?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
}

export interface WebAppSession {
    validateInitData<T extends WebAppInitData = WebAppInitData>(
        initData: string,
        options?: Partial<InitDataValidationOptions>
    ): InitDataValidationResult<T>;
    assertInitData<T extends WebAppInitData = WebAppInitData>(
        initData: string,
        options?: Partial<InitDataValidationOptions>
    ): ValidatedInitData<T>;
    parseData<T = unknown>(webAppData?: WebAppDataLike, options?: ParseWebAppDataOptions<T>): T;
    parseLaunchPayload<T = string>(
        startParam: string | undefined,
        options?: ParseLaunchPayloadOptions<T>
    ): T;
    inlineKeyboard(text: string, url: string): WebAppInlineKeyboardMarkup;
    replyKeyboard(
        text: string,
        url: string,
        options?: WebAppReplyKeyboardOptions
    ): WebAppReplyKeyboardMarkup;
    replyWithInlineButton(
        text: string,
        buttonText: string,
        url: string,
        extra?: Record<string, unknown>
    ): Promise<unknown>;
    replyWithKeyboardButton(
        text: string,
        buttonText: string,
        url: string,
        extra?: Record<string, unknown>
    ): Promise<unknown>;
    answerQuery(webAppQueryId: string, result: Record<string, unknown>): Promise<unknown>;
}

const HASH_HEX_PATTERN = /^[0-9a-f]{64}$/i;
const DEFAULT_MAX_AGE_SECONDS = 86_400;
const DEFAULT_FUTURE_SKEW_SECONDS = 30;
const DEFAULT_WEB_APP_DATA_MAX_BYTES = 4_096;
const JSON_INIT_DATA_FIELDS = new Set(['user', 'receiver', 'chat']);
const NUMBER_INIT_DATA_FIELDS = new Set(['auth_date', 'can_send_after']);

export class WebAppKitError extends Error {
    readonly cause?: unknown;

    constructor(code: WebAppKitErrorCode, message: string, cause?: unknown) {
        super(`[vibegram/webapp-kit] ${message}`);
        this.name = 'WebAppKitError';
        this.code = code;
        this.cause = cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }

    readonly code: WebAppKitErrorCode;
}

/** Validate raw `window.Telegram.WebApp.initData` with Telegram's HMAC-SHA256 check. */
export function validateInitData<T extends WebAppInitData = WebAppInitData>(
    initData: string,
    options: InitDataValidationOptions
): InitDataValidationResult<T> {
    try {
        return assertValidInitData<T>(initData, options);
    } catch (error) {
        return { ok: false, error: normalizeWebAppKitError(error) };
    }
}

/** Validate raw `initData` and throw a normalized, secret-safe error on failure. */
export function assertValidInitData<T extends WebAppInitData = WebAppInitData>(
    initData: string,
    options: InitDataValidationOptions
): ValidatedInitData<T> {
    assertBotToken(options.botToken);
    if (typeof initData !== 'string' || initData.trim() === '') {
        throw new WebAppKitError('missing_init_data', 'initData must be a non-empty query string.');
    }

    const maxAgeSeconds = positiveInteger(
        options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS,
        'maxAgeSeconds'
    );
    const futureSkewSeconds = nonNegativeInteger(
        options.futureSkewSeconds ?? DEFAULT_FUTURE_SKEW_SECONDS,
        'futureSkewSeconds'
    );
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        throw new WebAppKitError('missing_hash', 'initData hash is required.');
    }
    if (!HASH_HEX_PATTERN.test(hash)) {
        throw new WebAppKitError('invalid_hash', 'initData hash format is invalid.');
    }

    params.delete('hash');
    const dataCheckString = buildDataCheckString(params);
    const calculatedHash = signInitData(dataCheckString, options.botToken);

    if (!safeEqualHex(hash, calculatedHash)) {
        throw new WebAppKitError('hash_mismatch', 'initData hash mismatch.');
    }

    const raw = Object.fromEntries(params.entries());
    const data = parseInitDataFields(raw);
    assertFreshAuthDate(data.auth_date, maxAgeSeconds, futureSkewSeconds, options.now);

    return {
        ok: true,
        data: data as T,
        raw,
        hash,
    };
}

/** Parse Telegram `message.web_app_data.data` as JSON after size and shape checks. */
export function parseWebAppData<T = unknown>(
    webAppData: WebAppDataLike | string | undefined,
    options: ParseWebAppDataOptions<T> = {}
): T {
    const data = typeof webAppData === 'string' ? webAppData : webAppData?.data;
    if (typeof data !== 'string' || data === '') {
        throw new WebAppKitError('missing_web_app_data', 'web_app_data.data is required.');
    }

    const maxBytes = positiveInteger(
        options.maxBytes ?? DEFAULT_WEB_APP_DATA_MAX_BYTES,
        'maxBytes'
    );
    if (Buffer.byteLength(data, 'utf8') > maxBytes) {
        throw new WebAppKitError(
            'invalid_web_app_data',
            `web_app_data.data exceeds ${maxBytes} bytes.`
        );
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(data);
    } catch (error) {
        throw new WebAppKitError(
            'invalid_web_app_data',
            'web_app_data.data must be valid JSON.',
            error
        );
    }

    if (options.validate && !options.validate(parsed)) {
        throw new WebAppKitError(
            'invalid_web_app_data',
            'web_app_data.data failed validation.'
        );
    }

    return parsed as T;
}

/** Parse a Telegram Mini App `start_param` launch payload. */
export function parseLaunchPayload<T = string>(
    startParam: string | undefined,
    options: ParseLaunchPayloadOptions<T> = {}
): T {
    if (typeof startParam !== 'string' || startParam === '') {
        throw new WebAppKitError('invalid_launch_payload', 'start_param is required.');
    }

    try {
        if (options.parser) {
            return options.parser(startParam);
        }

        const format = options.format ?? 'raw';
        if (format === 'raw') {
            return startParam as T;
        }
        if (format === 'json') {
            return JSON.parse(startParam) as T;
        }
        if (format === 'base64json') {
            return JSON.parse(Buffer.from(startParam, 'base64url').toString('utf8')) as T;
        }
        if (format === 'urlsearchparams') {
            return Object.fromEntries(new URLSearchParams(startParam).entries()) as T;
        }
    } catch (error) {
        throw new WebAppKitError(
            'invalid_launch_payload',
            'start_param could not be parsed.',
            error
        );
    }

    throw new WebAppKitError('invalid_launch_payload', 'Unsupported launch payload format.');
}

/** Build a Telegram inline keyboard button that opens a Mini App. */
export function buildWebAppInlineKeyboard(text: string, url: string): WebAppInlineKeyboardMarkup {
    assertButtonText(text);
    return {
        inline_keyboard: [[{ text, web_app: { url: normalizeWebAppUrl(url) } }]],
    };
}

/** Build a Telegram reply keyboard button that opens a Mini App. */
export function buildWebAppReplyKeyboard(
    text: string,
    url: string,
    options: WebAppReplyKeyboardOptions = {}
): WebAppReplyKeyboardMarkup {
    assertButtonText(text);
    return compact({
        keyboard: [[{ text, web_app: { url: normalizeWebAppUrl(url) } }]],
        resize_keyboard: options.resize_keyboard ?? true,
        one_time_keyboard: options.one_time_keyboard ?? false,
        is_persistent: options.is_persistent,
        input_field_placeholder: options.input_field_placeholder,
        selective: options.selective,
    }) as WebAppReplyKeyboardMarkup;
}

/** Add `ctx.webApp` helpers for Mini App validation and reply flows. */
export function webAppKit<C extends WebAppContext = WebAppContext>(
    options: WebAppKitOptions
): WebAppMiddleware<C> {
    assertBotToken(options.botToken);

    return async (ctx, next) => {
        const previous = ctx.webApp;
        ctx.webApp = createWebAppSession(ctx, options);

        try {
            await next();
        } finally {
            if (previous) {
                ctx.webApp = previous;
            } else {
                delete ctx.webApp;
            }
        }
    };
}

export function normalizeWebAppKitError(error: unknown): WebAppKitError {
    if (error instanceof WebAppKitError) {
        return error;
    }
    return new WebAppKitError('invalid_web_app_data', 'WebApp operation failed.', error);
}

function createWebAppSession<C extends WebAppContext>(
    ctx: C,
    defaults: WebAppKitOptions
): WebAppSession {
    const validationDefaults: InitDataValidationOptions = {
        botToken: defaults.botToken,
        maxAgeSeconds: defaults.maxAgeSeconds,
        futureSkewSeconds: defaults.futureSkewSeconds,
        now: defaults.now,
    };

    return {
        validateInitData(initData, options = {}) {
            return validateInitData(initData, { ...validationDefaults, ...options });
        },
        assertInitData(initData, options = {}) {
            return assertValidInitData(initData, { ...validationDefaults, ...options });
        },
        parseData(webAppData, parseOptions) {
            return parseWebAppData(webAppData ?? ctx.message?.web_app_data, parseOptions);
        },
        parseLaunchPayload(startParam, parseOptions) {
            return parseLaunchPayload(startParam, parseOptions);
        },
        inlineKeyboard(text, url) {
            return buildWebAppInlineKeyboard(text, url);
        },
        replyKeyboard(text, url, keyboardOptions) {
            return buildWebAppReplyKeyboard(text, url, keyboardOptions);
        },
        async replyWithInlineButton(text, buttonText, url, extra = {}) {
            if (!ctx.reply) {
                throw new WebAppKitError('missing_reply', 'ctx.reply() is required.');
            }
            return ctx.reply(text, {
                ...extra,
                reply_markup: buildWebAppInlineKeyboard(buttonText, url),
            });
        },
        async replyWithKeyboardButton(text, buttonText, url, extra = {}) {
            if (!ctx.reply) {
                throw new WebAppKitError('missing_reply', 'ctx.reply() is required.');
            }
            return ctx.reply(text, {
                ...extra,
                reply_markup: buildWebAppReplyKeyboard(buttonText, url),
            });
        },
        async answerQuery(webAppQueryId, result) {
            if (!ctx.client) {
                throw new WebAppKitError('missing_client', 'ctx.client is required.');
            }
            return ctx.client.callApi('answerWebAppQuery', {
                web_app_query_id: webAppQueryId,
                result,
            });
        },
    };
}

function parseInitDataFields(raw: Record<string, string>): WebAppInitData {
    const parsed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw)) {
        if (JSON_INIT_DATA_FIELDS.has(key)) {
            parsed[key] = parseJsonField(key, value);
        } else if (NUMBER_INIT_DATA_FIELDS.has(key)) {
            const numberValue = Number(value);
            if (!Number.isInteger(numberValue)) {
                throw new WebAppKitError('invalid_auth_date', `${key} must be an integer.`);
            }
            parsed[key] = numberValue;
        } else {
            parsed[key] = value;
        }
    }

    if (typeof parsed.auth_date !== 'number') {
        throw new WebAppKitError('missing_auth_date', 'auth_date is required.');
    }

    return parsed as WebAppInitData;
}

function parseJsonField(key: string, value: string): unknown {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new WebAppKitError(
            'invalid_web_app_data',
            `${key} must be valid JSON.`,
            error
        );
    }
}

function assertFreshAuthDate(
    authDate: number,
    maxAgeSeconds: number,
    futureSkewSeconds: number,
    nowProvider: (() => number) | undefined
): void {
    if (!Number.isInteger(authDate) || authDate <= 0) {
        throw new WebAppKitError('invalid_auth_date', 'auth_date must be a positive Unix timestamp.');
    }

    const now = Math.floor((nowProvider?.() ?? Date.now() / 1000));
    if (authDate > now + futureSkewSeconds) {
        throw new WebAppKitError('auth_date_in_future', 'auth_date is in the future.');
    }
    if (now - authDate > maxAgeSeconds) {
        throw new WebAppKitError('expired', 'initData auth_date has expired.');
    }
}

function buildDataCheckString(params: URLSearchParams): string {
    return Array.from(params.keys())
        .sort()
        .map(key => `${key}=${params.get(key)}`)
        .join('\n');
}

function signInitData(dataCheckString: string, botToken: string): string {
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    return createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

function safeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function assertBotToken(botToken: string): void {
    if (typeof botToken !== 'string' || botToken.trim() === '') {
        throw new WebAppKitError('missing_bot_token', 'botToken is required.');
    }
}

function assertButtonText(text: string): void {
    if (typeof text !== 'string' || text.trim() === '') {
        throw new WebAppKitError('invalid_web_app_data', 'Button text is required.');
    }
}

function normalizeWebAppUrl(url: string): string {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch (error) {
        throw new WebAppKitError('invalid_web_app_url', 'Web App URL must be a valid HTTPS URL.', error);
    }

    if (parsed.protocol !== 'https:') {
        throw new WebAppKitError('invalid_web_app_url', 'Web App URL must use HTTPS.');
    }

    return parsed.toString();
}

function positiveInteger(value: number, name: string): number {
    if (!Number.isInteger(value) || value <= 0) {
        throw new WebAppKitError('invalid_web_app_data', `${name} must be a positive integer.`);
    }
    return value;
}

function nonNegativeInteger(value: number, name: string): number {
    if (!Number.isInteger(value) || value < 0) {
        throw new WebAppKitError('invalid_web_app_data', `${name} must be a non-negative integer.`);
    }
    return value;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
    const output: Partial<T> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (entry !== undefined) {
            output[key as keyof T] = entry as T[keyof T];
        }
    }
    return output;
}
