# Deployment

<FeatureGrid title="Pilihan deployment" description="Gunakan polling untuk worker persistent dan webhook saat platform menyediakan URL HTTPS publik.">
  <FeatureCard title="Worker polling" description="Railway, Render, VPS, atau proses Node.js jangka panjang." href="#polling" cta="Buka polling" />
  <FeatureCard title="Server webhook" description="Express atau server berbasis adapter dengan endpoint HTTPS publik." href="#webhook-express" cta="Buka webhook" />
  <FeatureCard title="Keamanan release" description="Jalankan validasi lokal dan jaga secret tetap di luar log maupun source control." href="#checklist" cta="Buka checklist" />
</FeatureGrid>

<SecurityNote title="Keamanan deployment" variant="warning">
Jalankan lint, typecheck, test, dan build sebelum deploy produksi. Untuk webhook, wajibkan
HTTPS dan secret token Telegram.
</SecurityNote>

VibeGram bisa berjalan dengan polling pada proses Node.js yang persistent atau webhook
melalui adapter framework.

## Polling

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.start(ctx => ctx.reply('Bot berjalan'));
bot.catch(error => console.error(error));

await bot.launch();
```

## Webhook Express

```typescript
import express from 'express';
import { Bot, createExpressMiddleware } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const app = express();

app.use(express.json());
app.post(
    '/webhook',
    createExpressMiddleware(bot, {
        secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    })
);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

await bot.setWebhook(`${process.env.PUBLIC_URL}/webhook`, {
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
});

app.listen(Number(process.env.PORT || 3000));
```

## Checklist

- Gunakan HTTPS untuk webhook.
- Set secret token webhook Telegram.
- Jangan log token bot.
- Jalankan lint, typecheck, test, dan build sebelum release.
