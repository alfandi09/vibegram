# Session

Session memungkinkan bot menyimpan data per-pengguna yang persisten di antara update. VibeGram menggunakan pola **adapter** sehingga Anda bisa menyimpan session di memori, Redis, MongoDB, atau penyimpanan lainnya.

## Setup Dasar

```typescript
import { Bot, session } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

// Pasang session dengan nilai awal
bot.use(session({
    initial: () => ({ count: 0, bahasa: 'id' })
}));

bot.command('hitung', async (ctx) => {
    ctx.session.count++;
    await ctx.reply(`Anda telah mengirim ${ctx.session.count} pesan.`);
});
```

## Session Bertipe (TypeScript)

Definisikan interface untuk session Anda:

```typescript
interface SessionData {
    count: number;
    bahasa: string;
    keranjang: string[];
    lastSeen?: Date;
}

bot.use(session<SessionData>({
    initial: () => ({
        count: 0,
        bahasa: 'id',
        keranjang: []
    })
}));

// ctx.session.count dikenali sebagai `number`
// ctx.session.keranjang dikenali sebagai `string[]`
```

## Opsi Konfigurasi

```typescript
bot.use(session({
    // Nilai awal untuk session baru
    initial: () => ({ count: 0 }),

    // Kunci session kustom (default: `${chatId}:${fromId}`)
    getSessionKey: (ctx) => {
        return ctx.from?.id?.toString(); // per-pengguna global
    },

    // Adapter penyimpanan kustom (default: MemorySessionStore)
    store: myCustomStore,
}));
```

## MemorySessionStore (Bawaan)

VibeGram menggunakan `MemorySessionStore` secara default dengan:
- **TTL**: 24 jam (dapat dikonfigurasi)
- **Eviksi LRU**: Hapus entri terlama saat kapasitas penuh (default: 10.000)

```typescript
import { MemorySessionStore } from 'vibegram';

const store = new MemorySessionStore(
    3600_000,  // TTL: 1 jam (dalam ms)
    5000       // Maksimal 5.000 session
);

bot.use(session({ store }));
```

## Adapter Redis

Untuk lingkungan produksi, gunakan Redis agar session persisten saat restart:

```typescript
import Redis from 'ioredis';
import { createRedisStore } from './examples/redis-session';

const redis = new Redis(process.env.REDIS_URL!);

bot.use(session({
    store: createRedisStore(redis, { ttlSeconds: 7 * 24 * 3600 }), // 7 hari
    initial: () => ({ count: 0 }),
}));
```

## Menghapus Session

Set session ke `null` untuk menghapus data pengguna:

```typescript
bot.command('reset', async (ctx) => {
    ctx.session = null as any; // hapus dari store
    await ctx.reply('Session direset! ♻️');
});
```

## Kunci Session Kustom

Secara default, kunci session adalah `${chatId}:${fromId}`. Ubah ini jika perlu:

```typescript
// Session per-pengguna (dibagikan di semua chat)
bot.use(session({
    getSessionKey: (ctx) => ctx.from?.id?.toString(),
}));

// Session per-chat (dibagikan di semua anggota)
bot.use(session({
    getSessionKey: (ctx) => ctx.chat?.id?.toString(),
}));
```

## Membuat Adapter Kustom

Implementasikan interface `SessionStore`:

```typescript
import type { SessionStore } from 'vibegram';

class MongoSessionStore implements SessionStore {
    private collection: any;

    constructor(collection: any) {
        this.collection = collection;
    }

    async get(key: string) {
        const doc = await this.collection.findOne({ _id: key });
        return doc?.data ?? undefined;
    }

    async set(key: string, value: any) {
        await this.collection.updateOne(
            { _id: key },
            { $set: { data: value, updatedAt: new Date() } },
            { upsert: true }
        );
    }

    async delete(key: string) {
        await this.collection.deleteOne({ _id: key });
    }
}
```
