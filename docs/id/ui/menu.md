# Menu Builder

`Menu` membuat inline keyboard yang tombol-tombolnya membawa handler sendiri. Anda
tidak perlu menulis `bot.action()` terpisah untuk setiap tombol, dan sub-menu dengan
tombol "Kembali" langsung berfungsi: menekannya mengubah keyboard di pesan yang sama.

Pakai `Menu` untuk layar pengaturan, etalase toko, dan navigasi apa pun yang hidup di
satu pesan. Untuk tombol sekali pakai, [keyboard](/id/ui/keyboards) biasa dengan
`bot.action()` lebih sederhana.

## Memulai Cepat

```typescript
import { Bot, Menu } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const menu = new Menu('main');

menu.text('📢 Berita', async ctx => {
    await ctx.answerCbQuery(); // hentikan ikon loading di tombol
    await ctx.reply('Berita terbaru...');
});

menu.text('💰 Saldo', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Saldo: Rp100.000');
});

bot.use(menu.middleware()); // daftarkan sekali, sebelum handler lain

bot.command('menu', async ctx => {
    await ctx.reply('Menu utama:', { reply_markup: await menu.render(ctx) });
});
```

Tiga langkah: tambahkan tombol, daftarkan `menu.middleware()`, lalu kirim keyboard dari
`menu.render(ctx)`. Handler tombol wajib memanggil `ctx.answerCbQuery()`; kalau tidak,
Telegram menampilkan ikon loading di tombol selama beberapa detik.

## API

| Metode | Deskripsi |
| --- | --- |
| `menu.text(label, handler, { hide? })` | Tambah tombol yang menjalankan `handler` saat ditekan |
| `menu.url(label, url)` | Tambah tombol yang membuka link |
| `menu.row()` | Mulai baris tombol baru |
| `menu.submenu(id, label)` | Tambah tombol pembuka menu anak; mengembalikan menu anak |
| `menu.back(label?)` | Di sub-menu, tambah tombol kembali ke menu induk |
| `menu.render(ctx)` | Buat `InlineKeyboardMarkup` untuk dikirim atau diedit |
| `menu.middleware()` | Tangani penekanan tombol menu ini dan semua sub-menunya |

## Sub-Menu

`submenu()` mengembalikan `Menu` baru. Isi seperti menu biasa dan tambahkan `back()`
untuk kembali. Membuka sub-menu dan kembali sama-sama mengedit keyboard pesan saat ini
dan menjawab penekanan tombol secara otomatis.

```typescript
const menuUtama = new Menu('main');
menuUtama.text('Beranda', ctx => ctx.answerCbQuery('Anda di beranda'));
menuUtama.row();

const pengaturan = menuUtama.submenu('settings', '⚙️ Pengaturan');
pengaturan.text('🌙 Mode gelap', ctx => ctx.answerCbQuery('Mode gelap diubah'));
pengaturan.text('🔔 Notifikasi', ctx => ctx.answerCbQuery('Notifikasi diubah'));
pengaturan.row();
pengaturan.back('← Kembali');

bot.use(menuUtama.middleware()); // middleware root juga menangani semua sub-menu
```

Beri setiap menu dan sub-menu id yang unik: id menjadi bagian dari callback data tombol.

## Menyembunyikan Tombol

`hide` dicek setiap kali menu dirender. Kembalikan `true` untuk tidak menampilkan
tombol, misalnya agar menu admin hanya terlihat oleh admin:

```typescript
import { isAdmin, not } from 'vibegram';

menu.text(
    '🔐 Panel admin',
    async ctx => {
        // Cek lagi di sini: menyembunyikan tombol tidak melindungi handler-nya.
        if (!(await isAdmin()(ctx))) return ctx.answerCbQuery('Khusus admin.');
        await ctx.answerCbQuery();
        await ctx.reply('Panel admin');
    },
    { hide: not(isAdmin()) }
);
```

::: warning Tersembunyi bukan berarti terlindungi
Klien Telegram yang dimodifikasi bisa mengirim callback data apa pun, termasuk data
tombol yang disembunyikan. Selalu ulangi pengecekan izin di dalam handler.
:::

## Mengubah Menu dengan Aman

Callback data setiap tombol dibentuk dari id menu dan posisi tombol, misalnya
`menu:main:1_0`. Tombol di pesan yang sudah terkirim tetap membawa data lama. Kalau
Anda mengubah urutan atau menyisipkan tombol lalu deploy ulang, tombol di pesan lama
bisa menjalankan handler yang berbeda.

Untuk mengubah menu yang sudah dipakai, tambahkan tombol baru di akhir, atau beri menu
yang diubah id baru (`new Menu('main-v2')`) agar tombol lama tidak cocok dengan apa pun.

## Contoh: Menu Toko

```typescript
const toko = new Menu('store');

toko.text('🛍️ Katalog', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Membuka katalog...');
});

toko.text('🛒 Keranjang', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply('Keranjang Anda kosong.');
});

toko.row();
toko.url('💬 Bantuan', 'https://example.com/support');

bot.use(toko.middleware());
bot.command('toko', async ctx => {
    await ctx.reply('Selamat datang di toko!', { reply_markup: await toko.render(ctx) });
});
```

## Menu vs Keyboard Manual

| Fitur | `Markup.inlineKeyboard` + `bot.action()` | `Menu` |
| --- | --- | --- |
| Handler tombol | `bot.action()` terpisah per tombol | Di samping tombol, lewat `menu.text()` |
| Sub-menu | Tulis logika edit sendiri | Sudah tersedia |
| Navigasi kembali | Tulis sendiri | `menu.back()` |
| Tombol bersyarat | `if` saat menyusun keyboard | Opsi `hide` |
| Callback data stabil antar-deploy | Anda yang menentukan | Berdasarkan posisi (lihat di atas) |
