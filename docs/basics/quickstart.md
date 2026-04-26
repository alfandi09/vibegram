# Quickstart

This guide builds a small production-shaped bot: commands, middleware, session state,
error handling, and graceful shutdown.

<PackageStats />

<InstallTabs />

<SecurityNote title="Production baseline" variant="tip">
Use this guide as a minimal production shape: token from environment variables, global
error handling, rate limiting, session state, and graceful shutdown.
</SecurityNote>

<FeatureGrid title="What this quickstart covers" description="Move from package install to a running bot without skipping the safety pieces you will need later.">
  <FeatureCard title="Install and configure" description="Add the package and store bot tokens outside source control." href="/basics/installation" />
  <FeatureCard title="Compose middleware" description="Use rate limiting and session middleware before handlers." href="/core/middleware" />
  <FeatureCard title="Launch safely" description="Start polling locally, then move to webhooks for production." href="/basics/instance" />
</FeatureGrid>

## Install

```bash
npm install vibegram
```

Create a `.env` file in your application project:

```bash
BOT_TOKEN=123456:replace-me
```

Do not commit `.env` files. In production, configure the same variable in your host's
secret manager.

## Bot

```typescript
import 'dotenv/config';
import { Bot, session, rateLimit } from 'vibegram';

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN is required');
}

const bot = new Bot(token, {
    observability: {
        hooks: {
            onPollingError: ({ error }) => console.error('Polling failed', error),
            onUpdateError: ({ error }) => console.error('Update failed', error),
        },
    },
});

bot.use(rateLimit());
bot.use(session({ initial: () => ({ visits: 0 }) }));

bot.start(async ctx => {
    ctx.session.visits += 1;
    await ctx.reply(`Welcome. Visits in this chat: ${ctx.session.visits}`);
});

bot.help(ctx => ctx.reply('Send /start to test the bot.'));

bot.on('message', async ctx => {
    await ctx.reply('Message received.');
});

bot.catch(async (error, ctx) => {
    console.error('Unhandled bot error', error);
    await ctx.reply('Something went wrong. Please try again.');
});

await bot.launch();
```

## Run

```bash
npx ts-node src/bot.ts
```

For long-running deployments, run the bot under a process manager and keep logs outside
the source tree.

## Checklist

- Store secrets in environment variables.
- Register `bot.catch()` before deployment.
- Use `rateLimit()` for public bots.
- Run `npm test` and `npm run build` before releasing your own bot.
