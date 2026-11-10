import { Context } from './context';
import { Middleware } from './composer';

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
        // Per-key fallback: requested locale, then the default locale, then the raw key.
        const text = this.locales[lang]?.[key] ?? this.locales[this.defaultLang]?.[key] ?? key;
        if (!placeholders) return text;

        // Single pass with a replacer function: values are inserted literally (no `$&`
        // expansion) and a value that contains `{name}` is never substituted again.
        return text.replace(/\{([^{}]+)\}/g, (match, name: string) =>
            Object.prototype.hasOwnProperty.call(placeholders, name) ? String(placeholders[name]) : match
        );
    }

    /**
     * Returns a middleware that initializes the i18n context for each incoming update.
     */
    middleware(): Middleware<Context> {
        return async (ctx, next) => {
            // Detect the user's language from Telegram metadata, falling back to the default.
            const lang = ctx.from?.language_code?.substring(0, 2) || this.defaultLang;

            ctx.i18n = {
                locale: lang,
                t: (key: string, placeholders?: Record<string, string>) => this.t(lang, key, placeholders)
            };

            return next();
        };
    }
}
