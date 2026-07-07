# Logger

Middleware logger bawaan untuk debugging dan observabilitas.

Logger dirancang aman secara default untuk secret umum:

- control character dihapus
- konten panjang dipotong
- token bot Telegram dan string mirip JWT di-redact otomatis

## Memulai Cepat

```typescript
import { Bot, logger } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(logger());
```

## Konfigurasi Produksi Lebih Aman

```typescript
bot.use(
    logger({
        redactContent: true,
        maxContentLength: 80,
    })
);
```

Gunakan `redactContent: true` saat callback atau pesan mungkin berisi data customer,
referensi session, signed token, atau identifier internal.

## Opsi

| Opsi | Tipe | Deskripsi |
| --- | --- | --- |
| `printer` | `(message: string) => void` | Kirim output ke logger Anda sendiri, seperti Pino atau Winston |
| `timeFormatter` | `() => string` | Formatter timestamp custom |
| `redactContent` | `boolean` | Ganti teks pesan dan callback data dengan placeholder |
| `maxContentLength` | `number` | Potong konten dari user setelah jumlah karakter ini |
| `redactPatterns` | `RegExp[]` | Pola tambahan yang dibersihkan sebelum logging |

## Format Output

Setiap update dicatat:

```text
[VibeGram] message dari Budi (chat: 123456) - 3ms
[VibeGram] callback_query dari Siti (chat: 789012) - 1ms
```

## Penempatan

Daftarkan logger sebagai middleware pertama agar bisa mengukur waktu seluruh
pipeline:

```typescript
bot.use(logger());
bot.use(rateLimit());
bot.use(session());
// handlers...
```

## Catatan Keamanan

1. Jangan log full callback payload jika berisi signed state atau ID internal.
2. Prefer `redactContent: true` untuk bot support production dan bot admin.
3. Jika log dikirim ke platform terpusat, perlakukan log sebagai data operasional sensitif.

## Debug Performa

Jika waktu pemrosesan konsisten tinggi, pertimbangkan:

- menambahkan `apiCache()` untuk mengurangi panggilan Telegram API berulang
- mengoptimalkan query database di handler
- menggunakan Redis atau store eksternal lain untuk session production
