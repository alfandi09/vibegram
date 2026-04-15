# Adapter Hono

Gunakan `createHonoHandler()` untuk aplikasi Hono di Node.js, Bun, Deno, atau edge runtime.

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

Lihat ringkasan semua adapter dan kode respons di [Adapter Framework](./express.md).
