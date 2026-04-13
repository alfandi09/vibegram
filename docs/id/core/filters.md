# Filter Combinator

Filter combinator memungkinkan Anda menyusun kondisi routing yang kompleks menggunakan logika `and()`, `or()`, dan `not()` — dikombinasikan dengan 20+ predikat bawaan.

## Memulai Cepat

```typescript
import { Bot, and, or, not, isPrivate, isGroup, isAdmin, hasText, hasPhoto } from 'vibegram';

// Hanya merespons teks di chat privat
bot.on('message', and(isPrivate, hasText), async (ctx, next) => {
    console.log('Pesan teks di chat privat');
    await next();
});

// Perintah khusus admin di grup
bot.command('ban', and(isGroup, isAdmin()), async (ctx) => {
    await ctx.reply('Aksi admin berhasil.');
});
```

## Combinator

| Fungsi | Deskripsi |
|--------|-----------|
| `and(...filter)` | Semua filter harus lolos |
| `or(...filter)` | Minimal satu filter harus lolos |
| `not(filter)` | Membalik hasil filter |

## Predikat Bawaan

### Tipe Chat

| Predikat | Deskripsi |
|----------|-----------|
| `isPrivate` | Chat privat (DM) |
| `isGroup` | Grup atau supergrup |
| `isSupergroup` | Hanya supergrup |
| `isChannel` | Posting channel |

### Tipe Pengguna

| Predikat | Deskripsi |
|----------|-----------|
| `isBot` | Pesan dari bot lain |
| `isHuman` | Pesan dari pengguna nyata |
| `isUser(...ids)` | ID pengguna tertentu |
| `isAdmin()` | Admin atau kreator chat (async) |

### Tipe Konten

| Predikat | Deskripsi |
|----------|-----------|
| `hasText` | Pesan berisi teks |
| `hasPhoto` | Pesan berisi foto |
| `hasDocument` | Pesan berisi dokumen |
| `hasVideo` | Pesan berisi video |
| `hasAudio` | Pesan berisi audio |
| `hasVoice` | Pesan berisi pesan suara |
| `hasSticker` | Pesan berisi stiker |
| `hasAnimation` | Pesan berisi GIF |
| `hasLocation` | Pesan berisi lokasi |
| `hasContact` | Pesan berisi kontak |

### Properti Pesan

| Predikat | Deskripsi |
|----------|-----------|
| `isForwarded` | Pesan diteruskan (forward) |
| `isReply` | Pesan adalah balasan |
| `isCallbackQuery` | Update adalah callback query |
| `isInlineQuery` | Update adalah inline query |

### Predikat Kustom

| Factory | Deskripsi |
|---------|-----------|
| `isChat(...ids)` | ID chat tertentu |
| `hasTextContaining(str)` | Teks atau caption mengandung substring |

## Contoh Penggunaan

```typescript
// Foto atau video dari pengguna nyata (bukan bot)
bot.on('message', and(not(isBot), or(hasPhoto, hasVideo)), ctx => {
    ctx.reply('Media diterima dari pengguna nyata.');
});

// Perintah khusus VIP
const VIP_IDS = [123456, 789012];
bot.command('vip', isUser(...VIP_IDS), ctx => {
    ctx.reply('Selamat datang, VIP! 🌟');
});

// Perintah admin hanya di supergrup
bot.command('pengaturan', and(isSupergroup, isAdmin()), ctx => {
    ctx.reply('Panel pengaturan grup.');
});

// Abaikan pesan bot dari grup
bot.on('message', and(isGroup, not(isBot)), async (ctx, next) => {
    console.log('Pesan manusia di grup:', ctx.message?.text);
    await next();
});

// Hanya untuk chat tertentu
const CHANNEL_ID = -100123456789;
bot.on('channel_post', isChat(CHANNEL_ID), ctx => {
    console.log('Posting baru di channel kita!');
});
```

::: info isAdmin() & Caching
`isAdmin()` memanggil API `getChatMember` — gunakan middleware [API Cache](/id/security/caching) untuk menghindari panggilan berulang yang tidak perlu.
:::
