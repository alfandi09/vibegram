# Keyboard & Markup

VibeGram menyediakan builder keyboard yang komprehensif melalui kelas `Markup` untuk membuat keyboard inline dan reply keyboard.

## Inline Keyboard

Keyboard yang muncul di bawah pesan (bukan di keyboard native):

```typescript
import { Markup } from 'vibegram';

await ctx.reply('Pilih opsi:', {
    reply_markup: Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Setuju', 'setuju'),
            Markup.button.callback('❌ Tolak', 'tolak'),
        ],
        [Markup.button.url('🌐 Website', 'https://alfandi09.github.io/vibegram/')],
    ]),
});
```

## Markup.grid() — Grid Otomatis

Buat grid keyboard dari array flat — tidak perlu menyusun baris manual:

```typescript
const hari = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

await ctx.reply('Pilih hari:', {
    reply_markup: Markup.grid(
        hari.map(d => Markup.button.callback(d, `hari_${d.toLowerCase()}`)),
        3 // 3 tombol per baris
    ),
});

// Menghasilkan:
// [Sen] [Sel] [Rab]
// [Kam] [Jum] [Sab]
// [Min]
```

## Tipe Tombol Inline

| Factory                                                   | Deskripsi                               |
| --------------------------------------------------------- | --------------------------------------- |
| `Markup.button.callback(text, data)`                      | Tombol callback — memicu `bot.action()` |
| `Markup.button.url(text, url)`                            | Tautan URL eksternal                    |
| `Markup.button.webApp(text, url)`                         | Buka Telegram Mini App                  |
| `Markup.button.pay(text)`                                 | Tombol pembayaran Telegram Stars        |
| `Markup.button.switchInlineQuery(text, query)`            | Buka inline mode                        |
| `Markup.button.switchInlineQueryCurrentChat(text, query)` | Inline mode di chat saat ini            |
| `Markup.button.login(text, loginUrl)`                     | Tombol Login Telegram (OAuth)           |
| `Markup.button.copy(text, textToCopy)`                    | Salin teks ke clipboard (API 9.6)       |

### Contoh: Login Button

```typescript
await ctx.reply('Login ke aplikasi kami:', {
    reply_markup: Markup.inlineKeyboard([
        [
            Markup.button.login('🔑 Login dengan Telegram', {
                url: 'https://auth.contoh.com/telegram',
                request_write_access: true,
            }),
        ],
    ]),
});
```

### Contoh: Copy Button

```typescript
await ctx.reply('Kode referral Anda:', {
    reply_markup: Markup.inlineKeyboard([[Markup.button.copy('📋 Salin Kode', 'REF-ABCD1234')]]),
});
```

## Paginasi

Buat keyboard yang bisa di-navigate halaman demi halaman:

```typescript
const produk = Array.from({ length: 50 }, (_, i) => ({
    text: `Produk ${i + 1}`,
    callback_data: `produk_${i + 1}`,
}));

await ctx.reply('Daftar produk:', {
    reply_markup: Markup.pagination(produk, {
        currentPage: 1,
        itemsPerPage: 6,
        actionNext: 'hal_berikut',
        actionPrev: 'hal_sebelum',
        columns: 2,
        pageIndicatorPattern: 'Hal {current}/{total}',
    })
});

// Handler navigasi
bot.action('hal_berikut', async ctx => {
    const halaman = getCurrentPage(ctx) + 1;
    await ctx.editMessageReplyMarkup(
        Markup.pagination(produk, { currentPage: halaman, ... })
    );
});
```

## Reply Keyboard

Keyboard yang menggantikan keyboard native di bawah layar:

```typescript
await ctx.reply('Pilih menu:', {
    reply_markup: Markup.keyboard(
        [
            [Markup.replyButton.text('📦 Produk'), Markup.replyButton.text('🛒 Keranjang')],
            [Markup.replyButton.text('👤 Profil'), Markup.replyButton.text('📞 Bantuan')],
        ],
        {
            resize_keyboard: true,
            input_field_placeholder: 'Pilih menu...',
        }
    ),
});
```

### Tombol Reply Khusus

```typescript
// Minta nomor telepon
Markup.replyButton.requestContact('📱 Bagikan Kontak');

// Minta lokasi GPS
Markup.replyButton.requestLocation('📍 Bagikan Lokasi');

// Minta buat polling
Markup.replyButton.requestPoll('📊 Buat Poll', 'regular');
```

## Hapus Keyboard

```typescript
await ctx.reply('Keyboard dihapus.', {
    reply_markup: Markup.removeKeyboard(),
});
```

## Force Reply

Paksa pengguna untuk membalas pesan bot:

```typescript
await ctx.reply('Masukkan nama Anda:', {
    reply_markup: Markup.forceReply({
        input_field_placeholder: 'Ketik nama...',
    }),
});
```
