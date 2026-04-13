import { Bot, session, SessionStore, I18n } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// ======== 1. EXTERNAL SESSION STORE ADAPTER ========
// Illustrative example of a Redis adapter implementation.
class RedisSessionAdapter implements SessionStore {
    private redisMockDb = new Map<string, string>();

    async get(key: string) {
        const raw = this.redisMockDb.get(key);
        return raw ? JSON.parse(raw) : undefined;
    }

    async set(key: string, value: any) {
        this.redisMockDb.set(key, JSON.stringify(value));
        console.log('[REDIS MOCK] Persisting session to external store:', value);
    }

    async delete(key: string) {
        this.redisMockDb.delete(key);
    }
}

// Inject the external adapter into the session middleware
bot.use(session({ store: new RedisSessionAdapter() }));


// ======== 2. INTERNATIONALIZATION (I18N) ========
const i18n = new I18n('en');
i18n.loadLocale('en', {
    'welcome': 'Welcome {name}! Good to see you.',
    'bye': 'Goodbye!'
});
i18n.loadLocale('id', {
    'welcome': 'Selamat datang {name}! Senang bertemu denganmu.',
    'bye': 'Sampai jumpa!'
});

bot.use(i18n.middleware());

bot.command('start', async (ctx) => {
    // Automatically translates based on the user's Telegram client language
    const greeting = ctx.i18n!.t('welcome', { name: ctx.from?.first_name || 'Guest' });
    await ctx.reply(greeting);
});

bot.launch().then(() => console.log('Multiplatform demo bot running.'));
