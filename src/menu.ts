import { Context } from './context';
import { Middleware } from './composer';
import { Markup } from './markup';

/**
 * Menu item definition.
 */
export interface MenuItem {
    text: string;
    /** Callback handler when this button is pressed */
    handler?: (ctx: Context) => void | Promise<void>;
    /** URL to open (mutually exclusive with handler) */
    url?: string;
    /** Sub-menu to navigate to */
    submenu?: string;
    /** Custom callback data (auto-generated if not set) */
    callbackData?: string;
    /** Hide this button based on a condition */
    hide?: (ctx: Context) => boolean | Promise<boolean>;
}

interface MenuRow {
    items: MenuItem[];
}

/**
 * Stateful inline menu builder with auto-edit, sub-menus, and dynamic visibility.
 *
 * Usage:
 * ```typescript
 * const menu = new Menu('main');
 *
 * menu.text('📢 News', async (ctx) => {
 *     await ctx.answerCbQuery('Loading news...');
 *     await ctx.reply('Latest news here.');
 * });
 *
 * menu.text('⚙️ Settings', ctx => ctx.answerCbQuery('Settings'))
 *     .row()
 *     .url('📚 Docs', 'https://docs.example.com');
 *
 * // Create sub-menu
 * const settingsMenu = menu.submenu('settings', '⚙️ Settings');
 * settingsMenu.text('🌙 Dark Mode', ctx => ctx.answerCbQuery('Dark mode toggled'));
 * settingsMenu.back('← Back');
 *
 * bot.use(menu.middleware());
 * bot.command('menu', async (ctx) => {
 *     await ctx.reply('Main Menu:', { reply_markup: await menu.render(ctx) });
 * });
 * ```
 */
export class Menu {
    private rows: MenuRow[] = [{ items: [] }];
    private currentRow = 0;
    private handlers = new Map<string, (ctx: Context) => void | Promise<void>>();
    private submenus = new Map<string, Menu>();
    private parentMenu?: Menu;
    private parentId?: string;

    constructor(public readonly id: string) {}

    /**
     * Add a text button with a callback handler.
     */
    text(label: string, handler: (ctx: Context) => void | Promise<void>, options?: { hide?: (ctx: Context) => boolean | Promise<boolean> }): this {
        const cbData = `menu:${this.id}:${this.rows.length}_${this.rows[this.currentRow].items.length}`;
        this.rows[this.currentRow].items.push({
            text: label,
            handler,
            callbackData: cbData,
            hide: options?.hide
        });
        this.handlers.set(cbData, handler);
        return this;
    }

    /**
     * Add a URL button.
     */
    url(label: string, url: string): this {
        this.rows[this.currentRow].items.push({
            text: label,
            url
        });
        return this;
    }

    /**
     * Start a new row of buttons.
     */
    row(): this {
        this.rows.push({ items: [] });
        this.currentRow = this.rows.length - 1;
        return this;
    }

    /**
     * Add a "Back" button that navigates to the parent menu.
     */
    back(label: string = '← Back'): this {
        if (!this.parentMenu || !this.parentId) return this;

        const cbData = `menu:${this.id}:back`;
        const parentMenu = this.parentMenu;
        this.rows[this.currentRow].items.push({
            text: label,
            callbackData: cbData,
            handler: async (ctx) => {
                await ctx.answerCbQuery();
                const keyboard = await parentMenu.render(ctx);
                await ctx.client.callApi('editMessageReplyMarkup', {
                    chat_id: ctx.chat?.id,
                    message_id: ctx.update.callback_query?.message?.message_id,
                    reply_markup: keyboard
                });
            }
        });
        this.handlers.set(cbData, this.rows[this.currentRow].items[this.rows[this.currentRow].items.length - 1].handler!);
        return this;
    }

    /**
     * Create a sub-menu. Returns the child Menu for chaining.
     */
    submenu(childId: string, label: string): Menu {
        const child = new Menu(childId);
        child.parentMenu = this;
        child.parentId = this.id;
        this.submenus.set(childId, child);

        const cbData = `menu:${this.id}:sub_${childId}`;
        this.rows[this.currentRow].items.push({
            text: label,
            callbackData: cbData,
            handler: async (ctx) => {
                await ctx.answerCbQuery();
                const keyboard = await child.render(ctx);
                await ctx.client.callApi('editMessageReplyMarkup', {
                    chat_id: ctx.chat?.id,
                    message_id: ctx.update.callback_query?.message?.message_id,
                    reply_markup: keyboard
                });
            }
        });
        this.handlers.set(cbData, this.rows[this.currentRow].items[this.rows[this.currentRow].items.length - 1].handler!);

        return child;
    }

    /**
     * Render the menu keyboard for sending/editing.
     */
    async render(ctx: Context): Promise<any> {
        const keyboard: any[][] = [];

        for (const row of this.rows) {
            const buttons: any[] = [];
            for (const item of row.items) {
                // Check visibility
                if (item.hide && (await item.hide(ctx))) continue;

                if (item.url) {
                    buttons.push({ text: item.text, url: item.url });
                } else if (item.callbackData) {
                    buttons.push({ text: item.text, callback_data: item.callbackData });
                }
            }
            if (buttons.length > 0) keyboard.push(buttons);
        }

        return { inline_keyboard: keyboard };
    }

    /**
     * Get middleware that handles all menu button presses.
     */
    middleware(): Middleware<any> {
        return async (ctx, next) => {
            const cbData = ctx.update.callback_query?.data;
            if (!cbData || !cbData.startsWith(`menu:${this.id}:`)) {
                // Check sub-menus
                for (const [, submenu] of this.submenus) {
                    if (cbData && cbData.startsWith(`menu:${submenu.id}:`)) {
                        const handler = submenu.handlers.get(cbData);
                        if (handler) return handler(ctx);
                    }
                }
                return next();
            }

            const handler = this.handlers.get(cbData);
            if (handler) {
                return handler(ctx);
            }
            return next();
        };
    }
}
