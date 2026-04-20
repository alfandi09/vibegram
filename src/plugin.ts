import { Context } from './context';
import { Composer, Middleware } from './composer';

/**
 * Plugin interface for extending VibeGram bots with modular features.
 *
 * Usage:
 * ```typescript
 * class AnalyticsPlugin implements BotPlugin {
 *     name = 'analytics';
 *     install(bot) {
 *         bot.use(async (ctx, next) => {
 *             track(ctx.update);
 *             await next();
 *         });
 *     }
 * }
 *
 * bot.plugin(new AnalyticsPlugin());
 * ```
 */
export interface BotPlugin<C extends Context = Context> {
    /** Unique plugin identifier */
    name: string;
    /** Called when the plugin is registered on a bot */
    install(composer: Composer<C>, options?: any): void;
}

/**
 * Create a functional plugin from a middleware factory.
 *
 * Usage:
 * ```typescript
 * const myPlugin = createPlugin('greeting', (bot, opts) => {
 *     bot.command('hello', ctx => ctx.reply(opts.message));
 * });
 *
 * bot.plugin(myPlugin({ message: 'Hi!' }));
 * ```
 */
export function createPlugin<O = any, C extends Context = Context>(
    name: string,
    installer: (composer: Composer<C>, options: O) => void
): (options: O) => BotPlugin<C> {
    return (options: O) => ({
        name,
        install(composer: Composer<C>) {
            installer(composer, options);
        }
    });
}

/**
 * Preset combines multiple plugins into a single installable unit.
 *
 * Usage:
 * ```typescript
 * const productionPreset = new Preset('production', [
 *     new LoggerPlugin(),
 *     new RateLimitPlugin({ limit: 30 }),
 *     new SessionPlugin()
 * ]);
 *
 * bot.plugin(productionPreset);
 * ```
 */
export class Preset<C extends Context = Context> implements BotPlugin<C> {
    constructor(
        public readonly name: string,
        private readonly plugins: BotPlugin<C>[]
    ) {}

    install(composer: Composer<C>): void {
        for (const plugin of this.plugins) {
            plugin.install(composer);
        }
    }
}
