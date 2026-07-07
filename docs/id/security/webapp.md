# Validasi WebApp

VibeGram memvalidasi `initData` Telegram Mini App memakai HMAC-SHA256. Ini
mencegah payload palsu atau hasil manipulasi diterima oleh backend.

## Cara Kerja Autentikasi WebApp Telegram

1. User membuka Mini App di dalam Telegram.
2. Mini App menerima `window.Telegram.WebApp.initData`.
3. Backend memvalidasi parameter `hash` terhadap token bot.
4. Jika validasi berhasil, data `user` yang sudah diparse bisa dipercaya dalam
   batas freshness yang dikonfigurasi.

## Validasi via Instansi Bot

```ts
const bot = new Bot(process.env.BOT_TOKEN!);

app.post('/api/auth', (req, res) => {
    try {
        const data = bot.validateWebAppData(req.body.initData, {
            maxAgeSeconds: 300,
        });

        res.json({ user: data.user });
    } catch {
        res.status(403).json({ error: 'initData tidak valid' });
    }
});
```

## Validasi via Utility Statis

```ts
import { WebAppUtils } from 'vibegram';

const data = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
    maxAgeSeconds: 300,
});
```

## Contoh Express dan TypeScript

```ts
import express from 'express';
import { WebAppUtils } from 'vibegram';

const app = express();

app.use(express.json({ limit: '64kb' }));

app.post('/api/webapp/auth', (req, res) => {
    const initData = req.body?.initData;
    if (typeof initData !== 'string') {
        return res.status(400).json({ error: 'initData wajib diisi' });
    }

    try {
        const data = WebAppUtils.validate(process.env.BOT_TOKEN!, initData, {
            maxAgeSeconds: 600,
        });

        return res.json({
            user: data.user,
        });
    } catch {
        return res.status(403).json({ error: 'initData tidak valid atau kadaluwarsa' });
    }
});
```

Gunakan body limit JSON kecil untuk endpoint auth. `initData` adalah query
string ringkas, jadi body besar patut dicurigai.

## Detail Keamanan

- Memakai `crypto.timingSafeEqual()` untuk perbandingan hash constant-time.
- Menurunkan secret key WebApp dari token bot dengan skema HMAC `WebAppData`
  Telegram.
- Mewajibkan parameter `hash` dan timestamp `auth_date` valid.
- Menolak hash malformed dan nilai `auth_date` dari masa depan.
- `maxAgeSeconds` membatasi replay memakai `auth_date` lama.
- Token bot harus tetap di server dan tidak boleh dikirim ke Mini App.

## Opsi

| Opsi | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `maxAgeSeconds` | `number` | `86400` | Umur maksimum `auth_date` yang diterima, dalam detik. |

`maxAgeSeconds` harus positive integer.

## Error yang Dilempar

```ts
import { WebAppValidationError, WebAppUtils } from 'vibegram';

try {
    WebAppUtils.validate(token, initData);
} catch (error) {
    if (error instanceof WebAppValidationError) {
        console.error(error.message);
    }
}
```

Kegagalan validasi melempar `WebAppValidationError`. Kembalikan respons 403
generik ke client dan simpan detail error di log server.
