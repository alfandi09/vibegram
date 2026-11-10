# Adapter HTTP Native

`createNativeHandler()` melayani webhook dengan modul `http` bawaan Node, tanpa Express,
Fastify, atau Koa. Ia membaca dan memeriksa body request sendiri, jadi tidak ada yang
perlu diinstal.

## Memulai Cepat

```typescript
import http from 'node:http';
import { Bot, createNativeHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Halo dari Node.js murni!'));

const server = http.createServer(
    createNativeHandler(bot, {
        secretToken: process.env.WEBHOOK_SECRET, // tolak request yang bukan dari Telegram
        healthPath: '/healthz', // GET /healthz menjawab 200 OK
        maxBodySizeBytes: 1_000_000, // tolak body di atas 1 MB
    })
);

server.listen(3000, async () => {
    await bot.setWebhook('https://your-domain.com/webhook', {
        secret_token: process.env.WEBHOOK_SECRET,
    });
    console.log('Berjalan di :3000');
});
```

Handler ini menjawab **semua** path di server, jadi URL webhook boleh memakai path apa
pun. Pasang reverse proxy (nginx, Caddy) atau load balancer platform Anda di depannya
untuk HTTPS: Telegram hanya memanggil URL `https://`.

## Opsi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `secretToken` | tidak ada | Harus sama dengan `secret_token` di `setWebhook()` |
| `healthPath` | tidak ada | `GET` ke path ini menjawab `200 OK` |
| `maxBodySizeBytes` | `1_000_000` (1 MB) | Body yang lebih besar ditolak sebelum di-parse |

## Respons

| Status | Kapan |
| --- | --- |
| `200` | Update berhasil ditangani (atau request bukan `POST`) |
| `400` | Body bukan JSON, atau bukan update Telegram |
| `403` | Header secret token tidak ada atau salah |
| `413` | Body lebih besar dari `maxBodySizeBytes` |
| `415` | `Content-Type` bukan `application/json` |
| `500` | Ada handler yang melempar error |

Respons dikirim setelah handler Anda selesai, dan Telegram mengirim ulang update jika
gagal atau terlalu lama, jadi buat handler tetap cepat.

Lihat semua adapter berdampingan di [Framework Adapters](/id/adapters/express).
