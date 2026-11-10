# Adapter Fastify

Dengan webhook, Telegram mengirim setiap update ke server Anda sebagai `POST` HTTPS,
bukan bot yang meminta update (polling). `createFastifyPlugin()` mendaftarkan route itu
di aplikasi Fastify v4+, memastikan request berasal dari Telegram, lalu meneruskan
update ke bot Anda.

```bash
npm install fastify
```

## Memulai Cepat

```typescript
import Fastify from 'fastify';
import { Bot, createFastifyPlugin } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Halo dari Fastify!'));

const fastify = Fastify({ logger: true });

await fastify.register(
    createFastifyPlugin(bot, {
        path: '/webhook', // route POST yang dipanggil Telegram (default: /webhook)
        secretToken: process.env.WEBHOOK_SECRET, // tolak request yang bukan dari Telegram
        healthPath: '/healthz', // route GET untuk uptime check
    })
);

await fastify.listen({ port: 3000, host: '0.0.0.0' });

// Beri tahu Telegram ke mana update dikirim (cukup sekali per deploy).
await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});
```

Jangan panggil `bot.launch()` juga: bot memakai webhook atau polling, tidak keduanya.

## Opsi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `path` | `/webhook` | Route untuk request `POST` Telegram. Harus diawali `/` |
| `secretToken` | tidak ada | Harus sama dengan `secret_token` di `setWebhook()` |
| `healthPath` | tidak ada | Menambah route `GET` yang menjawab `200 OK` |

Fastify mem-parse body JSON sendiri, jadi tidak perlu setup body parser.

## Respons

| Status | Kapan |
| --- | --- |
| `200` | Update berhasil ditangani |
| `400` | Body bukan update Telegram |
| `403` | Header secret token tidak ada atau salah |
| `500` | Ada handler yang melempar error |

Respons dikirim setelah handler Anda selesai. Telegram menunggunya dan mengirim ulang
update jika gagal atau terlalu lama, jadi buat handler tetap cepat dan pindahkan
pekerjaan lambat (seperti [broadcast](/id/advanced/queue)) keluar dari request.

Lihat semua adapter berdampingan di [Framework Adapters](/id/adapters/express).
