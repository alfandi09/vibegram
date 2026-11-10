# Wizard

Wizard memandu user melewati urutan pertanyaan yang tetap: formulir pendaftaran,
formulir pesanan, onboarding. Anda memberinya array **step**; wizard mengingat setiap
user sedang di step mana (di [session](/id/state/session)-nya) dan mengirim pesan
berikutnya dari user ke step tersebut.

## Cara Kerja Step

Setiap step adalah fungsi yang berjalan untuk **satu update yang masuk**. Pola umumnya:

1. Step 0 langsung berjalan saat wizard dimulai. Step ini mengajukan pertanyaan
   pertama lalu memanggil `ctx.wizard.next()`.
2. Jawaban user datang dan menjalankan step 1. Step ini menyimpan jawaban, mengajukan
   pertanyaan berikutnya, lalu memanggil `next()` lagi.
3. Step terakhir menyimpan jawaban terakhir dan memanggil `ctx.wizard.leave()`.

Jika step **tidak** memanggil `next()`, user tetap di step itu. Begitulah cara bertanya
ulang setelah jawaban yang tidak valid.

## Memulai Cepat

```typescript
import { Bot, session, Wizard } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session()); // wizard menyimpan posisinya di session

const daftar = new Wizard('daftar', [
    async ctx => {
        await ctx.reply('Siapa nama Anda?');
        ctx.wizard!.next();
    },
    async ctx => {
        const nama = ctx.message?.text;
        if (!nama) return ctx.reply('Kirim nama Anda dalam bentuk teks.'); // tetap di step ini
        ctx.wizard!.state.nama = nama;
        await ctx.reply(`Senang bertemu, ${nama}! Apa email Anda?`);
        ctx.wizard!.next();
    },
    async ctx => {
        const email = ctx.message?.text ?? '';
        if (!email.includes('@')) return ctx.reply('Sepertinya itu bukan email. Coba lagi:');
        await ctx.reply(`Selesai!\nNama: ${ctx.wizard!.state.nama}\nEmail: ${email}`);
        ctx.wizard!.leave();
    },
]);

bot.use(daftar.middleware()); // setelah session(), sebelum handler lain
bot.command('daftar', ctx => daftar.enter(ctx));
```

## API

| Member | Deskripsi |
| --- | --- |
| `wizard.enter(ctx)` | Mulai (atau ulang) wizard dan langsung jalankan step 0 |
| `ctx.wizard.next()` | Kirim update berikutnya dari user ke step berikutnya |
| `ctx.wizard.back()` | Kirim update berikutnya ke step sebelumnya |
| `ctx.wizard.goto(index)` | Kirim update berikutnya ke step mana pun (mulai dari 0) |
| `ctx.wizard.leave()` | Keluar dari wizard dan hapus state-nya |
| `ctx.wizard.state` | Objek yang dipakai bersama semua step; simpan jawaban di sini |
| `ctx.wizard.cursor` | Indeks step yang sedang berjalan |

`next()`, `back()`, dan `goto()` hanya memilih step yang menangani update **berikutnya**.
Ketiganya tidak menjalankan step itu sekarang, jadi ajukan pertanyaannya sendiri.

## Saat User Berada di Wizard

Middleware wizard mengambil **semua** update dari user itu: teks, foto, command, dan
penekanan tombol masuk ke step saat ini, dan handler Anda yang lain tidak berjalan.
Dua akibatnya:

- **Cek jenis input.** User bisa mengirim stiker saat Anda menunggu teks, jadi
  `ctx.message?.text` bisa `undefined` (lihat Memulai Cepat).
- **Sediakan jalan keluar.** `/batal` juga sampai ke step saat ini. Bungkus step agar
  semuanya memahaminya:

```typescript
import type { WizardStep } from 'vibegram';

const bisaBatal =
    (step: WizardStep): WizardStep =>
    async ctx => {
        if (ctx.message?.text === '/batal') {
            ctx.wizard!.leave();
            await ctx.reply('Dibatalkan.');
            return;
        }
        await step(ctx);
    };

const pesanan = new Wizard('pesanan', [tanyaProduk, simpanProduk, simpanJumlah].map(bisaBatal));
```

Jika step habis tanpa `leave()`, wizard berakhir sendiri dan update berikutnya masuk
ke handler biasa Anda.

## Tombol di Dalam Wizard

Karena penekanan tombol juga masuk ke step saat ini, tangani **di dalam step**, bukan
dengan `bot.action()` (handler `bot.action()` tidak pernah menerimanya selama user di
dalam wizard):

```typescript
import { Markup } from 'vibegram';

const konfirmasi = new Wizard('konfirmasi', [
    async ctx => {
        await ctx.reply('Berapa unit?');
        ctx.wizard!.next();
    },
    async ctx => {
        const jumlah = Number(ctx.message?.text);
        if (!Number.isInteger(jumlah) || jumlah < 1) return ctx.reply('Kirim bilangan bulat:');
        ctx.wizard!.state.jumlah = jumlah;
        await ctx.reply(`Pesan ${jumlah} unit?`, {
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('✅ Konfirmasi', 'confirm'), Markup.button.callback('↩️ Ubah', 'change')],
            ]),
        });
        ctx.wizard!.next();
    },
    async ctx => {
        const pilihan = ctx.update.callback_query?.data;
        if (!pilihan) return ctx.reply('Silakan pakai tombol di atas.');
        await ctx.answerCbQuery();

        if (pilihan === 'change') {
            ctx.wizard!.back(); // pesan berikutnya kembali ke step jumlah
            return ctx.reply('Berapa unit?');
        }
        await ctx.editMessageText(`✅ Memesan ${ctx.wizard!.state.jumlah} unit.`);
        ctx.wizard!.leave();
    },
]);
```

## Wizard, Scene, atau Conversation?

| Pakai | Kapan |
| --- | --- |
| **Wizard** | Daftar pertanyaan tetap yang diajukan berurutan |
| [Scene](/id/state/scenes) | Mode dengan command sendiri, dimasuki dan ditinggalkan oleh user |
| [Conversation](/id/state/conversations) | Alur bebas yang ditulis sebagai satu fungsi async (`await conv.waitForText()`) |

Progres wizard tersimpan di session, jadi tetap bertahan setelah restart jika session
memakai store persisten seperti Redis.
