# Adapter Hono

Dengan webhook, Telegram mengirim setiap update ke server Anda sebagai `POST` HTTPS.
`createHonoHandler()` mengubah request itu menjadi update bot di aplikasi Hono, baik di
Node.js, Bun, Deno, maupun runtime edge seperti Cloudflare Workers.

```bash
npm install hono
```

## Memulai Cepat

```typescript
import { Hono } from 'hono';
import { Bot, createHonoHandler } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.command('start', ctx => ctx.reply('Halo dari Hono!'));

const app = new Hono();
const webhook = createHonoHandler(bot, {
    secretToken: process.env.WEBHOOK_SECRET, // tolak request yang bukan dari Telegram
    healthPath: '/healthz',
});

app.post('/webhook', webhook); // update dari Telegram
app.get('/healthz', webhook); // uptime check dijawab 200 OK

export default app;
```

Berbeda dengan plugin Fastify, handler ini tidak mendaftarkan route sendiri: Anda memilih
path dengan `app.post()`. Pasang juga di route `healthPath` jika ingin health check.
Lalu arahkan Telegram ke URL tersebut sekali:

```typescript
await bot.setWebhook('https://your-domain.com/webhook', {
    secret_token: process.env.WEBHOOK_SECRET,
});
```

## Opsi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `secretToken` | tidak ada | Harus sama dengan `secret_token` di `setWebhook()` |
| `healthPath` | tidak ada | `GET` ke path ini menjawab `200 OK` tanpa menyentuh bot |

## Respons

| Status | Kapan |
| --- | --- |
| `200` | Update berhasil ditangani |
| `400` | Body bukan JSON, atau bukan update Telegram |
| `403` | Header secret token tidak ada atau salah |
| `500` | Ada handler yang melempar error |

Respons dikirim setelah handler Anda selesai, dan Telegram mengirim ulang update jika
gagal atau terlalu lama. Di runtime edge dengan batas waktu pendek, buat handler tetap
cepat.

Tanpa Hono, pakai [`createFetchHandler()`](/id/adapters/fetch) langsung di Workers,
Deno, Bun, atau Next.js; adapter itu juga bisa menjawab Telegram lebih dulu lalu
menyelesaikan pekerjaan setelahnya. Lihat semua adapter berdampingan di
[Framework Adapters](/id/adapters/express).
