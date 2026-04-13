# Menu Builder

Menu Builder membuat menu inline stateful dengan penanganan callback otomatis, navigasi sub-menu, dan visibilitas tombol yang dinamis.

## Memulai Cepat

```typescript
import { Bot, Menu, session } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session());

const menu = new Menu('utama');

menu.text('📢 Berita', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Berita terbaru...');
});

menu.text('💰 Saldo', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Saldo: Rp100.000');
});

bot.use(menu.middleware());

bot.command('menu', async (ctx) => {
    await ctx.reply('Menu Utama:', { reply_markup: await menu.render(ctx) });
});
```

## API Menu

| Metode | Deskripsi |
|--------|-----------|
| `menu.text(label, handler)` | Tambah tombol callback |
| `menu.url(label, url)` | Tambah tombol URL |
| `menu.row()` | Mulai baris tombol baru |
| `menu.submenu(id, label)` | Buat sub-menu anak |
| `menu.back(label?)` | Tambah tombol "Kembali ke induk" |
| `menu.render(ctx)` | Hasilkan markup keyboard |
| `menu.middleware()` | Ambil middleware penanganan callback |

## Sub-Menu

```typescript
const menuUtama = new Menu('utama');
menuUtama.text('🏠 Beranda', ctx => ctx.answerCbQuery('Beranda'));

menuUtama.row();

// Buat sub-menu — mengembalikan instansi Menu baru
const menuPengaturan = menuUtama.submenu('pengaturan', '⚙️ Pengaturan');
menuPengaturan.text('🌙 Mode Gelap', ctx => ctx.answerCbQuery('Diaktifkan'));
menuPengaturan.text('🔔 Notifikasi', ctx => ctx.answerCbQuery('Diaktifkan'));
menuPengaturan.row();
menuPengaturan.back('← Kembali ke Utama');

bot.use(menuUtama.middleware());
```

Saat pengguna mengetuk "⚙️ Pengaturan", keyboard otomatis berpindah ke sub-menu. Mengetuk "← Kembali" mengembalikan ke induk.

## Visibilitas Dinamis

Sembunyikan tombol secara kondisional:

```typescript
menu.text('🔐 Panel Admin', handlerAdmin, {
    hide: (ctx) => !adalahAdmin(ctx.from?.id)
});

menu.text('👑 VIP Area', handlerVip, {
    hide: (ctx) => ctx.session?.level !== 'vip'
});
```

## Contoh Praktis: Menu Toko

```typescript
const menuToko = new Menu('toko');

// Baris 1
menuToko.text('🛍️ Produk', ctx => ctx.scene?.enter('produk'));
menuToko.text('🛒 Keranjang', ctx => ctx.scene?.enter('keranjang'));
menuToko.row();

// Baris 2 — sub-menu akun
const menuAkun = menuToko.submenu('akun', '👤 Akun');
menuAkun.text('📋 Profil', ctx => ctx.answerCbQuery('Profil'));
menuAkun.text('🏆 Level', async ctx => {
    await ctx.answerCbQuery();
    await ctx.reply(`Level Anda: ${ctx.session?.level}`);
});
menuAkun.row();
menuAkun.back('← Kembali');

menuToko.row();
menuToko.text('📞 Bantuan', ctx => ctx.answerCbQuery('Menghubungi CS...'));

bot.use(menuToko.middleware());
bot.command('toko', async ctx => {
    await ctx.reply('🏪 Selamat datang di Toko!', {
        reply_markup: await menuToko.render(ctx)
    });
});
```

## Menu vs Keyboard Manual

| Fitur | `Markup.inlineKeyboard` | `Menu` |
|-------|------------------------|--------|
| Handler tombol | Panggilan `bot.action()` terpisah | Inline dengan `menu.text()` |
| Sub-menu | Logika edit manual | Otomatis |
| Navigasi kembali | Manual | Built-in |
| Visibilitas dinamis | Kondisional manual | Opsi `hide` |
