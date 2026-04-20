import { Context } from './context';
import { Middleware } from './composer';
import { definePlugin } from './plugin';

/**
 * Internationalization (I18n) middleware.
 * Auto-detects the user's preferred language from Telegram's language_code metadata
 * and maps translation keys to localized string output with optional placeholder interpolation.
 */
export class I18n {
    private locales: Record<string, Record<string, string>> = {};
    private defaultLang: string;

    constructor(defaultLang: string = 'en') {
        this.defaultLang = defaultLang;
    }

    /**
     * Register a locale dictionary into memory.
     */
    loadLocale(lang: string, dictionary: Record<string, string>) {
        this.locales[lang] = dictionary;
    }

    /**
     * Retrieve a translated string by key, with optional dynamic placeholder substitution.
     * Falls back to the key itself if no translation is found.
     */
    t(lang: string, key: string, placeholders?: Record<string, string>): string {
        const dictionary = this.locales[lang] || this.locales[this.defaultLang] || {};
        let text = dictionary[key] || key;

        if (placeholders) {
            for (const p in placeholders) {
                text = text.replace(new RegExp(`{${p}}`, 'g'), placeholders[p]);
            }
        }
        return text;
    }

    /**
     * Returns a middleware that initializes the i18n context for each incoming update.
     */
    middleware(): Middleware<Context> {
        return async (ctx, next) => {
            const lang = ctx.from?.language_code?.substring(0, 2) || this.defaultLang;

            ctx.i18n = {
                locale: lang,
                t: (key: string, placeholders?: Record<string, string>) =>
                    this.t(lang, key, placeholders),
            };

            return next();
        };
    }
}

export interface I18nPluginOptions {
    instance?: I18n;
    defaultLang?: string;
    locales?: Record<string, Record<string, string>>;
}

/**
 * Plugin wrapper for `I18n`.
 * Optionally creates an instance, loads locales, exposes it as a service,
 * and installs the middleware.
 */
export const i18nPlugin = definePlugin<Context, I18nPluginOptions>({
    name: 'i18n',
    install(ctx) {
        const i18n = ctx.options.instance ?? new I18n(ctx.options.defaultLang);

        for (const [lang, dictionary] of Object.entries(ctx.options.locales ?? {})) {
            i18n.loadLocale(lang, dictionary);
        }

        ctx.provide('i18n', i18n);
        ctx.bot.use(i18n.middleware());
    },
});
