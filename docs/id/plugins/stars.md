# Stars

`@vibegram/stars` menyediakan helper production untuk pembayaran Telegram Stars: invoice builder, approval/decline pre-checkout, validasi successful payment, refund, workflow gift/business, dan fixture paid update untuk test.

Gunakan saat bot menjual digital goods, paid media, akses premium, gift, atau fitur Mini App melalui Telegram Stars.

## Mapping Resmi Telegram

Plugin ini membungkus behavior Telegram Bot API tanpa mengubahnya.

Invoice Stars adalah invoice Telegram biasa dengan `currency: "XTR"`, `provider_token` kosong, dan tepat satu item `prices`. Plugin memvalidasi aturan ini sebelum request masuk ke Telegram.

Update pre-checkout datang sebagai `Update.pre_checkout_query` dan harus dijawab dengan `answerPreCheckoutQuery`. Pembayaran selesai datang sebagai `message.successful_payment`. Refund dilakukan lewat `refundStarPayment`. Pembelian paid media datang sebagai `purchased_paid_media`.

Referensi: [Payments](https://core.telegram.org/bots/api#payments), [sendInvoice](https://core.telegram.org/bots/api#sendinvoice), [createInvoiceLink](https://core.telegram.org/bots/api#createinvoicelink), [answerPreCheckoutQuery](https://core.telegram.org/bots/api#answerprecheckoutquery), [PreCheckoutQuery](https://core.telegram.org/bots/api#precheckoutquery), [SuccessfulPayment](https://core.telegram.org/bots/api#successfulpayment), [refundStarPayment](https://core.telegram.org/bots/api#refundstarpayment), [sendPaidMedia](https://core.telegram.org/bots/api#sendpaidmedia), dan [BusinessConnection](https://core.telegram.org/bots/api#businessconnection).

## Install

Saat package plugin resmi ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/stars
```

Untuk saat ini, gunakan package repository sebagai local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/stars": "file:../vibegram/plugins/stars"
  }
}
```

## Setup

```typescript
import { Bot } from 'vibegram';
import { stars } from '@vibegram/stars';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.use(stars());
```

Middleware menambahkan helper request-scoped `ctx.stars` dan memulihkan nilai sebelumnya setelah handler selesai.

## Invoice Stars

```typescript
bot.command('beli', ctx => {
    return ctx.stars.invoice({
        title: 'Akses Premium',
        description: 'Akses premium 30 hari',
        payload: `premium:${ctx.from?.id}`,
        amount: 100,
        label: 'Premium',
    });
});
```

`ctx.stars.invoice()` mengirim `sendInvoice` ke chat saat ini dengan payload ini:

```typescript
{
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: 'Premium', amount: 100 }]
}
```

Untuk subscription, gunakan periode 30 hari yang didukung Telegram:

```typescript
await ctx.stars.invoice({
    title: 'Premium subscription',
    description: 'Akses premium recurring 30 hari',
    payload: `sub:${ctx.from?.id}`,
    amount: 500,
    subscriptionPeriod: 2592000,
});
```

## Invoice Link

```typescript
const link = await ctx.stars.createInvoiceLink({
    title: 'Akses Premium',
    description: 'Akses premium 30 hari',
    payload: 'premium:42',
    amount: 100,
});
```

Simpan `payload` di tabel order sebelum link dikirim.

## Guard Pre-Checkout

```typescript
bot.on('pre_checkout_query', async ctx => {
    try {
        await ctx.stars.approvePreCheckout({
            payloadPrefix: 'premium:',
            totalAmount: 100,
        });
    } catch {
        await ctx.stars.declinePreCheckout('Order ini sudah tidak tersedia.');
    }
});
```

Validasi:

- `currency` adalah `XTR`
- `total_amount` cocok dengan order di server
- `invoice_payload` ada di database
- order masih tersedia dan belum fulfilled

Telegram mengharapkan jawaban pre-checkout cepat. Jaga handler ini tetap ringan.

## Pembayaran Berhasil

```typescript
bot.on('message:successful_payment', async ctx => {
    const payment = ctx.stars.requireSuccessfulPayment({
        payloadPrefix: 'premium:',
    });

    await activatePremium({
        payload: payment.invoice_payload,
        chargeId: payment.telegram_payment_charge_id,
        amount: payment.total_amount,
    });

    await ctx.reply('Premium aktif.');
});
```

Lakukan fulfillment hanya setelah `successful_payment`, bukan setelah invoice dikirim atau pre-checkout disetujui.

## Refund

```typescript
await ctx.stars.refund(ctx.from!.id, 'telegram-payment-charge-id');
```

Saat sedang menangani update successful-payment:

```typescript
await ctx.stars.refundSuccessfulPayment();
```

Catat status refund di database agar command yang sama tidak mencoba refund berulang kali.

## Paid Media

```typescript
await ctx.stars.paidMedia({
    starCount: 25,
    payload: `gallery:${ctx.from?.id}`,
    media: [
        { type: 'photo', media: 'https://example.com/photo.jpg' },
    ],
    caption: 'Galeri premium',
});
```

Fixture purchase paid media untuk test:

```typescript
import { createPaidMediaPurchasedUpdate } from '@vibegram/stars';

const update = createPaidMediaPurchasedUpdate({
    userId: 42,
    paidMediaPayload: 'gallery:42',
});
```

## Gift Dan Business Workflow

```typescript
await ctx.stars.gifts.send(ctx.from!.id, 'gift-id', {
    text: 'Terima kasih sudah mendukung kami',
});

await ctx.stars.gifts.premium(ctx.from!.id, 3, 1000, {
    text: 'Hadiah Premium',
});
```

Helper business account:

```typescript
await ctx.stars.business.getStarBalance('business-connection-id');
await ctx.stars.business.transferStars('business-connection-id', 250);
await ctx.stars.business.convertGiftToStars('business-connection-id', 'owned-gift-id');
await ctx.stars.business.upgradeGift('business-connection-id', 'owned-gift-id', {
    star_count: 0,
});
await ctx.stars.business.transferGift('business-connection-id', 'owned-gift-id', 123456789);
```

Method ini membutuhkan business bot rights Telegram yang sesuai.

## Fixture Test

```typescript
import {
    createPreCheckoutQueryUpdate,
    createSuccessfulPaymentUpdate,
} from '@vibegram/stars';

const preCheckout = createPreCheckoutQueryUpdate({
    payload: 'premium:42',
    totalAmount: 100,
});

const successful = createSuccessfulPaymentUpdate({
    payload: 'premium:42',
    totalAmount: 100,
    telegramPaymentChargeId: 'charge-1',
});
```

## Options Dan API

Export utama: `stars()`, `buildStarsInvoice()`, `createPreCheckoutQueryUpdate()`, `createSuccessfulPaymentUpdate()`, `createPaidMediaPurchasedUpdate()`, `StarsPluginError`, `StarsFlavor`, dan type TypeScript terkait.

`buildStarsInvoice(options)` menerima:

| Option | Type | Deskripsi |
| --- | --- | --- |
| `title` | `string` | Nama produk, maksimal 32 karakter |
| `description` | `string` | Deskripsi produk, maksimal 255 karakter; default ke title |
| `payload` | `string` | Payload order server-side, maksimal 128 bytes |
| `amount` | `number` | Jumlah Stars saat memakai satu price otomatis |
| `label` | `string` | Label harga, default `Stars` |
| `prices` | `LabeledPrice[]` | Price list eksplisit; Stars wajib tepat satu item |
| `subscriptionPeriod` | `2592000` | Periode subscription 30 hari opsional |
| `extra` | object | Field invoice Telegram tambahan |

## Keamanan Dan Rekonsiliasi

- Buat invoice di server.
- Perlakukan `payload` sebagai order ID opaque, bukan state user yang dipercaya.
- Persist order sebelum invoice dikirim.
- Validasi pre-checkout dari database.
- Fulfill hanya setelah `successful_payment`.
- Buat fulfillment idempotent.
- Simpan `telegram_payment_charge_id` dan status refund.
- Gunakan `@vibegram/throttler` untuk offer berbayar skala broadcast dan jangan retry `sendInvoice` secara buta.

## Validasi

Plugin ini punya test untuk payload invoice Stars, handling pre-checkout, validasi successful payment, helper refund, helper gift/business, dan fixture paid media.

```bash
npm run plugins:validate
npm run docs:build
```
