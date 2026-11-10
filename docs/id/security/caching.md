# Caching API

Sebagian panggilan Telegram mengembalikan data yang jarang berubah: info chat, profil bot
sendiri, sticker set. Jika handler Anda meminta hal yang sama di setiap update,
`apiCache()` mengingat jawabannya untuk sementara dan melewati panggilan jaringan.

## Memulai Cepat

```typescript
import { Bot, apiCache } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(apiCache({ ttl: 300 })); // ingat jawaban selama 5 menit

bot.command('info', async ctx => {
    const chat = await ctx.getChat(); // panggilan pertama dalam 5 menit: bertanya ke Telegram
    await ctx.reply(`Chat: ${chat.title ?? chat.first_name}`);
});
// /info berikutnya di chat yang sama dalam 5 menit memakai jawaban yang tersimpan.
```

Daftarkan dengan `bot.use()` **sebelum** handler yang ingin memakai cache. Ia meng-cache
panggilan lewat `ctx` (seperti `ctx.getChat()` atau `ctx.client.callApi('getMe')`) di
handler yang berjalan setelahnya. Cache-nya sendiri dipakai bersama oleh semua update
dan user.

## Apa yang Di-cache

Hanya metode baca. Selain itu, seperti mengirim, mengedit, atau menghapus, selalu
diteruskan ke Telegram.

| Metode | Mengembalikan |
| --- | --- |
| `getChat` | Informasi chat |
| `getChatMember` | Status anggota (admin, member, banned, ...) |
| `getChatMemberCount` | Jumlah anggota |
| `getChatAdministrators` | Daftar admin |
| `getFile` | Path file untuk diunduh |
| `getMe` | Profil bot sendiri |
| `getMyCommands` | Daftar command bot |
| `getStickerSet`, `getCustomEmojiStickers` | Data sticker |
| `getUserProfilePhotos` | Foto profil user |
| `getGameHighScores` | Skor game |
| `getForumTopicIconStickers` | Ikon topik forum |

Kuncinya adalah nama metode ditambah parameternya, jadi `getChat` untuk dua chat berbeda
disimpan terpisah.

::: warning Data cache bisa usang
Selama TTL, jawaban yang tersimpan tidak mencerminkan perubahan. Kasus terpenting adalah
`getChatMember`, yang dipakai [`isAdmin()`](/id/core/filters): orang yang baru diturunkan
dari admin masih bisa lolos pengecekan admin sampai entri kedaluwarsa. Pakai TTL pendek
(misalnya `ttl: 30`) jika Anda mengandalkan pengecekan admin, atau daftarkan
`apiCache()` setelahnya.
:::

## Opsi

| Opsi | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `ttl` | `number` | `300` | Lama jawaban disimpan, dalam **detik** |
| `store` | `CacheStore` | `new MemoryCache()` | Tempat jawaban disimpan |
| `keyGenerator` | `(method, params) => string` | metode + JSON parameter | Membuat kunci cache |

## Batas Memori

`MemoryCache` bawaan menyimpan paling banyak 10.000 entri. Saat penuh, entri yang paling
lama tidak dipakai dihapus lebih dulu. Berikan batas lain jika perlu:

```typescript
import { apiCache, MemoryCache } from 'vibegram';

bot.use(apiCache({ store: new MemoryCache(5000) }));
```

## Berbagi Cache Antar Instance (Redis)

`MemoryCache` hidup di dalam satu proses. Untuk beberapa instance bot, atau agar cache
tetap ada setelah restart, implementasikan `CacheStore` di atas Redis atau store lain:

```typescript
import type { CacheStore } from 'vibegram';

const PREFIX = 'vibegram:cache:';

class RedisCache implements CacheStore {
    async get(key: string) {
        const data = await redis.get(PREFIX + key);
        return data ? JSON.parse(data) : undefined;
    }
    async set(key: string, value: unknown, ttlMs: number) {
        await redis.set(PREFIX + key, JSON.stringify(value), { PX: ttlMs });
    }
    async delete(key: string) {
        await redis.del(PREFIX + key);
    }
    async clear() {
        // Hapus hanya kunci cache ini, bukan seluruh database Redis.
        for await (const key of redis.scanIterator({ MATCH: PREFIX + '*' })) {
            await redis.del(key);
        }
    }
}

bot.use(apiCache({ ttl: 600, store: new RedisCache() }));
```

`redis` mewakili client [node-redis](https://github.com/redis/node-redis); sesuaikan
pemanggilannya jika Anda memakai client lain.

## Meng-cache Fungsi Sendiri

`cached()` membungkus fungsi async apa pun, misalnya query database, dengan logika TTL
yang sama. Argumennya menjadi kunci:

```typescript
import { cached } from 'vibegram';

const cariUser = cached(async (userId: number) => db.users.findById(userId), { ttl: 60 });

const user = await cariUser(123); // query ke database
const lagi = await cariUser(123); // dalam 60 detik: hasil tersimpan
```

Hasil `undefined` tidak di-cache, jadi pencarian yang tidak menemukan apa pun dicoba
ulang di panggilan berikutnya.
