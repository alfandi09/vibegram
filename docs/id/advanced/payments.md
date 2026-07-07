# Telegram Stars & Pembayaran

<SecurityNote title="Keamanan pembayaran" variant="warning">
Validasi harga, payload, pre-checkout query, dan status fulfillment di server.
Jangan pernah percaya state client saat membuka konten berbayar.
</SecurityNote>

<FeatureGrid title="Permukaan pembayaran" description="Gunakan Telegram payments untuk invoice dan Stars untuk flow konten digital.">
  <FeatureCard title="Invoice" description="Buat flow pembayaran dengan API invoice Telegram." href="#invoice" />
  <FeatureCard title="Media berbayar" description="Jual konten digital dengan paid media berbasis Stars." href="#mengirim-media-berbayar" />
  <FeatureCard title="Checkout" description="Jawab pre-checkout query sebelum fulfillment." href="#pre-checkout" />
</FeatureGrid>

VibeGram mendukung invoice Telegram, validasi pre-checkout, update pembayaran
berhasil, paid media Telegram Stars, refund, gift, dan riwayat transaksi.

## Mengirim Media Berbayar

```ts
bot.command('premium', async ctx => {
    await ctx.replyWithPaidMedia(
        15,
        [{ type: 'photo', media: 'https://contoh.com/konten-premium.jpg' }],
        { caption: 'Konten premium - 15 Stars' }
    );
});
```

Gunakan paid media untuk konten digital yang fulfillment-nya terjadi di
Telegram.

## Invoice

```ts
bot.command('beli', async ctx => {
    await ctx.replyWithInvoice(
        'Keanggotaan Pro',
        'Akses 30 hari ke fitur premium',
        'keanggotaan_pro_30h',
        'USD',
        [{ label: 'Keanggotaan Pro', amount: 999 }],
        { provider_token: process.env.PAYMENT_PROVIDER_TOKEN! }
    );
});
```

Amount memakai unit terkecil untuk mata uang biasa. Untuk flow Stars, ikuti
aturan Telegram `XTR` dan requirement provider.

## Pre-Checkout

```ts
bot.on('pre_checkout_query', async ctx => {
    const payload = ctx.update.pre_checkout_query?.invoice_payload;

    if (payload === 'keanggotaan_pro_30h') {
        await ctx.answerPreCheckoutQuery(true);
    } else {
        await ctx.answerPreCheckoutQuery(false, 'Produk tidak ditemukan.');
    }
});
```

Selalu validasi payload, harga, user, dan ketersediaan sebelum menyetujui
charge.

## Pembayaran Berhasil

```ts
bot.on('message', async ctx => {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    await aktivasiPremium(ctx.from!.id, payment.telegram_payment_charge_id);

    await ctx.reply(
        `Pembayaran diterima: ${payment.total_amount} ${payment.currency}`
    );
});
```

Buat fulfillment idempotent dengan menyimpan Telegram payment charge ID sebelum
membuka fitur berbayar.

## Refund Telegram Stars

```ts
bot.command('refund', async ctx => {
    const chargeId = ctx.command?.args?.[0];
    if (!chargeId || !ctx.from) return ctx.reply('Kirim ID transaksi.');

    await ctx.refundStarPayment(ctx.from.id, chargeId);
    await ctx.reply('Stars dikembalikan.');
});
```

Buka command refund hanya untuk operator tepercaya atau flow admin yang
diproteksi.

## Gift Stars

```ts
bot.command('gift', async ctx => {
    if (!ctx.from) return;

    const gifts = await ctx.getAvailableGifts();
    const giftId = gifts.gifts[0]?.id;
    if (!giftId) return ctx.reply('Gift belum tersedia.');

    await ctx.sendGift(ctx.from.id, giftId, {
        text: 'Terima kasih sudah memakai bot.',
    });
});

bot.command('saldo', async ctx => {
    const balance = await ctx.getMyStarBalance();
    await ctx.reply(`Saldo Stars bot: ${balance.amount}`);
});
```

Gunakan `getAvailableGifts()` sebelum mengirim gift karena daftar gift bisa
berubah dari waktu ke waktu.

## Riwayat Transaksi

```ts
bot.command('transaksi', async ctx => {
    const history = await ctx.getStarTransactions({ limit: 10 });
    const lines = history.transactions.map(transaction => {
        return `${transaction.id}: ${transaction.amount.amount} Stars`;
    });

    await ctx.reply(lines.join('\n') || 'Belum ada transaksi.');
});
```

Simpan transaction ID di database sendiri jika flow fulfillment atau refund
bergantung padanya.

## Tombol Pembayaran

```ts
import { Markup } from 'vibegram';

await ctx.reply('Lanjutkan checkout:', {
    reply_markup: Markup.inlineKeyboard([[Markup.button.pay('Bayar sekarang')]]),
});
```

Tombol pembayaran Telegram hanya valid di pesan invoice dan harus mengikuti
aturan posisi dari Telegram.
