# Native HTTP Adapter

Use `createNativeHandler()` when you want a webhook endpoint without Express, Fastify, or Koa.

```typescript
import http from 'http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET,
        maxBodySizeBytes: 1_000_000,
    })
).listen(3000, () => {
    console.log('Listening on :3000');
});
```

The native adapter accepts only `application/json` requests and rejects oversized bodies before parsing.

See the full adapter matrix and response codes in [Framework Adapters](./express.md).
