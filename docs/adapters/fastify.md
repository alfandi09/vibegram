# Fastify Adapter

Use `createFastifyPlugin()` when your webhook server runs on Fastify v4+.

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
    })
);

await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});

await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

See the full adapter matrix and response codes in [Framework Adapters](./express.md).
