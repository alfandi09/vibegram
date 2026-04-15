# Hono Adapter

Use `createHonoHandler()` for Hono apps running on Node.js, Bun, Deno, or edge runtimes.

```bash
npm install hono
```

```typescript
import { Hono } from 'hono';
import { Bot, createHonoHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = new Hono();

app.post(
    '/webhook',
    createHonoHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
    })
);

export default app;
```

See the full adapter matrix and response codes in [Framework Adapters](./express.md).
