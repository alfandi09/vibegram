# Job Queue & Broadcasting

<SecurityNote title="Broadcast responsibly" variant="tip">
Queue broadcasts and background work so one slow Telegram API call does not block update
handling or exceed platform limits.
</SecurityNote>

<FeatureGrid title="Queue use cases" description="Use the queue when work should be rate-limited, retried, or decoupled from an incoming update.">
  <FeatureCard title="Broadcasting" description="Send messages to many users without hitting Telegram rate limits." href="#broadcasting" />
  <FeatureCard title="Scheduling" description="Run one-off or recurring jobs outside the update handler." href="#scheduling" />
  <FeatureCard title="Rate limit strategy" description="Tune concurrency and delays to stay within platform limits." href="#rate-limit-strategy" />
</FeatureGrid>

The `BotQueue` provides rate-limited mass broadcasting and task scheduling — essential for bots that need to send messages to thousands of users without hitting Telegram's rate limits.

## Quick Start

```typescript
import { Bot, BotQueue } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const queue = new BotQueue(bot.client, {
    concurrency: 25, // 25 messages per batch
    delayMs: 1000, // 1 second between batches
});
```

## Broadcasting

### Send to Multiple Users

```typescript
const userIds = [123456, 789012, 345678 /* ... thousands */];

const result = await queue.broadcastMessage(userIds, '📢 Important update!', {
    parse_mode: 'HTML',
});

console.log(`✅ ${result.success} sent, ❌ ${result.failed} failed, ⏱️ ${result.durationMs}ms`);
```

### Custom Broadcast Logic

```typescript
const result = await queue.broadcast(userIds, async chatId => {
    await bot.callApi('sendPhoto', {
        chat_id: chatId,
        photo: 'https://example.com/promo.jpg',
        caption: 'Special offer!',
    });
});
```

### Progress Tracking

```typescript
const queue = new BotQueue(bot.client, {
    concurrency: 30,
    delayMs: 1000,
    onProgress: (completed, total) => {
        console.log(`Progress: ${completed}/${total} (${Math.round((completed / total) * 100)}%)`);
    },
    onError: (err, chatId) => {
        console.error(`Failed for ${chatId}: ${err.message}`);
    },
});
```

## Broadcast Result

```typescript
interface BroadcastResult {
    total: number; // Total recipients
    success: number; // Successfully sent
    failed: number; // Failed to send
    errors: Array<{
        // Detailed error list
        chatId: number | string;
        error: Error;
    }>;
    durationMs: number; // Total time elapsed
}
```

## Scheduling

### Recurring Jobs

```typescript
// Runs every 24 hours (the interval is in milliseconds)
queue.scheduleInterval('daily_tip', 24 * 60 * 60 * 1000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: '@my_channel',
        text: 'Daily tip: Stay hydrated! 💧',
    });
});
```

### One-Time Delayed Jobs

```typescript
// Execute once after 5 minutes
queue.scheduleOnce('reminder', 300000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: userId,
        text: 'Reminder: Your session expires soon!',
    });
});
```

### Cancel Jobs

```typescript
queue.cancelScheduled('daily_tip'); // Cancel by ID
queue.cancelAllScheduled(); // Cancel all jobs
```

## API Reference

| Method                                      | Description                         |
| ------------------------------------------- | ----------------------------------- |
| `queue.broadcast(ids, fn, opts?)`           | Custom broadcast with rate limiting |
| `queue.broadcastMessage(ids, text, extra?)` | Send text to many users             |
| `queue.scheduleInterval(id, ms, fn)`        | Recurring scheduled job             |
| `queue.scheduleOnce(id, ms, fn)`            | One-time delayed job                |
| `queue.cancelScheduled(id)`                 | Cancel a job by ID                  |
| `queue.cancelAllScheduled()`                | Cancel all jobs                     |
| `queue.stopBroadcast()`                     | Abort a running broadcast           |
| `queue.activeJobs`                          | Count of active scheduled jobs      |

## Handling Failed Sends

At scale, some sends always fail: users block the bot (`403 Forbidden`), delete their
account, or never started a chat with it. The result lists every failure, so you can
stop messaging those users:

```typescript
import { TelegramApiError } from 'vibegram';

const result = await queue.broadcastMessage(userIds, 'New feature is live!');

const unreachable = result.errors
    .filter(({ error }) => error instanceof TelegramApiError && error.errorCode === 403)
    .map(({ chatId }) => chatId);

await db.users.markInactive(unreachable); // skip them next time
```

A `429 Too Many Requests` is retried automatically by the client (up to 3 times,
waiting the time Telegram asks for), so it only shows up here if it keeps happening.
Lower `concurrency` or raise `delayMs` if you see it.

## Limitations

`BotQueue` keeps everything **in the process's memory**:

- Scheduled jobs disappear when the bot restarts or redeploys. Recreate them on startup.
- With **several bot instances**, every instance runs its own copy of each job, so a
  "daily tip" would be sent once per instance. Run scheduled jobs in a single instance,
  or use an external scheduler (cron, a job queue such as BullMQ) for multi-instance
  deployments.
- On serverless platforms (Cloudflare Workers, Vercel), the process does not live long
  enough for timers. Use the platform's cron triggers instead.
- A broadcast to 100 000 users at the default rate takes about an hour. Start it
  outside the update handler (for example from an admin command without `await`, or a
  separate script) so the bot keeps answering other users.

## Rate Limit Strategy

The queue processes messages in batches:

1. Send `concurrency` messages simultaneously (default: 25)
2. Wait `delayMs` milliseconds (default: 1000)
3. Repeat until all messages are sent

This stays well within Telegram's limit of ~30 messages/second, preventing 429 errors.

::: warning
Always handle `onError` in production — users may block the bot, chats may be deleted, etc. Failed sends are normal at scale.
:::
