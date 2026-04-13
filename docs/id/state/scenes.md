# Scene

Scene mengisolasi logika percakapan bot ke dalam router independen. Saat pengguna masuk ke sebuah scene, hanya handler scene tersebut yang aktif — handler global dilewati.

## Memulai Cepat

```typescript
import { Bot, session, Scene, Stage } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session());

// Definisikan scene
const pengaturanScene = new Scene('pengaturan');

pengaturanScene.command('tema', ctx => ctx.reply('Pilih tema: terang atau gelap?'));
pengaturanScene.hears('kembali', ctx => {
    ctx.reply('Keluar dari pengaturan.');
    ctx.scene?.leave();
});
pengaturanScene.on('message', ctx =>
    ctx.reply('Anda berada di pengaturan. Ketik "kembali" untuk keluar.')
);

// Daftarkan dan aktifkan
const stage = new Stage([pengaturanScene]);
bot.use(stage.middleware());

// Masuk ke scene
bot.command('pengaturan', ctx => ctx.scene?.enter('pengaturan'));
```

## API Scene

| Metode | Deskripsi |
|--------|-----------|
| `ctx.scene?.enter(nama)` | Masuk ke scene berdasarkan nama |
| `ctx.scene?.leave()` | Keluar dari scene saat ini |

## Cara Kerja

1. Saat `ctx.scene?.enter('nama')` dipanggil, session mencatat scene aktif
2. Pada update berikutnya, Stage middleware mengecek apakah pengguna di dalam scene
3. Jika ya, hanya handler scene tersebut yang berjalan — handler global dilewati
4. Saat `ctx.scene?.leave()` dipanggil, routing normal dilanjutkan

## Beberapa Scene

```typescript
const faqScene = new Scene('faq');
faqScene.on('message', ctx => ctx.reply('FAQ: Ajukan pertanyaan atau ketik "kembali".'));
faqScene.hears('kembali', ctx => ctx.scene?.leave());

const kontakScene = new Scene('kontak');
kontakScene.on('message', ctx => ctx.reply('Kontak: Kirim pesan atau ketik "kembali".'));
kontakScene.hears('kembali', ctx => ctx.scene?.leave());

const stage = new Stage([faqScene, kontakScene]);
bot.use(stage.middleware());

bot.command('faq', ctx => ctx.scene?.enter('faq'));
bot.command('kontak', ctx => ctx.scene?.enter('kontak'));
```

## Skenario Praktis: Menu Utama

```typescript
const menuScene = new Scene('menu');

menuScene.action('produk', ctx => ctx.scene?.enter('produk'));
menuScene.action('profil', ctx => ctx.scene?.enter('profil'));
menuScene.hears('exit', ctx => {
    ctx.scene?.leave();
    ctx.reply('Kembali ke menu utama.');
});

bot.command('menu', async ctx => {
    await ctx.reply('📋 Menu Utama:', {
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🛒 Produk', 'produk')],
            [Markup.button.callback('👤 Profil', 'profil')],
        ])
    });
    ctx.scene?.enter('menu');
});
```

::: tip Urutan Middleware
Daftarkan `bot.use(session())` **sebelum** `bot.use(stage.middleware())` — Stage bergantung pada data session.
:::
