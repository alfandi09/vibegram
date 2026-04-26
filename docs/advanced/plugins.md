# Plugin System

<FeatureGrid title="Plugin composition" description="Package middleware, commands, handlers, and lifecycle hooks into reusable units.">
  <FeatureCard title="Install plugins" description="Mount plugin classes or functions through `bot.plugin()`." href="#installing-plugins" />
  <FeatureCard title="Reusable features" description="Share analytics, auth, logging, or domain behavior across bots." href="#creating-plugins" />
  <FeatureCard title="Typed options" description="Keep plugin configuration explicit and easy to validate." href="#plugin-options" />
</FeatureGrid>

VibeGram's plugin system enables modular feature composition. Plugins encapsulate middleware, commands, and handlers into reusable, installable units.

## Quick Start

```typescript
import { Bot, BotPlugin } from 'vibegram';

// Class-based plugin
class WelcomePlugin implements BotPlugin {
    name = 'welcome';

    install(bot) {
        bot.command('welcome', ctx => ctx.reply('Welcome!'));
    }
}

const bot = new Bot('YOUR_BOT_TOKEN');
bot.plugin(new WelcomePlugin());
```

## Plugin Interface

```typescript
interface BotPlugin<C extends Context = Context> {
    name: string;
    install(composer: Composer<C>, options?: any): void;
}
```

## Functional Plugins

Use `createPlugin()` for simpler, configurable plugins:

```typescript
import { createPlugin } from 'vibegram';

const greetingPlugin = createPlugin('greeting', (bot, opts: { message: string }) => {
    bot.command('greet', ctx => ctx.reply(opts.message));
});

// Install with options
bot.plugin(greetingPlugin({ message: 'Hello from plugin!' }));
```

## Presets

Combine multiple plugins into a single installable preset:

```typescript
import { Preset } from 'vibegram';

const productionPreset = new Preset('production', [
    new LoggerPlugin(),
    new RateLimitPlugin({ limit: 30 }),
    new SessionPlugin(),
    new CachePlugin({ ttl: 300 }),
]);

bot.plugin(productionPreset);
```

## Creating a Reusable Plugin

```typescript
// my-analytics-plugin.ts
import { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private webhookUrl: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const duration = Date.now() - start;

            // Send analytics to your service
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

// Usage
bot.plugin(new AnalyticsPlugin('https://analytics.example.com/events'));
```

## Plugin vs Middleware

| Feature       | Middleware      | Plugin                         |
| ------------- | --------------- | ------------------------------ |
| Scope         | Single function | Group of middleware + commands |
| Configuration | Closure/options | Constructor or factory         |
| Reusability   | Copy/paste      | Import and install             |
| Composition   | Manual ordering | Presets combine automatically  |
| Publishing    | N/A             | Publishable as npm packages    |
