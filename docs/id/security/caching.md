# Caching API

Middleware `apiCache` menyimpan respons dari metode API Telegram yang bersifat read-only untuk mengurangi panggilan jaringan yang berulang.

## Memulai Cepat

```typescript
import { Bot, apiCache } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

// Cache respons API selama 5 menit
bot.use(apiCache({ ttl: 300 }));

bot.command('info', async (ctx) => {
    const chat = await ctx.getChat();    // memukul API
    const lagi = await ctx.getChat();    // mengembalikan cache
    await ctx.reply(`Chat: ${chat.title}`);
});
```

## Metode yang Di-Cache

Hanya metode API idempoten dan read-only yang di-cache:

| Metode | Deskripsi |
|--------|-----------|
| `getChat` | Informasi chat |
| `getChatMember` | Info dan status anggota |
| `getChatMemberCount` | Jumlah anggota |
| `getChatAdministrators` | Daftar admin |
| `getFile` | Link unduhan file |
| `getMe` | Informasi bot |
| `getMyCommands` | Daftar command |
| `getStickerSet` | Data stiker set |
| `getUserProfilePhotos` | Foto profil pengguna |

Metode tulis (`sendMessage`, `editMessage`, `deleteMessage`, dll.) **tidak pernah di-cache**.

## Opsi

| Opsi | Tipe | Default | Deskripsi |
|------|------|---------|-----------|
| `ttl` | `number` | `300` | Time-to-live dalam detik |
| `store` | `CacheStore` | `MemoryCache` | Backend penyimpanan |
| `keyGenerator` | `function` | Otomatis | Fungsi pembuat kunci cache kustom |

## Custom Store

Implementasikan interface `CacheStore` untuk Redis atau backend lain:

```typescript
import { CacheStore } from 'vibegram';

class RedisCache implements CacheStore {
    async get(key: string) {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : undefined;
    }

    async set(key: string, value: any, ttlMs: number) {
        await redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    }

    async delete(key: string) {
        await redis.del(key);
    }

    async clear() {
        await redis.flushdb();
    }
}

bot.use(apiCache({ ttl: 600, store: new RedisCache() }));
```

## Cache Mandiri

Gunakan `cached()` untuk membungkus fungsi async apa pun:

```typescript
import { cached } from 'vibegram';

const ambilPengguna = cached(
    async (userId: number) => db.users.findById(userId),
    { ttl: 60 }
);

const pengguna = await ambilPengguna(123); // di-cache selama 60 detik
```

## Manajemen Memori

`MemoryCache` bawaan menerapkan batas keras (default: 10.000 entri) dengan eviksi LRU — strategi yang sama dengan session store:

```typescript
import { MemoryCache } from 'vibegram';

const store = new MemoryCache(5000); // maks 5.000 entri
bot.use(apiCache({ store }));
```

::: tip Gunakan Cache dengan isAdmin()
Filter `isAdmin()` memanggil `getChatMember` setiap kali. Pasang `apiCache` untuk menghindari panggilan berulang:

```typescript
bot.use(apiCache({ ttl: 60 })); // cache 1 menit
bot.command('admin', and(isGroup, isAdmin()), ctx => ctx.reply('Halo admin!'));
```
:::
