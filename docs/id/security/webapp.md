# Validasi WebApp

VibeGram memvalidasi `initData` Telegram Mini App menggunakan HMAC-SHA256. Ini mencegah payload yang dipalsukan atau dimanipulasi.

## Cara Kerja Autentikasi WebApp Telegram

1. Pengguna membuka Mini App di dalam Telegram
2. Mini App menerima `window.Telegram.WebApp.initData` (query string)
3. Backend Anda memvalidasi parameter `hash` terhadap token bot menggunakan HMAC-SHA256
4. Jika valid, data `user` bisa dipercaya

## Validasi via Instansi Bot

```typescript
const bot = new Bot(process.env.BOT_TOKEN!);

// Di route handler Express.js Anda:
app.post('/api/auth', (req, res) => {
    try {
        const userData = bot.validateWebAppData(req.body.initData, {
            maxAgeSeconds: 300 // Tolak data yang lebih dari 5 menit
        });
        res.json({ user: userData });
    } catch (error) {
        res.status(403).json({ error: 'initData tidak valid' });
    }
});
```

## Validasi via Utility Statis

```typescript
import { WebAppUtils } from 'vibegram';

const userData = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
    maxAgeSeconds: 300
});
```

## Contoh dengan Express + TypeScript

```typescript
import express from 'express';
import { Bot, WebAppUtils } from 'vibegram';

const app = express();
const bot = new Bot(process.env.BOT_TOKEN!);

app.use(express.json());

app.post('/api/webapp/auth', (req, res) => {
    const { initData } = req.body;

    if (!initData) {
        return res.status(400).json({ error: 'initData diperlukan' });
    }

    try {
        const data = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
            maxAgeSeconds: 600 // 10 menit
        });

        // data.user berisi info pengguna Telegram yang terverifikasi
        const user = data.user;
        console.log(`Login dari: ${user.first_name} (${user.id})`);

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.first_name,
                username: user.username,
            }
        });
    } catch (err) {
        res.status(403).json({ error: 'initData tidak valid atau kadaluwarsa' });
    }
});
```

## Detail Keamanan

- Menggunakan `crypto.timingSafeEqual()` untuk mencegah timing attack pada perbandingan hash
- Token bot bersifat privat — tidak pernah terekspos di klien WebApp
- `maxAgeSeconds` mencegah replay attack menggunakan nilai `auth_date` yang basi

## Opsi

| Opsi | Tipe | Default | Deskripsi |
|------|------|---------|-----------|
| `maxAgeSeconds` | `number` | `undefined` | Umur maksimal initData dalam detik |

## Error yang Dilempar

```typescript
import { WebAppValidationError } from 'vibegram';

try {
    WebAppUtils.validate(token, initData);
} catch (err) {
    if (err instanceof WebAppValidationError) {
        console.error('Alasan:', err.message);
        // 'Hash tidak cocok'
        // 'initData kadaluwarsa'
        // 'Hash tidak ditemukan di initData'
    }
}
```
