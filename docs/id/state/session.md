# Session

Middleware `session()` menambahkan `ctx.session` ke setiap update yang memiliki
key chat/user. Gunakan untuk state kecil per user seperti preferensi, progress
wizard, atau data form sementara.

## Memulai Cepat

```ts
import { Bot, session } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(session());

bot.command('count', async ctx => {
    ctx.session.count = (ctx.session.count ?? 0) + 1;
    await ctx.reply(`Count: ${ctx.session.count}`);
});
```

State session dimuat sebelum middleware berikutnya berjalan dan disimpan setelah
`next()` selesai.

## Session Bertipe

```ts
type MySession = {
    count: number;
    locale?: string;
};

bot.use(
    session<MySession>({
        initial: () => ({ count: 0 }),
    })
);

bot.command('lang', ctx => {
    ctx.session.locale = 'id';
});
```

Gunakan `initial()` supaya handler tidak perlu banyak pengecekan defensif.

## Opsi Session

| Opsi | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `store` | `SessionStore` | `new MemorySessionStore()` | Adapter storage untuk data session. |
| `getSessionKey` | `(ctx) => string \| undefined` | `${chatId}:${fromId}` | Membuat key storage. |
| `initial` | `() => S` | `{}` | Membuat session baru saat record belum ada. |

Jika `getSessionKey()` mengembalikan `undefined`, update tetap lanjut tanpa
persistensi `ctx.session`.

## Keamanan Konkurensi

Middleware menserialisasi siklus load-handler-save per session key. Dua update
untuk user yang sama tidak menyimpan ulang dari state awal yang sama. Session
key berbeda tetap bisa berjalan paralel.

## MemorySessionStore

```ts
import { MemorySessionStore, session } from 'vibegram';

bot.use(
    session({
        store: new MemorySessionStore(
            24 * 60 * 60 * 1000, // ttlMs
            10_000, // maxEntries
            60_000 // cleanupIntervalMs
        ),
    })
);
```

Store bawaan bersifat volatile. Cocok untuk development, bot single-process,
dan state pendek. Record kedaluwarsa berdasarkan TTL dan entry
least-recently-used akan dieviction saat `maxEntries` tercapai.

## Adapter Redis

Gunakan store eksternal untuk bot produksi yang berjalan di banyak worker atau
perlu state bertahan setelah restart.

```ts
const redisStore = {
    async get(key: string) {
        const value = await redis.get(key);
        return value ? JSON.parse(value) : undefined;
    },
    async set(key: string, value: unknown) {
        await redis.set(key, JSON.stringify(value), { EX: 60 * 60 * 24 });
    },
    async delete(key: string) {
        await redis.del(key);
    },
};

bot.use(session({ store: redisStore }));
```

## Menghapus Session

Isi `ctx.session` dengan `null` atau `undefined` untuk menghapus session
tersimpan setelah handler selesai.

```ts
bot.command('reset', async ctx => {
    ctx.session = null;
    await ctx.reply('Session dihapus.');
});
```

## Key Session Kustom

```ts
bot.use(
    session({
        getSessionKey: ctx => {
            if (!ctx.chat) return undefined;
            return `chat:${ctx.chat.id}`;
        },
    })
);
```

Gunakan key per chat untuk state grup bersama dan key chat+user untuk state user
pribadi.

## Adapter Storage Kustom

```ts
import type { SessionStore } from 'vibegram';

class DatabaseSessionStore implements SessionStore {
    async get(key: string) {
        return db.session.findUnique({ where: { key } });
    }

    async set(key: string, value: unknown) {
        await db.session.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
    }

    async delete(key: string) {
        await db.session.delete({ where: { key } });
    }
}
```

Adapter sebaiknya memakai parameterized query, TTL atau kebijakan cleanup, dan
serialisasi JSON yang stabil.

## Manajemen Memori

Untuk proses long-running, pilih salah satu:

- Pertahankan limit default `MemorySessionStore` untuk bot kecil.
- Sesuaikan `ttlMs` dan `maxEntries` dengan traffic yang diharapkan.
- Panggil `store.close()` saat graceful shutdown jika membuat
  `MemorySessionStore` secara manual.
- Gunakan Redis atau store eksternal lain untuk bot produksi yang scale
  horizontal.
