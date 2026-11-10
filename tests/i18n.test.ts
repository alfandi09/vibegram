import { describe, expect, it } from 'vitest';
import { I18n } from '../src/i18n';
import { createContext, createNext, makeMessageUpdate } from './helpers/mock';

describe('I18n', () => {
    it('loads dictionaries, interpolates placeholders, and falls back to default locale', () => {
        const i18n = new I18n('en');
        i18n.loadLocale('en', { greeting: 'Hello {name}', title: 'Welcome' });
        i18n.loadLocale('id', { greeting: 'Halo {name}' });

        expect(i18n.t('id', 'greeting', { name: 'Ayu' })).toBe('Halo Ayu');
        expect(i18n.t('fr', 'title')).toBe('Welcome');
        expect(i18n.t('fr', 'missing_key')).toBe('missing_key');
    });

    it('middleware sets locale from Telegram language_code and falls back to default', async () => {
        const i18n = new I18n('en');
        i18n.loadLocale('en', { greeting: 'Hello {name}' });
        i18n.loadLocale('id', { greeting: 'Halo {name}' });

        const localizedCtx = createContext(
            makeMessageUpdate('hi', {
                from: {
                    id: 42,
                    is_bot: false,
                    first_name: 'Tono',
                    language_code: 'id-ID',
                },
            })
        ).ctx;
        const fallbackCtx = createContext(
            makeMessageUpdate('hi', {
                from: {
                    id: 42,
                    is_bot: false,
                    first_name: 'Tono',
                    language_code: undefined,
                },
            })
        ).ctx;
        const { next, called } = createNext();

        await i18n.middleware()(localizedCtx, next);
        expect(called()).toBe(true);
        expect(localizedCtx.i18n?.locale).toBe('id');
        expect(localizedCtx.i18n?.t('greeting', { name: 'Tono' })).toBe('Halo Tono');

        await i18n.middleware()(fallbackCtx, async () => {});
        expect(fallbackCtx.i18n?.locale).toBe('en');
        expect(fallbackCtx.i18n?.t('greeting', { name: 'Tono' })).toBe('Hello Tono');
    });
});

describe('I18n regressions', () => {
    it('falls back per key to the default locale and inserts values literally', () => {
        const i18n = new I18n('en');
        i18n.loadLocale('en', { hi: 'Hi {name}', bye: 'Bye' });
        i18n.loadLocale('id', { hi: 'Halo {name}' });
        expect(i18n.t('id', 'bye')).toBe('Bye');
        expect(i18n.t('id', 'nope')).toBe('nope');
        expect(i18n.t('en', 'hi', { name: 'Tom$&Co' })).toBe('Hi Tom$&Co');
        expect(i18n.t('en', 'hi', { name: '{name}' })).toBe('Hi {name}');
        expect(i18n.t('id', 'hi')).toBe('Halo {name}');
    });
});
