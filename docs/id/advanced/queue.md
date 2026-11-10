# Queue & Broadcasting

<SecurityNote title="Broadcast dengan bertanggung jawab" variant="tip">
Masukkan broadcast dan background work ke queue agar satu panggilan Telegram API yang lambat
tidak memblokir update handler atau menyentuh limit platform.
</SecurityNote>

<FeatureGrid title="Use case queue" description="Gunakan queue saat pekerjaan perlu rate limit, retry, atau dipisahkan dari update masuk.">
  <FeatureCard title="Broadcasting" description="Kirim pesan ke banyak user tanpa menyentuh rate limit Telegram." href="#broadcasting" cta="Buka broadcast" />
  <FeatureCard title="Penjadwalan" description="Jalankan job sekali atau berulang di luar update handler." href="#penjadwalan" cta="Buka penjadwalan" />
  <FeatureCard title="Strategi rate limit" description="Atur concurrency dan jeda agar tetap di dalam batas Telegram." href="#strategi-rate-limit" cta="Buka strategi" />
</FeatureGrid>

`BotQueue` menyediakan broadcasting massal dengan rate-limiting dan penjadwalan tugas — penting bagi bot yang perlu mengirim pesan ke ribuan pengguna tanpa menyentuh batas Telegram.

## Memulai Cepat

```typescript
import { Bot, BotQueue } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const queue = new BotQueue(bot.client, {
    concurrency: 25, // 25 pesan per batch
    delayMs: 1000, // 1 detik antar batch
});
```

## Broadcasting

### Kirim ke Banyak Pengguna

```typescript
const userIds = [123456, 789012, 345678 /* ...ribuan */];

const hasil = await queue.broadcastMessage(userIds, '📢 Pengumuman penting!', {
    parse_mode: 'HTML',
});

console.log(`✅ ${hasil.success} terkirim, ❌ ${hasil.failed} gagal, ⏱️ ${hasil.durationMs}ms`);
```

### Logika Broadcast Kustom

```typescript
const hasil = await queue.broadcast(userIds, async chatId => {
    await bot.callApi('sendPhoto', {
        chat_id: chatId,
        photo: 'https://contoh.com/promo.jpg',
        caption: '🎉 Promo spesial hari ini!',
    });
});
```

### Pelacakan Progres

```typescript
const queue = new BotQueue(bot.client, {
    concurrency: 30,
    delayMs: 1000,
    onProgress: (selesai, total) => {
        const persen = Math.round((selesai / total) * 100);
        console.log(`Progres: ${selesai}/${total} (${persen}%)`);
    },
    onError: (err, chatId) => {
        console.error(`Gagal untuk chat ${chatId}: ${err.message}`);
    },
});
```

## Hasil Broadcast

```typescript
interface BroadcastResult {
    total: number; // Total penerima
    success: number; // Berhasil dikirim
    failed: number; // Gagal dikirim
    errors: Array<{
        // Daftar error detail
        chatId: number | string;
        error: Error;
    }>;
    durationMs: number; // Waktu total
}
```

## Penjadwalan

### Job Berulang

```typescript
// Berjalan setiap 24 jam (interval dalam milidetik)
queue.scheduleInterval('tip_harian', 24 * 60 * 60 * 1000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: '@channel_saya',
        text: '💡 Tips hari ini: Minum air yang cukup!',
    });
});
```

### Job Sekali Eksekusi

```typescript
// Jalankan sekali setelah 5 menit
queue.scheduleOnce('pengingat', 5 * 60_000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: userId,
        text: '⏰ Pengingat: Sesi Anda akan segera berakhir!',
    });
});
```

### Batalkan Job

```typescript
queue.cancelScheduled('tip_harian'); // Batalkan berdasarkan ID
queue.cancelAllScheduled(); // Batalkan semua job
```

## Referensi API

| Metode                                      | Deskripsi                               |
| ------------------------------------------- | --------------------------------------- |
| `queue.broadcast(ids, fn, opts?)`           | Broadcast kustom dengan rate limiting   |
| `queue.broadcastMessage(ids, text, extra?)` | Kirim teks ke banyak pengguna           |
| `queue.scheduleInterval(id, ms, fn)`        | Job berulang berkala                    |
| `queue.scheduleOnce(id, ms, fn)`            | Job sekali dengan delay                 |
| `queue.cancelScheduled(id)`                 | Batalkan job berdasarkan ID             |
| `queue.cancelAllScheduled()`                | Batalkan semua job                      |
| `queue.stopBroadcast()`                     | Hentikan broadcast yang sedang berjalan |
| `queue.activeJobs`                          | Jumlah job aktif                        |

## Menangani Pengiriman yang Gagal

Dalam skala besar, sebagian pengiriman pasti gagal: user memblokir bot
(`403 Forbidden`), menghapus akunnya, atau belum pernah memulai chat dengan bot. Hasil
broadcast mencantumkan setiap kegagalan, jadi Anda bisa berhenti mengirim ke user itu:

```typescript
import { TelegramApiError } from 'vibegram';

const hasil = await queue.broadcastMessage(userIds, 'Fitur baru sudah tersedia!');

const takTerjangkau = hasil.errors
    .filter(({ error }) => error instanceof TelegramApiError && error.errorCode === 403)
    .map(({ chatId }) => chatId);

await db.users.markInactive(takTerjangkau); // lewati mereka di broadcast berikutnya
```

`429 Too Many Requests` otomatis dicoba ulang oleh client (hingga 3 kali, menunggu
selama yang diminta Telegram), jadi hanya muncul di sini jika terus terjadi. Turunkan
`concurrency` atau naikkan `delayMs` jika Anda melihatnya.

## Batasan

`BotQueue` menyimpan semuanya **di memori proses**:

- Job terjadwal hilang saat bot restart atau di-deploy ulang. Buat ulang saat startup.
- Dengan **beberapa instance bot**, setiap instance menjalankan salinan job-nya
  sendiri, sehingga "tips harian" akan terkirim sekali per instance. Jalankan job
  terjadwal di satu instance saja, atau pakai scheduler eksternal (cron, job queue
  seperti BullMQ) untuk deployment multi-instance.
- Di platform serverless (Cloudflare Workers, Vercel), proses tidak hidup cukup lama
  untuk timer. Pakai cron trigger dari platformnya.
- Broadcast ke 100.000 user dengan kecepatan default butuh sekitar satu jam. Jalankan di
  luar update handler (misalnya dari command admin tanpa `await`, atau skrip terpisah)
  agar bot tetap bisa melayani user lain.

## Strategi Rate Limit

Queue memproses pesan dalam batch:

1. Kirim `concurrency` pesan secara bersamaan (default: 25)
2. Tunggu `delayMs` milidetik (default: 1000)
3. Ulangi hingga semua pesan terkirim

Ini tetap di bawah batas Telegram ~30 pesan/detik, mencegah error 429.

::: warning
Selalu tangani `onError` di produksi — pengguna mungkin memblokir bot, chat mungkin sudah dihapus. Gagal kirim adalah hal normal dalam skala besar.
:::
