# Scene

Scene adalah **mode** yang dimasuki user lalu ditinggalkan, dengan handler sendiri.
Saat user berada di scene `settings`, kata "tema" atau "kembali" punya arti berbeda
dibanding di bagian lain bot Anda. Scene aktif setiap user disimpan di
[session](/id/state/session)-nya.

## Memulai Cepat

```typescript
import { Bot, session, Scene, Stage } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session()); // 1. scene menyimpan scene aktif di session

const pengaturan = new Scene('settings');
pengaturan.hears('tema', ctx => ctx.reply('Pilih: terang atau gelap?'));
pengaturan.hears('kembali', async ctx => {
    ctx.scene!.leave();
    await ctx.reply('Keluar dari pengaturan.');
});
pengaturan.on('message', ctx => ctx.reply('Anda di pengaturan. Kirim "tema" atau "kembali".'));

bot.use(new Stage([pengaturan]).middleware()); // 2. setelah session(), sebelum handler lain

bot.command('pengaturan', async ctx => {
    ctx.scene!.enter('settings'); // 3. masuk dari handler biasa
    await ctx.reply('Pengaturan. Kirim "tema" atau "kembali".');
});
```

Masuk ke scene tidak mengirim apa pun dengan sendirinya, jadi balas dengan petunjuk
tepat setelah `enter()`. Update **berikutnya** dari user adalah yang pertama
diarahkan ke scene.

## Cara Kerja Routing

Untuk user yang berada di scene, middleware Stage menjalankan handler scene lebih dulu:

- Jika handler scene menangani update, handler global Anda **tidak** berjalan.
- Jika tidak ada handler scene yang cocok (atau ada yang memanggil `next()`), update
  **diteruskan** ke handler global.

Jadi `pengaturan.on('message', ...)` di atas yang membuat semua pesan tetap di dalam
scene. Tanpanya, pesan yang tidak dikenali scene akan sampai ke handler global. Update
yang tidak punya handler di scene, misalnya penekanan tombol di sini, selalu diteruskan
ke handler global.

## API

| Member | Deskripsi |
| --- | --- |
| `new Scene(id)` | Sebuah scene; tambah handler dengan `command`, `hears`, `on`, `action`, `filter`, ... |
| `new Stage([scenes])` | Menampung semua scene; daftarkan `stage.middleware()` sekali |
| `ctx.scene.enter(id, state?)` | Masuk ke scene; `state` menjadi `ctx.scene.state` |
| `ctx.scene.reenter(state?)` | Tetap di scene saat ini dan reset state-nya |
| `ctx.scene.leave()` | Keluar dari scene saat ini |
| `ctx.scene.current` | Id scene saat ini, atau `undefined` |
| `ctx.scene.state` | Data yang disimpan untuk user selama di dalam scene |

## State Scene

Kirim data saat masuk dan baca nanti; data dihapus saat `leave()`:

```typescript
const kuis = new Scene('quiz');

kuis.hears(/^\d+$/, async ctx => {
    const jawaban = Number(ctx.message?.text);
    ctx.scene!.state.skor = (ctx.scene!.state.skor ?? 0) + (jawaban === 4 ? 1 : 0);
    await ctx.reply(`Skor: ${ctx.scene!.state.skor}. Berikutnya: berapa 2 + 2?`);
});
kuis.command('stop', async ctx => {
    await ctx.reply(`Skor akhir: ${ctx.scene!.state.skor ?? 0}`);
    ctx.scene!.leave();
});

bot.command('kuis', async ctx => {
    ctx.scene!.enter('quiz', { skor: 0 });
    await ctx.reply('Kuis dimulai! Berapa 2 + 2? (/stop untuk selesai)');
});
```

## Beberapa Scene

Daftarkan semua scene di satu Stage. User berada di paling banyak satu scene; masuk ke
scene lain akan menggantikannya.

```typescript
const faq = new Scene('faq');
faq.hears('kembali', ctx => ctx.scene!.leave());
faq.on('message', ctx => ctx.reply('Ajukan pertanyaan, atau kirim "kembali".'));

const kontak = new Scene('contact');
kontak.hears('kembali', ctx => ctx.scene!.leave());
kontak.on('message', ctx => ctx.reply('Terima kasih! Kami akan segera membalas. Kirim "kembali" untuk keluar.'));

bot.use(new Stage([faq, kontak]).middleware());

bot.command('faq', ctx => ctx.scene!.enter('faq'));
bot.command('kontak', ctx => ctx.scene!.enter('contact'));
```

## Scene, Wizard, atau Conversation?

| Pakai | Kapan |
| --- | --- |
| **Scene** | Mode dengan command dan kata sendiri, ditinggalkan saat user memilih |
| [Wizard](/id/state/wizards) | Daftar pertanyaan tetap yang diajukan berurutan |
| [Conversation](/id/state/conversations) | Alur bebas yang ditulis sebagai satu fungsi async |

::: tip Urutan penting
Daftarkan `bot.use(session())` sebelum `stage.middleware()`, dan stage sebelum handler
yang harus kalah prioritas darinya.
:::
