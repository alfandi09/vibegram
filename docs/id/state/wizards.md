# Wizard

Wizard membimbing pengguna melalui percakapan multi-langkah (form, registrasi, onboarding). Setiap langkah adalah fungsi yang dijalankan secara berurutan.

## Memulai Cepat

```typescript
import { Bot, session, Wizard } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session());

const wizardRegistrasi = new Wizard('daftar', [
    async (ctx) => {
        await ctx.reply('Langkah 1/3: Siapa nama Anda?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.nama = ctx.message?.text;
        await ctx.reply(`Halo ${ctx.wizard!.state.nama}! Langkah 2/3: Email Anda?`);
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.email = ctx.message?.text;
        const { nama, email } = ctx.wizard!.state;
        await ctx.reply(`✅ Pendaftaran selesai!\nNama: ${nama}\nEmail: ${email}`);
        ctx.wizard?.leave();
    }
]);

bot.use(wizardRegistrasi.middleware());
bot.command('daftar', ctx => wizardRegistrasi.enter(ctx));
```

## API Wizard

| Metode | Deskripsi |
|--------|-----------|
| `wizard.enter(ctx)` | Mulai wizard dari langkah 0 |
| `ctx.wizard?.next()` | Maju ke langkah berikutnya |
| `ctx.wizard?.back()` | Mundur ke langkah sebelumnya |
| `ctx.wizard?.leave()` | Keluar dari wizard |
| `ctx.wizard?.state` | Objek state bersama antar semua langkah |
| `ctx.wizard?.cursor` | Indeks langkah saat ini (0-based) |

## State Wizard

Objek `ctx.wizard.state` persisten di semua langkah dalam satu sesi wizard:

```typescript
const wizardPesanan = new Wizard('pesan', [
    async (ctx) => {
        await ctx.reply('📦 Produk apa yang ingin Anda pesan?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.produk = ctx.message?.text;
        await ctx.reply('🔢 Berapa jumlahnya?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.jumlah = parseInt(ctx.message?.text || '1');
        await ctx.reply('📍 Alamat pengiriman?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        const { produk, jumlah } = ctx.wizard!.state;
        const alamat = ctx.message?.text;
        await ctx.reply(
            `✅ Pesanan dikonfirmasi!\n` +
            `Produk: ${produk}\nJumlah: ${jumlah}\nAlamat: ${alamat}`
        );
        ctx.wizard?.leave();
    }
]);
```

## Validasi Input

Jangan panggil `next()` untuk tetap di langkah yang sama — sempurna untuk validasi:

```typescript
const wizardUsia = new Wizard('usia', [
    async (ctx) => {
        await ctx.reply('Masukkan usia Anda (hanya angka):');
        ctx.wizard?.next();
    },
    async (ctx) => {
        const usia = parseInt(ctx.message?.text || '');

        if (isNaN(usia) || usia < 1 || usia > 150) {
            // Tidak memanggil next() — pengguna tetap di langkah ini
            return ctx.reply('❌ Usia tidak valid. Masukkan angka antara 1-150:');
        }

        ctx.wizard!.state.usia = usia;
        await ctx.reply(`✅ Usia ${usia} tahun tercatat.`);
        ctx.wizard?.leave();
    }
]);
```

## Tombol Navigasi

Izinkan pengguna kembali ke langkah sebelumnya:

```typescript
const wizard = new Wizard('form', [
    async (ctx) => {
        await ctx.reply('Nama Anda?', {
            reply_markup: Markup.keyboard([
                [Markup.replyButton.text('❌ Batal')]
            ])
        });
        ctx.wizard?.next();
    },
    async (ctx) => {
        if (ctx.message?.text === '❌ Batal') {
            await ctx.reply('Form dibatalkan.', { reply_markup: Markup.removeKeyboard() });
            return ctx.wizard?.leave();
        }
        ctx.wizard!.state.nama = ctx.message?.text;
        await ctx.reply(`Nama: ${ctx.wizard!.state.nama}\nEmail?`);
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.email = ctx.message?.text;
        await ctx.reply('✅ Selesai!', { reply_markup: Markup.removeKeyboard() });
        ctx.wizard?.leave();
    }
]);
```

::: tip Validasi Step
Jika tidak memanggil `ctx.wizard?.next()`, pengguna tetap di langkah saat ini — ideal untuk loop validasi input.
:::
