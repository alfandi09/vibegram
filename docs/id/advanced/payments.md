# Telegram Stars & Pembayaran

<SecurityNote title="Keamanan pembayaran" variant="warning">
Validasi harga, payload, dan pre-checkout query di server. Jangan percaya state client
saat memenuhi konten berbayar.
</SecurityNote>

<FeatureGrid title="Permukaan pembayaran" description="Gunakan Telegram payments untuk invoice dan Stars untuk monetisasi konten digital.">
  <FeatureCard title="Invoice" description="Buat flow pembayaran dengan API invoice Telegram." href="#invoice" cta="Buka invoice" />
  <FeatureCard title="Stars" description="Kelola monetisasi konten digital dengan metode Stars." href="#telegram-stars" cta="Buka Stars" />
  <FeatureCard title="Checkout" description="Jawab pre-checkout query sebelum fulfillment." href="#pre-checkout" cta="Buka checkout" />
</FeatureGrid>

VibeGram mendukung sistem pembayaran bawaan Telegram, termasuk Telegram Stars untuk monetisasi konten digital.

## Mengirim Media Berbayar

```typescript
bot.command('premium', async ctx => {
    await ctx.replyWithPaidMedia(
        15, // Harga dalam Telegram Stars
        [{ type: 'photo', media: 'https://contoh.com/konten-premium.jpg' }],
        { caption: '📸 Konten Premium — 15 Stars' }
    );
});
```

## Invoice

```typescript
bot.command('beli', async ctx => {
    await ctx.replyWithInvoice({
        title: 'Keanggotaan Pro',
        description: 'Akses 30 hari ke fitur premium',
        payload: 'keanggotaan_pro_30h',
        provider_token: 'TOKEN_PENYEDIA_PEMBAYARAN',
        currency: 'USD',
        prices: [{ label: 'Keanggotaan Pro', amount: 999 }], // $9.99
    });
});
```

## Pre-Checkout

```typescript
bot.on('pre_checkout_query', async ctx => {
    // Validasi pesanan sebelum dikenakan biaya
    const payload = ctx.update.pre_checkout_query?.invoice_payload;

    if (payload === 'keanggotaan_pro_30h') {
        await ctx.answerPreCheckoutQuery(true);
    } else {
        await ctx.answerPreCheckoutQuery(false, 'Produk tidak ditemukan.');
    }
});
```

## Pembayaran Berhasil

```typescript
bot.on('message', async ctx => {
    if (ctx.message?.successful_payment) {
        const pembayaran = ctx.message.successful_payment;
        const jumlah = pembayaran.total_amount / 100; // konversi dari sen

        await ctx.reply(
            `✅ Pembayaran ${jumlah} ${pembayaran.currency} diterima!\n` +
                `ID Transaksi: ${pembayaran.telegram_payment_charge_id}`
        );

        // Aktifkan fitur premium untuk pengguna
        await aktivasiPremium(ctx.from!.id);
    }
});
```

## Refund Telegram Stars

```typescript
bot.command('refund', async ctx => {
    const chargeId = ctx.command?.args?.[0];
    if (!chargeId) return ctx.reply('Masukkan ID transaksi.');

    await ctx.refundStarPayment(ctx.from!.id, chargeId);
    await ctx.reply('✅ Stars dikembalikan ke pengguna.');
});
```

## Gift Stars (Bot API 9.x)

```typescript
// Kirim hadiah Stars ke pengguna
bot.command('hadiah', async ctx => {
    const gifts = await ctx.getAvailableGifts();
    const giftId = gifts.gifts[0].id;

    await ctx.sendGift(ctx.from!.id, giftId, {
        text: '🎁 Terima kasih telah menggunakan bot kami!',
    });
});

// Lihat Stars yang dimiliki bot
bot.command('saldo', async ctx => {
    const saldo = await ctx.getStarBalance();
    await ctx.reply(`💫 Saldo Stars bot: ${saldo.amount}`);
});
```

## Riwayat Transaksi

```typescript
bot.command('transaksi', async ctx => {
    const riwayat = await ctx.getStarTransactions({ limit: 10 });
    const daftar = riwayat.transactions.map(t => `• ${t.amount} Stars — ${t.date}`).join('\n');
    await ctx.reply(`📊 10 Transaksi Terakhir:\n${daftar}`);
});
```

## Tombol Pembayaran di Keyboard

```typescript
import { Markup } from 'vibegram';

await ctx.reply('Lanjutkan pembelian:', {
    reply_markup: Markup.inlineKeyboard([[Markup.button.pay('💳 Bayar Sekarang')]]),
});
```
