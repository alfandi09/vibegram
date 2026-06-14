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
| `windowMs` | `number` | Auto | Durasi jendela waktu (ms): 1000 privat, 60000 grup |
| `limit` | `number` | Auto | Maksimal request per jendela: 1 privat, 20 grup |
| `keyGenerator` | `(ctx) => string \| undefined` | `'chatId_fromId'` | Fungsi pembuat kunci |
| `onLimitExceeded` | `(ctx, next) => void` | Abaikan diam-diam | Callback saat limit terlampaui |
| `store` | `RateLimitStore` | In-memory | Store eksternal untuk berbagi counter antar proses |
| `strictMode` | `boolean` | `false` | Blokir update tanpa kunci yang bisa di-resolve (alih-alih diteruskan) |

## Perilaku Default

Tanpa opsi, rate limiter menerapkan batas resmi Telegram berdasarkan tipe chat:

| Tipe Chat | Default Limit | Jendela |
|-----------|---------------|---------|
| Chat privat | 1 pesan | 1 detik |
| Grup/Supergroup | 20 pesan | 1 menit |

Request yang melebihi limit diabaikan diam-diam (handler tidak dipanggil). Tidak ada error yang dilempar.

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

## Berbagi Counter Antar Proses

Untuk deployment multi-proses atau multi-worker, berikan `store` eksternal agar counter dibagikan (mis. di-backing Redis). Kontrak store:

```typescript
interface RateLimitStore {
    get(key: string): Promise<RateLimitRecord | undefined> | RateLimitRecord | undefined;
    set(key: string, value: RateLimitRecord, ttlMs: number): Promise<void> | void;
    delete(key: string): Promise<void> | void;
    // Opsional — lihat di bawah.
    increment?(key: string, windowMs: number, now: number):
        Promise<RateLimitRecord> | RateLimitRecord;
}
```

::: warning Konkurensi
Siklus `get` → ubah → `set` biasa **tidak atomik** pada store async bersama. Saat ada burst update bersamaan untuk kunci yang sama, dua request bisa membaca count yang sama dan menulis nilai yang sama, sehingga increment ter-hitung kurang dan limit jebol.

Agar tetap benar di bawah konkurensi, implementasikan method opsional **`increment()`** yang melakukan create-or-increment atomik (mis. `INCR` + `EXPIRE` di Redis). Bila tersedia, middleware memakainya alih-alih siklus `get`/`set`. Store in-memory bawaan bersifat single-thread sehingga sudah atomik.
:::

```typescript
// Contoh: store atomik berbasis Redis (pseudocode)
const store: RateLimitStore = {
    get: async (key) => /* ... */,
    set: async (key, value, ttlMs) => /* ... */,
    delete: async (key) => /* ... */,
    increment: async (key, windowMs, now) => {
        const count = await redis.incr(key);
        if (count === 1) await redis.pexpire(key, windowMs);
        const pttl = await redis.pttl(key);
        return { count, resetTime: now + Math.max(0, pttl) };
    },
};

bot.use(rateLimit({ store }));
```
