# Plugin System

VibeGram's plugin system enables modular feature composition. Plugins encapsulate middleware, commands, handlers, and shared services into reusable installable units.

## Quick Start

```typescript
import { Bot, definePlugin } from 'vibegram';

const welcomePlugin = definePlugin({
    name: 'welcome',
    install(ctx) {
        ctx.bot.command('welcome', ctx => ctx.reply('Welcome!'));
    },
});

const bot = new Bot('YOUR_BOT_TOKEN');
bot.plugin(welcomePlugin());
```

## Supported Styles

VibeGram currently supports two plugin authoring styles:

- Legacy plugins via `BotPlugin`
- Definition-based plugins via `definePlugin()`

For new plugins, prefer `definePlugin()` because it supports dependencies, shared services, and lifecycle hooks.

## Legacy Interface

```typescript
interface BotPlugin<C extends Context = Context> {
    name: string;
    install(composer: Composer<C>, options?: any): void;
}
```

## Definition-Based Plugins

Use `definePlugin()` for new plugins:

```typescript
import { definePlugin } from 'vibegram';

const greetingPlugin = definePlugin({
    name: 'greeting',
    defaults: { message: 'Hello' },
    install(ctx) {
        ctx.bot.command('greet', ctx => ctx.reply(ctx.options.message));
    },
});

bot.plugin(greetingPlugin({ message: 'Hello from plugin!' }));
```

## Functional Legacy Helpers

Use `createPlugin()` if you want the older lightweight helper shape:

```typescript
import { createPlugin } from 'vibegram';

const legacyGreetingPlugin = createPlugin('legacy-greeting', (bot, opts: { message: string }) => {
    bot.command('legacy-greet', ctx => ctx.reply(opts.message));
});

bot.plugin(legacyGreetingPlugin({ message: 'Hello from legacy plugin!' }));
```

## Plugin Context

Definition-based plugins receive a `PluginContext`:

```typescript
interface PluginContext<C extends Context = Context, O extends object = {}> {
    bot: Bot<C>;
    composer: Composer<C>;
    options: Readonly<O>;
    metadata: RegisteredPluginMetadata;
    services: PluginServiceRegistry;
    provide<T>(key: string, value: T): void;
    require<T>(key: string): T;
    has(key: string): boolean;
}
```

## Dependencies and Services

Plugins can depend on other plugins and exchange services through the registry:

```typescript
import { definePlugin } from 'vibegram';

const cachePlugin = definePlugin({
    name: 'cache',
    install(ctx) {
        ctx.provide('cache-store', new Map());
    },
});

const featurePlugin = definePlugin({
    name: 'feature',
    dependencies: [{ name: 'cache' }],
    install(ctx) {
        const store = ctx.require<Map<string, string>>('cache-store');
        store.set('ready', 'yes');
    },
});

bot.plugin(cachePlugin());
bot.plugin(featurePlugin());
```

## Lifecycle

Use `setup()` for startup work and `teardown()` for cleanup:

```typescript
const workerPlugin = definePlugin({
    name: 'worker',
    install() {},
    async setup(ctx) {
        ctx.provide('worker-status', { running: true });
    },
    async teardown() {
        // Close connections, stop workers, flush buffers, and so on.
    },
});
```

Call lifecycle explicitly without starting polling:

```typescript
await bot.initializePlugins();
await bot.teardownPlugins();
```

## Presets

Combine multiple plugins into a single installable preset:

```typescript
import { Preset, loggerPlugin, rateLimitPlugin, sessionPlugin } from 'vibegram';

const productionPreset = new Preset('production', [
    loggerPlugin(),
    rateLimitPlugin({ limit: 30 }),
    sessionPlugin(),
]);

bot.plugin(productionPreset);
```

## First-Party Plugin Wrappers

These wrappers are currently available for the new plugin API:

- `loggerPlugin(options?)`
- `rateLimitPlugin(options?)`
- `i18nPlugin(options?)`
- `sessionPlugin(options?)`

Example:

```typescript
import { Bot, i18nPlugin, loggerPlugin, sessionPlugin } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.plugin(loggerPlugin());
bot.plugin(
    i18nPlugin({
        defaultLang: 'en',
        locales: {
            en: { welcome: 'Welcome' },
        },
    })
);
bot.plugin(sessionPlugin({ initial: () => ({ count: 0 }) }));
```

## Creating a Reusable Legacy Plugin

```typescript
import { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private webhookUrl: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const duration = Date.now() - start;

            fetch(this.webhookUrl, {
                method: 'POST',
                body: JSON.stringify({
                    updateType: Object.keys(ctx.update).filter(k => k !== 'update_id'),
                    userId: ctx.from?.id,
                    duration,
                }),
            }).catch(() => {});
        });
    }
}

bot.plugin(new AnalyticsPlugin('https://analytics.example.com/events'));
```

## Current Recommendation

- Use `definePlugin()` for new plugin work.
- Keep `createPlugin()` and class-based `BotPlugin` for compatibility or very small helpers.
- Use services for cross-plugin integration instead of importing private internals from another plugin.

## Plugin vs Middleware

| Feature | Middleware | Plugin |
|---------|-----------|--------|
| Scope | Single function | Group of middleware, commands, and services |
| Configuration | Closure/options | Plugin definition, factory, or class |
| Reusability | Copy/paste | Import and install |
| Composition | Manual ordering | Dependencies and presets |
| Publishing | N/A | Publishable as npm packages |
