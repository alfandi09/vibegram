# Queue & Broadcasting

`BotQueue` menyediakan broadcasting massal dengan rate-limiting dan penjadwalan tugas — penting bagi bot yang perlu mengirim pesan ke ribuan pengguna tanpa menyentuh batas Telegram.

## Memulai Cepat

```typescript
import { Bot, BotQueue } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

const queue = new BotQueue(bot.client, {
    concurrency: 25,    // 25 pesan per batch
    delayMs: 1000       // 1 detik antar batch
});
```

## Broadcasting

### Kirim ke Banyak Pengguna

```typescript
const userIds = [123456, 789012, 345678, /* ...ribuan */];

const hasil = await queue.broadcastMessage(
    userIds,
    '📢 Pengumuman penting!',
    { parse_mode: 'HTML' }
);

console.log(`✅ ${hasil.success} terkirim, ❌ ${hasil.failed} gagal, ⏱️ ${hasil.durationMs}ms`);
```

### Logika Broadcast Kustom

```typescript
const hasil = await queue.broadcast(userIds, async (chatId) => {
    await bot.callApi('sendPhoto', {
        chat_id: chatId,
        photo: 'https://contoh.com/promo.jpg',
        caption: '🎉 Promo spesial hari ini!'
    });
});
```

### Pelacakan Progres

```typescript
const queue = new BotQueue(bot.client, {
    concurrency: 30,
    delayMs: 1000,
    onProgress: (selesai, total) => {
        const persen = Math.round(selesai / total * 100);
        console.log(`Progres: ${selesai}/${total} (${persen}%)`);
    },
    onError: (err, chatId) => {
        console.error(`Gagal untuk chat ${chatId}: ${err.message}`);
    }
});
```

## Hasil Broadcast

```typescript
interface BroadcastResult {
    total: number;      // Total penerima
    success: number;    // Berhasil dikirim
    failed: number;     // Gagal dikirim
    errors: Array<{     // Daftar error detail
        chatId: number | string;
        error: Error;
    }>;
    durationMs: number; // Waktu total
}
```

## Penjadwalan

### Job Berulang

```typescript
// Jalankan setiap 60 detik
queue.scheduleInterval('tip_harian', 60_000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: '@channel_saya',
        text: '💡 Tips hari ini: Minum air yang cukup!'
    });
});
```

### Job Sekali Eksekusi

```typescript
// Jalankan sekali setelah 5 menit
queue.scheduleOnce('pengingat', 5 * 60_000, async () => {
    await bot.callApi('sendMessage', {
        chat_id: userId,
        text: '⏰ Pengingat: Sesi Anda akan segera berakhir!'
    });
});
```

### Batalkan Job

```typescript
queue.cancelScheduled('tip_harian');  // Batalkan berdasarkan ID
queue.cancelAllScheduled();           // Batalkan semua job
```

## Referensi API

| Metode | Deskripsi |
|--------|-----------|
| `queue.broadcast(ids, fn, opts?)` | Broadcast kustom dengan rate limiting |
| `queue.broadcastMessage(ids, text, extra?)` | Kirim teks ke banyak pengguna |
| `queue.scheduleInterval(id, ms, fn)` | Job berulang berkala |
| `queue.scheduleOnce(id, ms, fn)` | Job sekali dengan delay |
| `queue.cancelScheduled(id)` | Batalkan job berdasarkan ID |
| `queue.cancelAllScheduled()` | Batalkan semua job |
| `queue.stopBroadcast()` | Hentikan broadcast yang sedang berjalan |
| `queue.activeJobs` | Jumlah job aktif |

## Strategi Rate Limit

Queue memproses pesan dalam batch:

1. Kirim `concurrency` pesan secara bersamaan (default: 25)
2. Tunggu `delayMs` milidetik (default: 1000)
3. Ulangi hingga semua pesan terkirim

Ini tetap di bawah batas Telegram ~30 pesan/detik, mencegah error 429.

::: warning
Selalu tangani `onError` di produksi — pengguna mungkin memblokir bot, chat mungkin sudah dihapus. Gagal kirim adalah hal normal dalam skala besar.
:::
