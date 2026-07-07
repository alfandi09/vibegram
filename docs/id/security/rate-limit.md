# Rate Limiter

Middleware `rateLimit()` melindungi pemrosesan update masuk dari flood sebelum
logic bisnis berjalan. Ini berguna untuk bot publik, bot grup, dan deployment
webhook yang perlu batas request per user atau per chat.

## Memulai Cepat

```ts
import { Bot, rateLimit } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(rateLimit());
```

Tanpa opsi, private chat dibatasi 1 update per detik dan grup 20 update per
menit.

## Konfigurasi Kustom

```ts
bot.use(
    rateLimit({
        windowMs: 10_000,
        limit: 5,
        onLimitExceeded: async ctx => {
            await ctx.reply('Terlalu banyak request. Coba lebih pelan.');
        },
    })
);
```

`windowMs` dan `limit` harus positive integer. Opsi numerik yang tidak valid
akan melempar `TypeError` saat middleware dibuat supaya salah konfigurasi gagal
lebih awal.

## Opsi

| Opsi | Tipe | Default | Deskripsi |
| --- | --- | --- | --- |
| `windowMs` | `number` | Private: `1000`, grup: `60000` | Panjang window dalam milidetik. |
| `limit` | `number` | Private: `1`, grup: `20` | Maksimum update dalam satu window. |
| `keyGenerator` | `(ctx) => string \| undefined` | Fallback chat + user | Membuat key counter. |
| `onLimitExceeded` | `(ctx, next) => void \| Promise<void>` | Drop diam-diam + warning | Dipanggil saat limit terlampaui. |
| `store` | `RateLimitStore` | Store in-memory | Berbagi counter antar instance atau proses. |
| `strictMode` | `boolean` | `false` | Memblokir update yang tidak bisa menghasilkan key. |

## Perilaku Default

Key default dibuat dari identitas paling spesifik yang tersedia:

1. `chat.id` + `from.id`
2. `chat.id`
3. `from.id`
4. `update.update_id`

Jika key tidak bisa dibuat dan `strictMode` nonaktif, update diteruskan ke
middleware berikutnya. Jika `strictMode` aktif, update diblokir.

## Penanganan Saat Terlimit

Gunakan `onLimitExceeded` saat ingin mengirim respons ke user, mencatat event
terstruktur, atau mengarahkan update ke guard lain.

```ts
bot.use(
    rateLimit({
        onLimitExceeded: async ctx => {
            await ctx.reply('Rate limit tercapai. Coba lagi sebentar.');
        },
    })
);
```

Jaga handler tetap ringan. Jalur ini berjalan saat abuse path, jadi hindari
kerja database yang mahal di sana.

## Key Generator Kustom

```ts
bot.use(
    rateLimit({
        keyGenerator: ctx => {
            if (!ctx.from) return undefined;
            return `user:${ctx.from.id}`;
        },
        strictMode: true,
    })
);
```

Kembalikan `undefined` hanya jika update memang harus mengikuti perilaku
fallback `strictMode`.

## Berbagi Counter Antar Proses

Untuk beberapa Node.js worker atau instance serverless, gunakan shared store.
Jika store mendukungnya, implementasikan `increment()` secara atomic untuk
menghindari race read-modify-write saat traffic paralel.

```ts
bot.use(
    rateLimit({
        store: redisBackedRateLimitStore,
    })
);
```

Kontrak store:

```ts
interface RateLimitStore {
    get(key: string): RateLimitRecord | Promise<RateLimitRecord | undefined> | undefined;
    set(key: string, value: RateLimitRecord, ttlMs: number): void | Promise<void>;
    delete(key: string): void | Promise<void>;
    increment?(
        key: string,
        windowMs: number,
        now: number
    ): RateLimitRecord | Promise<RateLimitRecord>;
}
```

## Integrasi dengan Logger

Letakkan logger sebelum rate limiter jika update yang ditrottle tetap perlu
terlihat di log. Letakkan rate limiter paling awal jika ingin menjatuhkan
traffic abusive sedini mungkin.

```ts
bot.use(logger());
bot.use(rateLimit());
```
