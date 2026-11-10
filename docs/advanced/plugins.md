# Plugin System

<FeatureGrid title="Plugin composition" description="Package middleware, commands, handlers, and lifecycle hooks into reusable units.">
  <FeatureCard title="Install plugins" description="Mount plugin classes or functions through `bot.plugin()`." href="#quick-start" />
  <FeatureCard title="Reusable features" description="Share analytics, auth, logging, or domain behavior across bots." href="#creating-a-reusable-plugin" />
  <FeatureCard title="Plugin vs middleware" description="Know when to reach for a plugin instead of plain middleware." href="#plugin-vs-middleware" />
</FeatureGrid>

A plugin is a named bundle of setup code: it registers middleware, commands, and
handlers on your bot in one call. Write one when the same feature (analytics, an admin
panel, a support command) should be shared between bots or published as a package.

For a single middleware used in one bot, plain `bot.use()` is enough.

## Quick Start

A plugin is any object with a `name` and an `install(bot)` method:

```typescript
import { Bot, type BotPlugin, type Composer, type Context } from 'vibegram';

class WelcomePlugin implements BotPlugin {
    name = 'welcome';

    install(bot: Composer<Context>) {
        bot.command('welcome', ctx => ctx.reply('Welcome!'));
    }
}

const bot = new Bot(process.env.BOT_TOKEN!);
bot.plugin(new WelcomePlugin());
```

`bot.plugin()` calls `install()` right away, so the plugin's handlers sit **at that
point** in the middleware order, exactly as if you had written them there. Install
plugins that add middleware (logging, sessions) before your handlers.

## Plugin Interface

```typescript
interface BotPlugin<C extends Context = Context> {
    /** Identifies the plugin, for example in logs. */
    name: string;
    /** Registers the plugin's middleware and handlers. */
    install(composer: Composer<C>): void;
}
```

## Functional Plugins

`createPlugin(name, installer)` returns a factory, which is the simplest way to make a
plugin configurable:

```typescript
import { createPlugin } from 'vibegram';

const greeting = createPlugin<{ message: string }>('greeting', (bot, options) => {
    bot.command('greet', ctx => ctx.reply(options.message));
});

bot.plugin(greeting({ message: 'Hello from a plugin!' }));
```

## Presets

A `Preset` installs several plugins in order with one call. Wrap the built-in
middleware with `createPlugin()` to bundle your standard setup:

```typescript
import { createPlugin, dedupeUpdates, logger, Preset, rateLimit, session } from 'vibegram';

const baseline = createPlugin<{ requestsPerSecond: number }>('baseline', (bot, options) => {
    bot.use(logger());
    bot.use(dedupeUpdates()); // ignore updates Telegram delivers twice
    bot.use(rateLimit({ windowMs: 1000, limit: options.requestsPerSecond }));
    bot.use(session());
});

const production = new Preset('production', [
    baseline({ requestsPerSecond: 2 }),
    new WelcomePlugin(),
]);

bot.plugin(production);
```

## Creating a Reusable Plugin

This plugin measures how long each update takes and reports it. Because it wraps
`await next()`, everything registered after it is inside the timing:

```typescript
// analytics-plugin.ts
import type { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private readonly endpoint: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();

            // Fire and forget: a slow analytics service must not slow the bot down.
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    updateType: ctx.updateType,
                    userId: ctx.from?.id,
                    durationMs: Date.now() - start,
                }),
            }).catch(() => {});
        });
    }
}

// bot.ts
bot.plugin(new AnalyticsPlugin('https://analytics.example.com/events'));
```

To publish a plugin, put `vibegram` in `peerDependencies` so it uses the bot's own
copy. The official `@vibegram/*` plugins follow this layout; see
[Plugin Development](/plugins/development).

## Plugin vs Middleware

| | Middleware | Plugin |
| --- | --- | --- |
| What it is | One `(ctx, next)` function | A named setup step that can add many handlers |
| Configuration | Closure arguments | Constructor or `createPlugin()` options |
| Reuse | Copy the function | Import and `bot.plugin(...)` |
| Bundling | Manual `bot.use()` calls | `Preset` installs several in order |
| Publishing | Possible, but loose | A natural npm package |
