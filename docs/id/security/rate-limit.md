# Rate Limiter

Middleware `rateLimit` melindungi bot Anda dari spam dan penyalahgunaan dengan membatasi berapa banyak pesan yang bisa diterima dari satu pengguna atau chat dalam jangka waktu tertentu.

## Penggunaan Dasar

```typescript
import { Bot, rateLimit } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

// Auto-tuned sesuai batas Telegram:
// - Chat privat: 1 pesan/detik
// - Chat grup: 20 pesan/menit
bot.use(rateLimit());
```

## Konfigurasi Kustom

```typescript
bot.use(rateLimit({
    // Jendela waktu dalam milidetik
    windowMs: 60_000,  // 1 menit

    // Maksimal request per jendela waktu
    limit: 10,

    // Callback saat limit terlampaui (opsional)
    onLimitExceeded: async (ctx) => {
        await ctx.reply('⚠️ Terlalu banyak permintaan! Tunggu sebentar.');
    },

    // Generator kunci kustom (opsional)
    keyGenerator: (ctx) => {
        // Batasi berdasarkan user saja (bukan chat:user)
        return ctx.from?.id?.toString();
    },
}));
```

## Opsi Konfigurasi

| Opsi | Tipe | Default | Deskripsi |
|------|------|---------|-----------|
| `windowMs` | `number` | `60_000` | Durasi jendela waktu (ms) |
| `limit` | `number` | `20` (grup) / `60` (privat) | Maksimal request per jendela |
| `onLimitExceeded` | `Function` | `undefined` | Callback saat terlimit |
| `keyGenerator` | `Function` | `'chatId_fromId'` | Fungsi pembuat kunci |

## Perilaku Default

VibeGram menggunakan limit berbeda berdasarkan tipe chat sesuai panduan resmi Telegram:

| Tipe Chat | Default Limit | Jendela |
|-----------|---------------|---------|
| Chat privat | 60 pesan | 1 menit |
| Grup/Supergroup | 20 pesan | 1 menit |
| Channel | 20 pesan | 1 menit |

## Penanganan Saat Terlimit

Tanpa callback `onLimitExceeded`, request yang melebihi limit akan **diabaikan diam-diam** (next() tidak dipanggil). Tambahkan callback untuk memberi notifikasi ke pengguna:

```typescript
bot.use(rateLimit({
    limit: 5,
    windowMs: 30_000,
    onLimitExceeded: async (ctx) => {
        // Hanya kirim pemberitahuan sekali setiap 30 detik
        await ctx.reply(
            '🚫 Anda mengirim pesan terlalu cepat.\n' +
            'Tunggu 30 detik sebelum melanjutkan.'
        );
    },
}));
```

## Kunci Generator Kustom

```typescript
// Batasi berdasarkan pengguna di semua chat
bot.use(rateLimit({
    keyGenerator: ctx => `user_${ctx.from?.id}`,
}));

// Batasi berdasarkan chat saja (semua anggota berbagi limit)
bot.use(rateLimit({
    keyGenerator: ctx => `chat_${ctx.chat?.id}`,
}));
```

## Integrasi dengan Logger

Middleware log yang dipasang sebelum `rateLimit` akan menerima semua request termasuk yang ditolak:

```typescript
bot.use(logger());       // Log semua request
bot.use(rateLimit());    // Tolak yang melebihi limit
// Handler hanya menerima request yang lolos
```
