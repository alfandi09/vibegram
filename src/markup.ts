export interface PaginationItem {
    text: string;
    callback_data: string;
}

export interface PaginationOptions {
    /** Current page index (1-based). */
    currentPage: number;
    /** Maximum number of items rendered per page. */
    itemsPerPage: number;
    /** Callback data payload for the "Next" navigation button. */
    actionNext: string;
    /** Callback data payload for the "Prev" navigation button. */
    actionPrev: string;
    /** Optional: Page indicator label pattern, e.g. '{current} of {total}'. */
    pageIndicatorPattern?: string;
    /** Optional: Number of columns to arrange items into a grid. Default: 1 (list mode). */
    columns?: number;
}

/**
 * Declarative keyboard and paginated matrix builder.
 * Eliminates boilerplate from manually constructing inline_keyboard matrix arrays.
 */
export class Markup {
    /** Build a standard InlineKeyboardMarkup from a matrix of button rows. */
    static inlineKeyboard(buttonRows: any[][]) {
        return { inline_keyboard: buttonRows };
    }

    /**
     * Arrange a flat array of inline buttons into a grid layout automatically.
     * @param buttons Flat array of button objects (e.g. from Markup.button.callback())
     * @param columns Number of buttons per row. Default: 2.
     *
     * @example
     * Markup.grid([
     *     Markup.button.callback('Mon', 'mon'),
     *     Markup.button.callback('Tue', 'tue'),
     *     Markup.button.callback('Wed', 'wed'),
     * ], 2)
     * // inline_keyboard → [[Mon, Tue], [Wed]]
     */
    static grid(buttons: any[], columns: number = 2) {
        const rows: any[][] = [];
        for (let i = 0; i < buttons.length; i += columns) {
            rows.push(buttons.slice(i, i + columns));
        }
        return { inline_keyboard: rows };
    }

    /** Collection of inline button factory helpers. */
    static button = {
        /** Callback query button — triggers bot.action() handlers. */
        callback: (text: string, data: string) => ({ text, callback_data: data }),
        /** External URL navigation button. */
        url: (text: string, url: string) => ({ text, url }),
        /** Telegram Mini App (WebApp) launcher button. */
        webApp: (text: string, url: string) => ({ text, web_app: { url } }),
        /** Payment button for Telegram Stars / Stripe monetization. */
        pay: (text: string) => ({ text, pay: true }),
        /** Inline Query trigger — opens inline mode directed at this bot. */
        switchInlineQuery: (text: string, query: string = '') => ({ text, switch_inline_query: query }),
        /** Inline Query trigger — opens inline mode within the current chat only. */
        switchInlineQueryCurrentChat: (text: string, query: string = '') => ({ text, switch_inline_query_current_chat: query }),
        /** Login button using Telegram Login Widget (OAuth flow). */
        login: (text: string, loginUrl: { url: string; forward_text?: string; bot_username?: string; request_write_access?: boolean }) => ({ text, login_url: loginUrl }),
        /** Copy-to-clipboard button (Bot API 9.6). */
        copy: (text: string, textToCopy: string) => ({ text, copy_text: { text: textToCopy } }),
    };

    /**
     * Paginate an array of items into a navigable inline keyboard.
     * Automatically renders prev/next navigation buttons and a page indicator.
     */
    static pagination(items: PaginationItem[], options: PaginationOptions) {
        const page = Math.max(1, options.currentPage);
        const perPage = Math.max(1, options.itemsPerPage);
        const totalPages = Math.ceil(items.length / perPage) || 1;

        // Slice the item list to the current page window.
        const start = (page - 1) * perPage;
        const itemsOnPage = items.slice(start, start + perPage);

        // Arrange items into columns (grid) or a single column (list).
        const columns = options.columns || 1;
        const keyboard: any[][] = [];
        for (let i = 0; i < itemsOnPage.length; i += columns) {
            const row = itemsOnPage.slice(i, i + columns).map(item => ({
                text: item.text,
                callback_data: item.callback_data
            }));
            keyboard.push(row);
        }

        // Build the navigation row.
        const navRow = [];

        // Previous page button.
        if (page > 1) {
            navRow.push({ text: '⬅️ Prev', callback_data: options.actionPrev });
        }

        // Page indicator button (non-interactive, uses a no-op callback_data).
        const indicatorText = options.pageIndicatorPattern
            ? options.pageIndicatorPattern.replace('{current}', page.toString()).replace('{total}', totalPages.toString())
            : `${page}/${totalPages}`;

        // Empty callback_data prevents a "Loading..." flash on the client.
        navRow.push({ text: indicatorText, callback_data: 'ignore_nav' });

        // Next page button.
        if (page < totalPages) {
            navRow.push({ text: 'Next ➡️', callback_data: options.actionNext });
        }

        keyboard.push(navRow);
        return { inline_keyboard: keyboard };
    }

    // ------------------------------------------
    // REPLY KEYBOARD (NATIVE CLIENT KEYBOARD)
    // ------------------------------------------

    /**
     * Build a ReplyKeyboardMarkup from a matrix of reply button rows.
     * Defaults to resize_keyboard: true for a compact layout.
     * Supports input_field_placeholder and selective targeting.
     */
    static keyboard(
        buttonRows: any[][],
        options?: {
            resize_keyboard?: boolean;
            one_time_keyboard?: boolean;
            is_persistent?: boolean;
            input_field_placeholder?: string;
            selective?: boolean;
        }
    ) {
        return {
            keyboard: buttonRows,
            resize_keyboard: options?.resize_keyboard ?? true,
            one_time_keyboard: options?.one_time_keyboard ?? false,
            is_persistent: options?.is_persistent ?? false,
            ...(options?.input_field_placeholder && { input_field_placeholder: options.input_field_placeholder }),
            ...(options?.selective !== undefined && { selective: options.selective }),
        };
    }

    /** Instruct the Telegram client to remove the custom reply keyboard from the screen. */
    static removeKeyboard(selective?: boolean) {
        return {
            remove_keyboard: true,
            selective: selective ?? false
        };
    }

    /** Emit a force reply request, prompting the user to reply to the bot's message. */
    static forceReply(options?: { input_field_placeholder?: string; selective?: boolean }) {
        return {
            force_reply: true,
            ...options
        };
    }

    /** Collection of reply keyboard button factory helpers. */
    static replyButton = {
        /** Standard text button. */
        text: (text: string) => ({ text }),
        /** Request the user's phone number (contact sharing). */
        requestContact: (text: string) => ({ text, request_contact: true }),
        /** Request the user's current GPS location. */
        requestLocation: (text: string) => ({ text, request_location: true }),
        /** Open a poll creation dialog (quiz or regular). */
        requestPoll: (text: string, type?: 'quiz' | 'regular') => ({ text, request_poll: type ? { type } : {} }),
        /** Select a specific user or bot (Bot API 6.x). */
        requestUser: (text: string, request_id: number, extraOptions: any = {}) => ({ text, request_user: { request_id, ...extraOptions } }),
        /** Select a specific group or channel (Bot API 6.x). */
        requestChat: (text: string, request_id: number, extraOptions: any = {}) => ({ text, request_chat: { request_id, ...extraOptions } }),
        /** Authorize a Managed Bot on behalf of the user (Bot API 9.6). */
        requestManagedBot: (text: string, request_id: number, extraOptions: any = {}) => ({ text, request_managed_bot: { request_id, ...extraOptions } })
    };
}
