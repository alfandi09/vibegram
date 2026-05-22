export type TelegramParseMode = 'HTML' | 'MarkdownV2' | 'Markdown' | (string & {});

export interface FormattedValue {
    text: string;
    parse_mode: TelegramParseMode;
    toString(): string;
}

export interface ParseModeClient {
    callApi(method: string, data?: unknown, ...args: unknown[]): Promise<unknown>;
}

export interface ParseModeContext {
    client: ParseModeClient;
    reply(text: string, extra?: Record<string, unknown>): Promise<unknown>;
    replyFmt?(formatted: FormattedValue, extra?: Record<string, unknown>): Promise<unknown>;
}

export type ParseModeMiddleware<C extends ParseModeContext = ParseModeContext> = (
    ctx: C,
    next: () => Promise<void>
) => Promise<void>;

export type ParseModeFlavor<C> = C & {
    replyFmt(formatted: FormattedValue, extra?: Record<string, unknown>): Promise<unknown>;
};

class FormattedString implements FormattedValue {
    constructor(
        readonly text: string,
        readonly parse_mode: TelegramParseMode
    ) {}

    toString(): string {
        return this.text;
    }
}

const HTML_MODE: TelegramParseMode = 'HTML';
const MARKDOWN_V2_MODE: TelegramParseMode = 'MarkdownV2';
const TEXT_PARSE_MODE_METHODS = new Set([
    'sendMessage',
    'editMessageText',
    'sendGame',
    'sendChecklist',
]);
const CAPTION_PARSE_MODE_METHODS = new Set([
    'sendPhoto',
    'sendVideo',
    'sendAnimation',
    'sendAudio',
    'sendDocument',
    'sendVoice',
    'sendMediaGroup',
    'copyMessage',
    'editMessageCaption',
]);
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'tg:', 'mailto:']);

