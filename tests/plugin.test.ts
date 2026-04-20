import { describe, expect, it, vi } from 'vitest';
import { Bot } from '../src/bot';
import { Composer } from '../src/composer';
import { i18nPlugin } from '../src/i18n';
import { MemoryRateLimitStore, rateLimitPlugin } from '../src/ratelimit';
import { sessionPlugin } from '../src/session';
import {
    PluginDependencyError,
    PluginDuplicateError,
    PluginServiceError,
    Preset,
    createPlugin,
    definePlugin,
    type BotPlugin,
} from '../src/plugin';
import { createContext, createNext, makeMessageUpdate } from './helpers/mock';

describe('plugin helpers', () => {
    it('createPlugin() preserves name and applies installer options', async () => {
        const composer = new Composer();
        const installer = vi.fn((target: Composer<any>, options: { reply: string }) => {
            target.use(async (ctx, next) => {
                await ctx.reply(options.reply);
                await next();
            });
        });

        const plugin = createPlugin('greeter', installer)({ reply: 'hello' });
        plugin.install(composer);

        const { ctx, client } = createContext(makeMessageUpdate('start'));
        const { next } = createNext();
        await composer.middleware()(ctx as any, next);

        expect(plugin.name).toBe('greeter');
        expect(installer).toHaveBeenCalledWith(composer, { reply: 'hello' });
        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({ text: 'hello' })
        );
    });

    it('Preset installs every plugin in order', () => {
        const composer = new Composer();
        const calls: string[] = [];
        const first: BotPlugin = {
            name: 'first',
            install: () => {
                calls.push('first');
            },
        };
        const second: BotPlugin = {
            name: 'second',
            install: () => {
                calls.push('second');
            },
        };

        new Preset('bundle', [first, second]).install(composer);

        expect(calls).toEqual(['first', 'second']);
    });

    it('definition plugins receive resolved options and metadata through bot.plugin()', () => {
        const bot = new Bot('test-token');
        const install = vi.fn();
        const greeter = definePlugin({
            name: 'greeter',
            version: '1.0.0',
            defaults: { reply: 'hi' },
            install,
        });

        bot.plugin(greeter({ reply: 'hello' }));

        expect(install).toHaveBeenCalledWith(
            expect.objectContaining({
                bot,
                composer: bot,
                options: { reply: 'hello' },
                metadata: expect.objectContaining({
                    name: 'greeter',
                    version: '1.0.0',
                    kind: 'definition',
                }),
            })
        );
        expect(bot.hasPlugin('greeter')).toBe(true);
        expect(bot.getPlugin('greeter')).toEqual({
            name: 'greeter',
            version: '1.0.0',
            dependencies: [],
            kind: 'definition',
        });
    });

    it('rejects duplicate plugin names', () => {
        const bot = new Bot('test-token');
        const duplicate = definePlugin({
            name: 'dup',
            install: () => {},
        });

        bot.plugin(duplicate());

        expect(() => bot.plugin(duplicate())).toThrowError(PluginDuplicateError);
    });

    it('rejects missing required dependencies', () => {
        const bot = new Bot('test-token');
        const feature = definePlugin({
            name: 'feature',
            dependencies: [{ name: 'cache' }],
            install: () => {},
        });

        expect(() => bot.plugin(feature())).toThrowError(PluginDependencyError);
    });

    it('sorts definition-based preset plugins by dependency order on Bot', () => {
        const bot = new Bot('test-token');
        const calls: string[] = [];
        const cache = definePlugin({
            name: 'cache',
            install: () => {
                calls.push('cache');
            },
        });
        const feature = definePlugin({
            name: 'feature',
            dependencies: [{ name: 'cache' }],
            install: () => {
                calls.push('feature');
            },
        });

        bot.plugin(new Preset('bundle', [feature(), cache()]));

        expect(calls).toEqual(['cache', 'feature']);
        expect(bot.listPlugins().map(plugin => plugin.name)).toEqual(['bundle', 'cache', 'feature']);
    });

    it('shares services between definition plugins', async () => {
        const bot = new Bot('test-token');
        const installCalls: string[] = [];

        const cache = definePlugin({
            name: 'cache',
            install(ctx) {
                ctx.provide('cache-store', { driver: 'memory' });
                installCalls.push('cache');
            },
        });
        const feature = definePlugin({
            name: 'feature',
            dependencies: [{ name: 'cache' }],
            install(ctx) {
                const store = ctx.require<{ driver: string }>('cache-store');
                installCalls.push(store.driver);
            },
        });

        bot.plugin(cache());
        bot.plugin(feature());

        expect(installCalls).toEqual(['cache', 'memory']);
    });

    it('rejects duplicate service keys', () => {
        const bot = new Bot('test-token');
        const first = definePlugin({
            name: 'first',
            install(ctx) {
                ctx.provide('shared', 1);
            },
        });
        const second = definePlugin({
            name: 'second',
            install(ctx) {
                ctx.provide('shared', 2);
            },
        });

        bot.plugin(first());
        expect(() => bot.plugin(second())).toThrowError(PluginServiceError);
    });

    it('runs setup and teardown in dependency-aware order', async () => {
        const bot = new Bot('test-token');
        const calls: string[] = [];
        const cache = definePlugin({
            name: 'cache',
            setup(ctx) {
                calls.push('cache:setup');
                ctx.provide('cache-store', { driver: 'memory' });
            },
            teardown() {
                calls.push('cache:teardown');
            },
            install() {},
        });
        const feature = definePlugin({
            name: 'feature',
            dependencies: [{ name: 'cache' }],
            setup(ctx) {
                const store = ctx.require<{ driver: string }>('cache-store');
                calls.push(`feature:setup:${store.driver}`);
            },
            teardown() {
                calls.push('feature:teardown');
            },
            install() {},
        });

        bot.plugin(cache());
        bot.plugin(feature());

        await bot.initializePlugins();
        await bot.teardownPlugins();

        expect(calls).toEqual([
            'cache:setup',
            'feature:setup:memory',
            'feature:teardown',
            'cache:teardown',
        ]);
    });

    it('rateLimitPlugin exposes its store service and clears it on teardown', async () => {
        const bot = new Bot('test-token');
        const store = new MemoryRateLimitStore();
        let storeAvailable = false;

        const inspector = definePlugin({
            name: 'rate-limit-inspector',
            dependencies: [{ name: 'rate-limit' }],
            install(ctx) {
                const injectedStore = ctx.require<MemoryRateLimitStore>('rate-limit-store');
                storeAvailable = injectedStore === store;
            },
        });

        bot.plugin(rateLimitPlugin({ store, windowMs: 1000, limit: 1, cleanupIntervalMs: 5000 }));
        bot.plugin(inspector());

        await bot.handleUpdate(makeMessageUpdate('first'));
        expect(storeAvailable).toBe(true);
        expect([...store.entries()].length).toBe(1);

        await bot.initializePlugins();
        await bot.teardownPlugins();

        expect([...store.entries()].length).toBe(0);
    });

    it('i18nPlugin installs middleware and exposes translations', async () => {
        const bot = new Bot('test-token');
        let translated = '';

        bot.plugin(i18nPlugin({
            defaultLang: 'en',
            locales: {
                en: { greeting: 'Hello' },
            },
        }));
        bot.use(async (ctx, next) => {
            translated = ctx.i18n?.t('greeting') ?? '';
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('hello'));

        expect(translated).toBe('Hello');
        expect(bot.hasPlugin('i18n')).toBe(true);
    });

    it('sessionPlugin installs session middleware with persistent state', async () => {
        const bot = new Bot('test-token');
        const seenCounts: number[] = [];
        let storeShape: string | undefined;

        const inspector = definePlugin({
            name: 'session-inspector',
            dependencies: [{ name: 'session' }],
            install(ctx) {
                const store = ctx.require<{ get: unknown }>('session-store');
                storeShape = typeof store.get;
            },
        });

        bot.plugin(sessionPlugin({
            initial: () => ({ count: 0 }),
        }));
        bot.plugin(inspector());
        bot.use(async (ctx, next) => {
            ctx.session.count += 1;
            seenCounts.push(ctx.session.count);
            await next();
        });

        await bot.handleUpdate(makeMessageUpdate('first'));
        await bot.handleUpdate(makeMessageUpdate('second'));

        expect(seenCounts).toEqual([1, 2]);
        expect(bot.hasPlugin('session')).toBe(true);
        expect(storeShape).toBe('function');
    });
});
