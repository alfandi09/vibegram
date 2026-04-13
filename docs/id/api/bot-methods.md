# Metode Bot

Metode yang tersedia langsung di instansi `Bot` (tidak memerlukan Context).

## Metode Instance

| Metode | Deskripsi |
|--------|-----------|
| `bot.launch(opts?)` | Mulai long-polling |
| `bot.stop(reason?)` | Hentikan polling dengan graceful |
| `bot.handleUpdate(update)` | Proses objek update mentah secara manual |
| `bot.webhookCallback(secretToken?)` | Buat handler webhook kompatibel Express |
| `bot.callApi(method, params?)` | Panggil metode API Telegram apa pun secara langsung |
| `bot.validateWebAppData(initData, opts?)` | Validasi initData Mini App |
| `bot.getMe()` | Ambil info bot |
| `bot.setMyCommands(commands, extra?)` | Set menu command |
| `bot.getMyCommands(extra?)` | Ambil daftar command |
| `bot.deleteMyCommands(extra?)` | Hapus menu command |
| `bot.setWebhook(url, opts?)` | Daftarkan webhook ke Telegram |
| `bot.deleteWebhook(opts?)` | Hapus webhook aktif |
| `bot.getWebhookInfo()` | Ambil info webhook aktif |
| `bot.plugin(plugin)` | Install plugin |

## Metode Routing

Diturunkan dari `Composer`:

| Metode | Deskripsi |
|--------|-----------|
| `bot.use(middleware)` | Daftarkan middleware |
| `bot.command(name, handler)` | Tangani pesan `/command` |
| `bot.hears(trigger, handler)` | Cocokkan pola teks |
| `bot.on(event, handler)` | Dengarkan tipe update |
| `bot.action(trigger, handler)` | Tangani klik tombol callback |
| `bot.catch(handler)` | Global error handler |

## Panggilan API Langsung

Untuk metode yang belum tersedia sebagai shortcut di Context:

```typescript
// Panggil metode API Telegram apa pun
const hasil = await bot.callApi('sendMessage', {
    chat_id: 123456,
    text: 'Halo dari callApi!'
});

// Set webhook
await bot.callApi('setWebhook', {
    url: 'https://domain.anda.com/webhook',
    secret_token: 'token-rahasia-saya'
});

// Forward pesan
await bot.callApi('forwardMessage', {
    chat_id: targetChatId,
    from_chat_id: sourceChatId,
    message_id: messageId,
});
```

## Opsi Launch

```typescript
await bot.launch({
    // Callback saat bot online
    onStart: (me) => {
        console.log(`@${me.username} online!`);
    },
    // Opsi polling tambahan
    dropPendingUpdates: true, // Abaikan update yang menumpuk saat restart
    allowedUpdates: ['message', 'callback_query'], // Filter jenis update
});
```

## Plugin API

```typescript
// Install plugin kelas
bot.plugin(new AnalyticsPlugin('https://analytics.example.com'));

// Install plugin fungsional
bot.plugin(greetingPlugin({ pesan: 'Halo!' }));

// Install preset (beberapa plugin sekaligus)
bot.plugin(produksiPreset);
```
