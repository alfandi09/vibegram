# Adapter HTTP Native

Gunakan `createNativeHandler()` ketika Anda ingin endpoint webhook tanpa Express, Fastify, atau Koa.

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

Adapter native hanya menerima request `application/json` dan menolak body yang terlalu besar sebelum parsing.

Lihat ringkasan semua adapter dan kode respons di [Adapter Framework](./express.md).
