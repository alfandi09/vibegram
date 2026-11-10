# Bisnis, Hadiah, dan Stories

<ApiMethodCard title="Wrapper bisnis" endpoint="bot.*Business*" since="1.2.0" returns="Hasil Telegram API" method="BOT">
  Metode ini adalah wrapper level Bot untuk akun bisnis terhubung, hadiah, dan operasi story
  yang tidak bergantung pada satu update masuk.
</ApiMethodCard>

<SecurityNote title="Scope akun bisnis" variant="tip">
Panggil metode bisnis hanya saat Telegram sudah memberi business connection atau identifier
gift/story yang valid untuk akun yang dikelola.
</SecurityNote>

VibeGram menyediakan wrapper typed untuk metode akun bisnis, hadiah, dan stories Telegram. Gunakan wrapper ini saat bot mengelola akun bisnis yang terhubung atau saat butuh akses langsung di luar handler `Context`.

## Akun Bisnis

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

await bot.setBusinessAccountName('business-connection-id', 'Acme Support');

await bot.setBusinessAccountGiftSettings('business-connection-id', true, {
    unlimited_gifts: true,
    limited_gifts: true,
    unique_gifts: true,
    premium_subscription: true,
});
```

## Hadiah

```typescript
const gifts = await bot.getAvailableGifts();
const giftId = gifts.gifts[0]?.id;

if (giftId) {
    await bot.sendGift(123456789, giftId, {
        text: 'Terima kasih atas dukungannya!',
    });
}

const ownedGifts = await bot.getBusinessAccountGifts('business-connection-id', {
    limit: 10,
    sort_by_price: true,
});
```

## Stories

Story diposting atas nama akun bisnis, jadi butuh `business_connection_id`-nya. Telegram mengirimnya saat akun tersebut menghubungkan bot (update `business_connection`); simpan saat itu. Di dalam update bisnis, id ini juga tersedia sebagai `ctx.businessConnectionId`.

Kirim file-nya langsung (`Buffer`, atau `{ source, filename }`); vibegram mengunggahnya dan mengisi referensi `attach://` untuk Anda:

```typescript
import { readFile } from 'node:fs/promises';

bot.on('business_connection', async ctx => {
    const koneksi = ctx.update.business_connection!;
    await db.saveConnection(koneksi.user.id, koneksi.id); // simpan untuk nanti
});

await bot.postStory(
    connectionId,
    { type: 'photo', photo: await readFile('./launch.jpg') },
    21600, // tampil selama 6 jam
    {
        caption: 'Update peluncuran',
        post_to_chat_page: true,
    }
);
```

Untuk metode yang belum punya wrapper, gunakan `bot.callApi()` atau `ctx.telegram.callApi()` dengan bentuk payload resmi Telegram.
