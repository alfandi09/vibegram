# Conversation

<FeatureGrid title="Gunakan conversation untuk flow non-linear" description="Handler conversation tetap mudah dibaca karena wait, validasi, branching, dan timeout ditulis sebagai kode async biasa.">
  <FeatureCard title="Wait helper bertipe" description="Tunggu teks, media, callback query, kontak, lokasi, atau input campuran." href="#metode-wait" cta="Buka wait" />
  <FeatureCard title="Validasi dan retry" description="Minta pengguna mengirim ulang saat input tidak cocok dengan aturan validasi." href="#c-waitfortext-opts" cta="Buka validasi" />
  <FeatureCard title="Branching normal" description="Gunakan if/else, loop, dan try/catch untuk flow order atau support yang kompleks." href="#contoh-form-pembelian" cta="Buka contoh" />
</FeatureGrid>

<MethodSignature
  name="Conversation.waitForAny"
  signature="const input = await c.waitForAny(options)"
  returns="Promise&lt;ConversationAnyResult&gt;"
  :params="[
    { name: 'options', type: 'WaitOptions', required: false, description: 'Timeout, validasi, dan pesan error validasi.' }
  ]"
/>

Conversation memungkinkan bot menjalankan dialog interaktif secara linear menggunakan sintaks `async/await` — bot bisa "menunggu" respons pengguna tanpa callback yang rumit.

## Konsep Dasar

```typescript
import { Conversation, Bot, session } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session());

const conv = new Conversation();

conv.define('daftar', async (ctx, c) => {
    // Langkah 1: Tanya nama
    await ctx.reply('Siapa nama Anda?');
    const nama = await c.waitForText();

    // Langkah 2: Tanya usia
    await ctx.reply(`Halo ${nama}! Berapa usia Anda?`);
    const usia = await c.waitForText({
        validate: ctx => !isNaN(Number(ctx.message?.text)),
        validationError: 'Masukkan angka yang valid:',
    });

    await ctx.reply(`✅ Terdaftar: ${nama}, ${usia} tahun.`);
});

bot.use(conv.middleware());
bot.command('daftar', ctx => conv.enter('daftar', ctx));
```

## Opsi Conversation

```typescript
const conv = new Conversation({
    defaultTimeout: 5 * 60 * 1000, // 5 menit (default)
});
```

::: tip Auto Cleanup
Saat pengguna meninggalkan percakapan tanpa menyelesaikannya, conversation otomatis dibersihkan setelah `defaultTimeout` berlalu — mencegah memory leak.
:::

## Metode Wait

### `c.waitForText(opts?)`

Tunggu pesan teks dari pengguna:

```typescript
const jawaban = await c.waitForText({
    // Validasi input (opsional)
    validate: ctx => ctx.message?.text?.length > 2,
    validationError: 'Terlalu pendek! Coba lagi:',
    // Timeout khusus (opsional)
    timeout: 30_000, // 30 detik
});
```

### `c.wait(opts?)`

Tunggu update apa pun:

```typescript
const update = await c.wait({ timeout: 60_000 });
const foto = update.message?.photo;
```

### `c.waitForAny(opts?)`

Tunggu teks, tombol inline, atau media umum dalam satu langkah:

```typescript
const input = await c.waitForAny({
    validationError: 'Kirim teks, tekan tombol, atau lampirkan media.',
});

if (input.type === 'text') {
    await ctx.reply(`Teks: ${input.text}`);
} else if (input.type === 'callback') {
    await ctx.reply(`Tombol: ${input.data}`);
} else if (input.mediaType === 'photo') {
    await ctx.reply(`Jumlah varian foto: ${input.media.length}`);
} else {
    await ctx.reply(`Tipe media: ${input.mediaType}`);
}
```

### `c.waitForCallbackQuery(data?)`

Tunggu klik tombol inline:

```typescript
import { Markup } from 'vibegram';

await ctx.reply('Pilih satu:', {
    reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Ya ✅', 'ya'), Markup.button.callback('Tidak ❌', 'tidak')],
    ]),
});

const cbCtx = await c.waitForCallbackQuery(['ya', 'tidak']);
const pilihan = cbCtx.update.callback_query?.data; // 'ya' atau 'tidak'
await cbCtx.answerCbQuery();
```

## Contoh: Form Pembelian

```typescript
conv.define('beli', async (ctx, c) => {
    // Langkah 1: Nama produk
    await ctx.reply('📦 Produk apa yang ingin Anda beli?');
    const produk = await c.waitForText();

    // Langkah 2: Jumlah dengan validasi
    await ctx.reply('🔢 Berapa jumlahnya? (1-100)');
    const jumlah = await c.waitForText({
        validate: ctx => {
            const n = Number(ctx.message?.text);
            return Number.isInteger(n) && n >= 1 && n <= 100;
        },
        validationError: '❌ Masukkan angka antara 1-100:',
    });

    // Langkah 3: Konfirmasi
    await ctx.reply(
        `Konfirmasi pesanan:\n` + `Produk: ${produk}\nJumlah: ${jumlah}\n\n` + `Lanjutkan?`,
        {
            reply_markup: Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Ya, pesan!', 'konfirm'),
                    Markup.button.callback('❌ Batal', 'batal'),
                ],
            ]),
        }
    );

    const cbCtx = await c.waitForCallbackQuery(['konfirm', 'batal']);
    await cbCtx.answerCbQuery();

    if (cbCtx.update.callback_query?.data === 'konfirm') {
        await ctx.reply(`🎉 Pesanan ${jumlah}x ${produk} dikonfirmasi!`);
    } else {
        await ctx.reply('❌ Pemesanan dibatalkan.');
    }
});
```

## Memeriksa Status Conversation

```typescript
// Apakah pengguna sedang dalam percakapan?
if (conv.isActive(ctx)) {
    await ctx.reply('Selesaikan percakapan saat ini terlebih dahulu.');
}

// Jumlah percakapan yang aktif
console.log(`Percakapan aktif: ${conv.activeCount}`);
```

## Keluar dari Conversation

Keluar dari conversation secara paksa:

```typescript
// Dari luar handler
conv.leave(ctx);

// Dari dalam handler conversation
conv.define('tanya', async (ctx, c) => {
    await ctx.reply('Ketik /batal untuk keluar.');
    // c tidak memiliki metode leave — gunakan conv langsung
});

bot.command('batal', ctx => {
    conv.leave(ctx);
    ctx.reply('Percakapan dibatalkan. ❌');
});
```
