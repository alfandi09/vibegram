# Logger

Middleware logger bawaan untuk debugging dan observabilitas — mencatat setiap update beserta waktu pemrosesan.

## Memulai Cepat

```typescript
import { Bot, logger } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(logger());
```

## Format Output

Setiap update dicatat dalam format:

```
[VibeGram] message dari Budi (chat: 123456) — 3ms
[VibeGram] callback_query dari Siti (chat: 789012) — 1ms
[VibeGram] inline_query dari Admin (chat: 345678) — 2ms
```

## Penempatan

Daftarkan logger sebagai **middleware pertama** agar bisa mengukur waktu seluruh pipeline:

```typescript
bot.use(logger());       // ← Pertama
bot.use(rateLimit());
bot.use(session());
// handler...
```

## Contoh Output Lengkap

```
[VibeGram] message dari Budi (chat: 987654321) — 12ms
[VibeGram] command(/start) dari Siti (chat: 123456789) — 5ms
[VibeGram] callback_query dari Ahmad (chat: 111222333) — 3ms
[VibeGram] photo dari Anonymous (chat: 444555666) — 8ms
```

::: tip Debug Performa
Jika waktu pemrosesan > 100ms secara konsisten, pertimbangkan:
- Menambahkan `apiCache` untuk mengurangi panggilan API
- Mengoptimalkan query database di handler
- Menggunakan Redis untuk session store di lingkungan produksi
:::
