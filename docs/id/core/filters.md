# Filter Combinator

**Filter** (atau predikat) adalah fungsi yang melihat `ctx` lalu menjawab ya atau
tidak: "apakah ini chat pribadi?", "apakah pesannya berisi foto?", "apakah pengirimnya
admin?". VibeGram menyediakan 20+ filter siap pakai dan tiga combinator, `and()`,
`or()`, dan `not()`, untuk menyusun kondisi besar dari kondisi kecil.

```typescript
import {
    Bot,
    and,
    or,
    not,
    isAdmin,
    isBot,
    isPrivate,
    isUser,
    hasDocument,
    hasPhoto,
    hasVideo,
} from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

// Foto atau video yang dikirim orang (bukan bot) di chat pribadi.
const mediaDariOrang = and(isPrivate, not(isBot), or(hasPhoto, hasVideo));

bot.filter(mediaDariOrang, ctx => ctx.reply('Media yang bagus!'));
```

## Memilih Alat yang Tepat

VibeGram punya tiga cara menjalankan handler hanya untuk update tertentu. Pilih yang
paling sederhana:

| Yang ingin dicocokkan | Gunakan | Contoh |
| --- | --- | --- |
| **Jenis** update atau pesan | [Filter query](/id/core/handling#filter-query) | `bot.on('message:photo', ...)` |
| **Kondisi** tentang chat, user, atau isi pesan | `bot.filter(predicate, ...)` | `bot.filter(isPrivate, ...)` |
| Kondisi **di depan satu handler** | Filter inline | `bot.command('ban', isAdmin(), ...)` |

Filter query juga mempersempit tipe TypeScript (`ctx.message.photo` dijamin ada), jadi
pakai itu untuk "pesan jenis apa ini". Pakai predikat di halaman ini untuk sisanya.

## Filter Inline Menghentikan Update

Filter yang ditaruh langsung di daftar argumen handler bekerja seperti gerbang. Jika
gagal, **update berhenti di situ** dan handler setelahnya tidak pernah menerimanya:

```typescript
bot.command('ban', isAdmin(), ctx => ctx.reply('Di-ban.'));
bot.command('ban', ctx => ctx.reply('Hanya admin yang bisa ban.')); // tidak pernah dijalankan
```

Sebaliknya, `bot.filter()` **meneruskan** update ke handler berikutnya saat predikat
gagal, dan biasanya inilah yang Anda inginkan untuk routing:

```typescript
bot.filter(isAdmin(), ctx => ctx.reply('Panel admin'));
bot.use(ctx => ctx.reply('Anda bukan admin.')); // berjalan untuk semua yang lain
```

## Combinator

| Fungsi | Lolos jika |
| --- | --- |
| `and(...filters)` | Semua filter lolos |
| `or(...filters)` | Minimal satu filter lolos |
| `not(filter)` | Filter gagal |

Combinator bisa disarangkan dengan bebas, dan hasilnya bisa dipakai sebagai filter
inline maupun di dalam `bot.filter()`, `guard()`, atau combinator lain:

```typescript
const mediaVip = and(isUser(111, 222), or(hasPhoto, hasVideo, hasDocument));

bot.on('message', mediaVip, ctx => ctx.reply('Upload VIP diterima.'));
bot.filter(not(mediaVip), ctx => ctx.reply('Upload hanya untuk anggota VIP.'));
```

## Predikat Bawaan

### Jenis Chat

| Predikat | Lolos untuk |
| --- | --- |
| `isPrivate` | Chat pribadi (satu lawan satu) |
| `isGroup` | Grup dan supergrup |
| `isSupergroup` | Supergrup saja |
| `isChannel` | Postingan channel |

### Pengirim

| Predikat | Lolos untuk |
| --- | --- |
| `isBot` | Pesan dari bot |
| `isHuman` | Pesan dari manusia |
| `isUser(...ids)` | Id user yang disebutkan |
| `isAdmin()` | Admin dan pemilik chat (selalu lolos di chat pribadi) |

### Isi Pesan

| Predikat | Lolos jika pesan berisi |
| --- | --- |
| `hasText` | Teks |
| `hasPhoto` | Foto |
| `hasDocument` | Dokumen (file) |
| `hasVideo` | Video |
| `hasAudio` | File audio |
| `hasVoice` | Voice note |
| `hasSticker` | Stiker |
| `hasAnimation` | GIF |
| `hasLocation` | Lokasi |
| `hasContact` | Kontak yang dibagikan |

### Pesan dan Update

| Predikat | Lolos jika |
| --- | --- |
| `isForwarded` | Pesan diteruskan (forward) |
| `isReply` | Pesan membalas pesan lain |
| `isCallbackQuery` | Update berupa penekanan tombol |
| `isInlineQuery` | Update berupa inline query |

### Factory

| Factory | Lolos jika |
| --- | --- |
| `isChat(...ids)` | Update berasal dari salah satu id chat |
| `hasTextContaining(text)` | Teks atau caption mengandung `text` (tanpa membedakan huruf besar/kecil) |
| `toFilter(predicate)` | Predikat buatan Anda lolos (membuatnya bisa dipakai inline) |

## Membuat Filter Sendiri

Fungsi apa pun berbentuk `(ctx) => boolean` (atau `Promise<boolean>`) adalah filter,
jadi bisa digabung dengan filter bawaan:

```typescript
import type { Context } from 'vibegram';

const jamKerja = (ctx: Context) => {
    const jam = new Date().getUTCHours();
    return jam >= 8 && jam < 17;
};

bot.filter(and(isPrivate, not(jamKerja)), ctx =>
    ctx.reply('Kami sedang offline. Kami membalas antara pukul 08.00 dan 17.00 UTC.')
);
```

Untuk memasang predikat buatan sendiri secara **inline** di daftar handler, bungkus
dengan `toFilter()`. Filter bawaan dan combinator sudah dibungkus. Fungsi
`(ctx) => boolean` polos yang dipasang inline tidak pernah memanggil `next()`, sehingga
handler-nya tidak akan pernah berjalan:

```typescript
import { toFilter } from 'vibegram';

const filterJamKerja = toFilter(jamKerja);
bot.command('bantuan', filterJamKerja, ctx => ctx.reply('Agen akan segera membalas.'));
```

Filter type-guard (`(ctx): ctx is MyContext => ...`) juga mempersempit tipe `ctx` di
dalam `bot.filter()` dan `guard()`.

::: tip `isAdmin()` memanggil Bot API
`isAdmin()` menanyakan status anggota pengirim ke Telegram di setiap update yang
dicek. Untuk grup yang ramai, cache hasilnya dengan plugin
[`@vibegram/chat-members`](/id/plugins/chat-members) atau [API cache](/id/security/caching).
:::
