# Durable Conversation

`DurableConversation` adalah versi [`Conversation`](/id/state/conversations) yang tahan
restart. Conversation yang aktif disimpan di store (memory, Redis, database, KV), jadi
tetap utuh saat deploy, bisa berjalan di beberapa instance bot sekaligus, dan bisa
dipakai di platform serverless atau edge yang prosesnya tidak hidup terus.

```typescript
import { Bot, DurableConversation } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const conversations = new DurableConversation({ store: redisStore, timeout: 30 * 60_000 });

conversations.define('daftar', async (ctx, conv) => {
    await ctx.reply('Siapa namamu?');
    const nama = await conv.waitForText();

    await ctx.reply('Berapa umurmu?');
    const umur = await conv.waitForText({
        validate: c => /^\d+$/.test(c.message?.text ?? ''),
        validationError: 'Kirim angka saja.',
    });

    const userId = await conv.external(() => db.users.insert({ nama, umur: Number(umur) }));
    await ctx.reply(`Selamat datang, ${nama}! (#${userId})`);
});

bot.use(conversations.middleware());
bot.command('daftar', ctx => conversations.enter('daftar', ctx));
```

## Cara kerja

Alih-alih menyimpan fungsi yang sedang terhenti di memory, durable conversation menyimpan
update yang diterimanya serta hasil setiap panggilan Bot API dan `conv.external()`.
Saat update berikutnya datang, handler **diputar ulang dari awal**: update yang terekam
langsung dimasukkan ke `wait*()`, dan hasil API yang terekam dikembalikan tanpa
memanggil Telegram lagi, sehingga tidak ada pesan yang terkirim dua kali. Setelah itu
eksekusi berlanjut secara live sampai `wait*()` berikutnya.

## Aturan determinisme

Karena handler dijalankan ulang, jalurnya harus selalu sama. Bungkus apa pun yang bisa
berbeda antar-run dengan `conv.external()`; hasilnya direkam sekali lalu diputar ulang:

```typescript
// ✅ direkam sekali
const sekarang = await conv.external(() => Date.now());
const order = await conv.external(() => api.createOrder(keranjang));

// ❌ dijalankan ulang di setiap update dan bisa berbeda
const sekarang = Date.now();
await db.orders.insert(keranjang);
```

Jika replay mengambil jalur yang berbeda dari rekaman, conversation dibuang dan
`ConversationReplayError` dilempar (sampai ke `bot.catch()`).

## API

| Metode | Deskripsi |
| --- | --- |
| `define(name, handler)` | Daftarkan conversation. |
| `enter(name, ctx)` | Mulai conversation untuk user dan chat saat ini (mengganti yang aktif). |
| `leave(ctx)` | Batalkan conversation yang aktif. |
| `isActive(ctx)` | Apakah ada conversation yang belum kedaluwarsa. |
| `middleware()` | Meneruskan update ke conversation aktif. Daftarkan sebelum command. |

Di dalam handler, `conv` menyediakan `wait()`, `waitForText()`, `waitForCallbackQuery()`,
`waitForPhoto()`, `waitForContact()`, `waitForLocation()` (semuanya menerima `validate`
dan `validationError`), serta `external(fn)`.

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `store` | `MemoryConversationStore` | Adapter `{ get, set, delete }` apa saja. Record harus bisa di-serialize ke JSON. |
| `timeout` | 24 jam | Timeout tanpa aktivitas; conversation kedaluwarsa dibuang dan update diteruskan. |
| `getKey` | `${chat.id}:${from.id}` | Key conversation. |

## Menulis store

```typescript
import type { ConversationStore } from 'vibegram';

const redisStore: ConversationStore = {
    async get(key) {
        const raw = await redis.get(`conv:${key}`);
        return raw ? JSON.parse(raw) : undefined;
    },
    async set(key, record) {
        await redis.set(`conv:${key}`, JSON.stringify(record), 'PX', 30 * 60_000);
    },
    async delete(key) {
        await redis.del(`conv:${key}`);
    },
};
```

## Batasan

- Selama conversation menunggu, **semua** update dari user itu di chat itu diambil
  (sama seperti `Conversation`). Sediakan jalan keluar di dalam conversation, misalnya
  perlakukan teks `/batal` sebagai jawaban lalu `return`.
- `ctx` di dalam handler adalah `Context` biasa: properti tambahan dari middleware lain
  (seperti `ctx.session`) tidak tersedia. Baca state seperti itu lewat `conv.external()`.
- Record bertambah di setiap update, jadi lebih cocok untuk conversation puluhan langkah,
  bukan ribuan.
