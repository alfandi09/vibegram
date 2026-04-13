# Pipeline Middleware

Sistem middleware VibeGram menggunakan model **onion** (seperti Koa.js) — setiap middleware membungkus yang berikutnya, memungkinkan eksekusi logika **sebelum dan sesudah** handler berikutnya.

## Cara Kerja

```
Request → MW1 → MW2 → MW3 → Handler
                            ↓
Response ← MW1 ← MW2 ← MW3 ←
```

Setiap middleware menerima `ctx` (Context) dan `next` (fungsi untuk meneruskan ke middleware berikutnya):

```typescript
bot.use(async (ctx, next) => {
    console.log('Sebelum handler');
    await next(); // lanjutkan ke middleware/handler berikutnya
    console.log('Sesudah handler');
});
```

## Mendaftarkan Middleware

### `bot.use()`

Daftarkan satu atau beberapa middleware:

```typescript
bot.use(middleware1, middleware2, middleware3);
```

### Middleware Berantai

```typescript
const logger = async (ctx, next) => {
    const mulai = Date.now();
    await next();
    console.log(`Update diproses dalam ${Date.now() - mulai}ms`);
};

const authCheck = async (ctx, next) => {
    const ADMIN_ID = 123456789;
    if (ctx.from?.id !== ADMIN_ID) {
        return ctx.reply('⛔ Akses ditolak.');
    }
    await next();
};

bot.use(logger, authCheck);
```

## Urutan Eksekusi

Middleware dieksekusi **sesuai urutan pendaftaran**:

```typescript
bot.use(async (ctx, next) => { console.log('1'); await next(); console.log('4'); });
bot.use(async (ctx, next) => { console.log('2'); await next(); console.log('3'); });
bot.command('test', () => console.log('Handler'));

// Menghasilkan: 1 → 2 → Handler → 3 → 4
```

## Menghentikan Rantai

Jangan panggil `next()` untuk menghentikan pemrosesan lebih lanjut:

```typescript
bot.use(async (ctx, next) => {
    if (ctx.from?.is_bot) {
        return; // abaikan pesan dari bot lain
    }
    await next();
});
```

## Error dalam Middleware

Gunakan `bot.catch()` untuk menangkap error dari semua middleware:

```typescript
bot.catch((err, ctx) => {
    console.error(`Error pada update ${ctx.update.update_id}:`, err);
    ctx.reply('Terjadi kesalahan. Coba lagi nanti.');
});
```

## Middleware Bawaan

VibeGram menyertakan middleware siap pakai:

```typescript
import { session, rateLimit, logger } from 'vibegram';

bot.use(logger());           // Log setiap update
bot.use(session());          // Aktifkan session per-pengguna
bot.use(rateLimit());        // Batasi request berlebihan
```

## Komposisi Middleware

Buat middleware yang bisa digunakan kembali:

```typescript
import { Composer } from 'vibegram';

// Buat sub-composer untuk admin saja
const admin = new Composer();
admin.command('ban', ctx => ctx.banChatMember(targetId));
admin.command('kick', ctx => ctx.banChatMember(targetId, { revoke_messages: true }));

// Pasang hanya untuk admin
bot.use(Composer.guard(ctx => ctx.from?.id === ADMIN_ID, admin));
```
