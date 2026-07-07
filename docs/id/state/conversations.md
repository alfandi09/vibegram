# Conversation

Conversation memodelkan flow multi-step bebas saat user bisa menjawab dengan
teks, tombol, atau media. Gunakan saat langkah berikutnya bergantung pada input
runtime dan wizard linear terasa terlalu kaku.

```ts
import { Bot, Conversation } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const conversations = new Conversation();

bot.use(conversations.middleware());
```

## Memulai Cepat

```ts
conversations.define('profile', async (ctx, conv) => {
    await ctx.reply('Siapa nama kamu?');
    const name = await conv.waitForText();

    await ctx.reply('Kirim foto profil.');
    const photo = await conv.waitForPhoto();

    await ctx.reply(`Tersimpan: ${name}, ${photo.length} ukuran foto.`);
});

bot.command('profile', ctx => conversations.enter('profile', ctx));
```

Saat chat masuk ke conversation, update berikutnya untuk chat/user yang sama
dikirim ke step yang sedang menunggu sebelum handler normal berjalan.

## Opsi Conversation

```ts
const conversations = new Conversation({
    defaultTimeout: 5 * 60 * 1000,
});
```

`defaultTimeout` mengatur berapa lama conversation aktif yang idle boleh berada
di memori. Default-nya 5 menit.

## Metode Wait

| Method | Resolve menjadi | Catatan |
| --- | --- | --- |
| `conv.wait()` | `Context` | Update mentah berikutnya untuk chat/user yang sama. |
| `conv.waitForText()` | `string` | Membutuhkan pesan teks. |
| `conv.waitForPhoto()` | `PhotoSize[]` | Membutuhkan pesan foto. |
| `conv.waitForCallbackQuery()` | `string` | Membutuhkan data callback query. |
| `conv.waitForContact()` | `Contact` | Membutuhkan share contact. |
| `conv.waitForLocation()` | `Location` | Membutuhkan share location. |
| `conv.waitForAny()` | Discriminated union | Teks, callback data, atau media umum. |

Semua wait method menerima `timeout`, `validate`, dan `validationError`.

## Input Campuran

```ts
const result = await conv.waitForAny();

if (result.type === 'text') {
    await result.ctx.reply(`Teks: ${result.text}`);
}

if (result.type === 'callback') {
    await result.ctx.answerCallbackQuery();
}

if (result.type === 'media') {
    await result.ctx.reply(`Tipe media: ${result.mediaType}`);
}
```

`waitForAny()` berguna saat satu step menerima beberapa tipe input Telegram.

## Validasi

```ts
const quantity = await conv.waitForText({
    validate: ctx => Number.isInteger(Number(ctx.message?.text)),
    validationError: 'Kirim angka bulat.',
});
```

Saat validasi gagal, update dikonsumsi, `validationError` dikirim jika ada, dan
conversation tetap menunggu.

## Timeout

```ts
try {
    const email = await conv.waitForText({ timeout: 30_000 });
    await ctx.reply(`Email tersimpan: ${email}`);
} catch (error) {
    await ctx.reply('Waktu habis. Mulai lagi saat siap.');
}
```

Gunakan `timeout` per step untuk deadline yang terlihat user. Gunakan
`defaultTimeout` untuk cleanup memori conversation yang idle.

## Branching

```ts
await ctx.reply('Pilih: basic atau pro');
const plan = await conv.waitForText();

if (plan === 'pro') {
    await ctx.reply('Kirim nama perusahaan.');
    const company = await conv.waitForText();
    await ctx.reply(`Plan pro untuk ${company}.`);
} else {
    await ctx.reply('Plan basic dipilih.');
}
```

Karena handler adalah async TypeScript biasa, kamu bisa memakai `if`, `switch`,
loop, dan helper function normal.

## Status dan Keluar

```ts
bot.command('cancel', ctx => {
    conversations.leave(ctx);
    return ctx.reply('Conversation dibatalkan.');
});

bot.command('status', ctx => {
    return ctx.reply(conversations.isActive(ctx) ? 'Aktif' : 'Tidak ada conversation aktif');
});
```

Panggil `cancelAll()` saat graceful shutdown jika perlu membersihkan timer
sebelum menutup resource eksternal.

## Conversation vs Wizard

| Gunakan Conversation saat... | Gunakan Wizard saat... |
| --- | --- |
| Step banyak bercabang. | Step kebanyakan linear. |
| Kamu ingin flow control gaya `await`. | Kamu ingin handler step eksplisit. |
| Satu step bisa menerima beberapa tipe input. | Tiap step punya input yang tetap. |
| Flow lebih mudah dibaca sebagai satu async function. | Flow lebih mudah dipisah per step. |