/** Escape user text for Telegram HTML parse mode. */
export function escapeHtml(value: unknown): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Escape user text for Telegram MarkdownV2 parse mode. */
export function escapeMarkdownV2(value: unknown): string {
    return String(value).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/** Tagged template helper that builds safe HTML-formatted text. */
export function fmt(strings: TemplateStringsArray, ...values: unknown[]): FormattedValue {
    return buildFormatted(strings, values, HTML_MODE, escapeHtml);
}

/** Alias for `fmt()` when code wants to name the parse mode explicitly. */
export const htmlFmt = fmt;

/** Tagged template helper that builds safe MarkdownV2-formatted text. */
export function markdownFmt(
    strings: TemplateStringsArray,
    ...values: unknown[]
): FormattedValue {
    return buildFormatted(strings, values, MARKDOWN_V2_MODE, escapeMarkdownV2);
}

/** Wrap text in Telegram HTML bold tags. */
export function bold(value: unknown): FormattedValue {
    return htmlTag('b', value);
}

/** Wrap text in Telegram HTML italic tags. */
export function italic(value: unknown): FormattedValue {
    return htmlTag('i', value);
}

/** Wrap text in Telegram HTML underline tags. */
export function underline(value: unknown): FormattedValue {
    return htmlTag('u', value);
}

/** Wrap text in Telegram HTML strikethrough tags. */
export function strikethrough(value: unknown): FormattedValue {
    return htmlTag('s', value);
}

/** Wrap text in Telegram HTML spoiler tags. */
export function spoiler(value: unknown): FormattedValue {
    return htmlTag('tg-spoiler', value);
}

/** Wrap text in Telegram HTML inline code tags. */
export function code(value: unknown): FormattedValue {
    return htmlTag('code', value);
}

/** Wrap text in Telegram HTML preformatted code block tags. */
export function pre(value: unknown, language?: string): FormattedValue {
    const content = htmlText(value);
    const languageAttr = language ? ` class="language-${escapeHtml(language)}"` : '';
    return formatted(`<pre><code${languageAttr}>${content}</code></pre>`, HTML_MODE);
}

/** Build a safe Telegram HTML link. */
export function link(label: unknown, url: string): FormattedValue {
    const safeUrl = normalizeSafeUrl(url);
    return formatted(`<a href="${escapeHtml(safeUrl)}">${htmlText(label)}</a>`, HTML_MODE);
}

/** Wrap text in Telegram MarkdownV2 bold markers. */
export function markdownBold(value: unknown): FormattedValue {
    return markdownWrap('*', value);
}

/** Wrap text in Telegram MarkdownV2 italic markers. */
export function markdownItalic(value: unknown): FormattedValue {
    return markdownWrap('_', value);
}

/** Wrap text in Telegram MarkdownV2 inline code markers. */
export function markdownCode(value: unknown): FormattedValue {
    return formatted(`\`${markdownText(value)}\``, MARKDOWN_V2_MODE);
}

/** Build a safe Telegram MarkdownV2 link. */
export function markdownLink(label: unknown, url: string): FormattedValue {
    const safeUrl = normalizeSafeUrl(url);
    return formatted(
        `[${markdownText(label)}](${escapeMarkdownLinkUrl(safeUrl)})`,
        MARKDOWN_V2_MODE
    );
}

/**
 * Middleware that applies a default parse mode to outgoing text/caption calls
 * and adds `ctx.replyFmt(formatted, extra?)`.
 */
export function parseMode<C extends ParseModeContext = ParseModeContext>(
    mode: TelegramParseMode
): ParseModeMiddleware<C> {
    return async (ctx, next) => {
        const originalCallApi = ctx.client.callApi.bind(ctx.client);
        const previousReplyFmt = ctx.replyFmt;

        ctx.client.callApi = async (method: string, data?: unknown, ...args: unknown[]) =>
            originalCallApi(method, applyDefaultParseMode(method, data, mode), ...args);

        ctx.replyFmt = async (formattedValue, extra = {}) =>
            ctx.reply(formattedValue.text, {
                ...extra,
                parse_mode: formattedValue.parse_mode ?? extra.parse_mode ?? mode,
            });

        try {
            await next();
        } finally {
            ctx.client.callApi = originalCallApi;
            if (previousReplyFmt) {
                ctx.replyFmt = previousReplyFmt;
            } else {
                delete ctx.replyFmt;
            }
        }
    };
}

function buildFormatted(
    strings: TemplateStringsArray,
    values: unknown[],
    parseModeValue: TelegramParseMode,
    escape: (value: unknown) => string
): FormattedValue {
    let text = '';

    for (let index = 0; index < strings.length; index++) {
        text += escape(strings[index] ?? '');

        if (index < values.length) {
            text += interpolate(values[index], parseModeValue, escape);
        }
    }

    return formatted(text, parseModeValue);
}

function htmlTag(tag: string, value: unknown): FormattedValue {
    return formatted(`<${tag}>${htmlText(value)}</${tag}>`, HTML_MODE);
}

function markdownWrap(marker: string, value: unknown): FormattedValue {
    return formatted(`${marker}${markdownText(value)}${marker}`, MARKDOWN_V2_MODE);
}

function htmlText(value: unknown): string {
    return interpolate(value, HTML_MODE, escapeHtml);
}

function markdownText(value: unknown): string {
    return interpolate(value, MARKDOWN_V2_MODE, escapeMarkdownV2);
}

function interpolate(
    value: unknown,
    parseModeValue: TelegramParseMode,
    escape: (value: unknown) => string
): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (isFormattedValue(value)) {
        if (value.parse_mode !== parseModeValue) {
            throw new TypeError(
                `Cannot mix ${value.parse_mode} formatted text inside ${parseModeValue} text.`
            );
        }

        return value.text;
    }

    return escape(String(value));
}

function formatted(text: string, parseModeValue: TelegramParseMode): FormattedValue {
    return new FormattedString(text, parseModeValue);
}

function isFormattedValue(value: unknown): value is FormattedValue {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as FormattedValue).text === 'string' &&
        typeof (value as FormattedValue).parse_mode === 'string'
    );
}

function normalizeSafeUrl(url: string): string {
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        throw new TypeError('Unsafe URL: only absolute http, https, tg, and mailto URLs are allowed.');
    }

    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
        throw new TypeError('Unsafe URL: only http, https, tg, and mailto URLs are allowed.');
    }

    return url;
}

function escapeMarkdownLinkUrl(url: string): string {
    return url.replace(/([\\)])/g, '\\$1');
}

function applyDefaultParseMode(
    method: string,
    data: unknown,
    mode: TelegramParseMode
): unknown {
    if (!isPlainRecord(data)) {
        return data;
    }

    if (!shouldApplyParseMode(method, data)) {
        return data;
    }

    return {
        ...data,
        parse_mode: mode,
    };
}

function shouldApplyParseMode(method: string, data: Record<string, unknown>): boolean {
    if (data.parse_mode !== undefined) {
        return false;
    }

    if (TEXT_PARSE_MODE_METHODS.has(method) && typeof data.text === 'string') {
        return true;
    }

    return CAPTION_PARSE_MODE_METHODS.has(method) && typeof data.caption === 'string';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype
    );
}
