import { describe, expect, it, vi } from 'vitest';
import { Composer } from '../src/composer';
import { Preset, createPlugin, type BotPlugin } from '../src/plugin';
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
});
