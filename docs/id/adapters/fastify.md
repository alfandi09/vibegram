# Adapter Fastify

Gunakan `createFastifyPlugin()` ketika server webhook Anda berjalan di Fastify v4+.

```bash
npm install fastify
```

```typescript
import Fastify from 'fastify';
import { Bot, createFastifyPlugin } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const fastify = Fastify({ logger: true });

await fastify.register(
    createFastifyPlugin(bot, {
        path: '/webhook',
        secretToken: process.env.WEBHOOK_SECRET,
        healthPath: '/healthz',
    })
);

await bot.setWebhook('https://domain-anda.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

Lihat ringkasan semua adapter dan kode respons di [Adapter Framework](./express.md).
