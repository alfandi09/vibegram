# Pesan Draft (Bot API 9.5)

<ApiMethodCard title="Pesan draft" endpoint="sendMessageDraft" since="Bot API 9.5" returns="Hasil draft message" method="API">
  Pesan draft mengisi input pengguna dan cocok untuk reply terbimbing, teks berbantuan AI,
  dan flow completion.
</ApiMethodCard>

Pesan draft mengisi kolom input pengguna dengan teks tertentu. Berguna untuk auto-complete, saran input terbimbing, dan streaming teks AI.

## Penggunaan

```typescript
bot.command('draft', async ctx => {
    await ctx.replyWithDraft('Teks ini muncul di kolom input Anda...');
});
```

## Kasus Penggunaan

### Template Input Terbimbing

```typescript
bot.command('pesan', async ctx => {
    // Pra-isi format perintah
    await ctx.replyWithDraft('/kirim [nama_produk] [jumlah] [alamat]');
});

bot.command('laporan', async ctx => {
    await ctx.replyWithDraft('/laporan_bug [judul] [deskripsi] [langkah_reproduksi]');
});
```

### Streaming Teks AI

```typescript
bot.command('ai', async ctx => {
    const prompt = ctx.command?.args?.join(' ') || '';

    if (!prompt) {
        return ctx.reply('Masukkan pertanyaan setelah /ai');
    }

    // Stream respons AI sebagai draft (pengguna melihatnya bertahap)
    for await (const chunk of aiStream(prompt)) {
        await ctx.replyWithDraft(chunk);
    }

    // Kirim respons final sebagai pesan
    const responFinal = await aiComplete(prompt);
    await ctx.reply(responFinal);
});
```

### Auto-Complete Form

```typescript
bot.command('checkout', async ctx => {
    // Pra-isi format pemesanan
    await ctx.replyWithDraft('nama: | jumlah: | kota: ');
});
```

## API

| Metode                             | API Telegram       | Deskripsi                    |
| ---------------------------------- | ------------------ | ---------------------------- |
| `ctx.replyWithDraft(text, extra?)` | `sendMessageDraft` | Pra-isi kolom input pengguna |

::: info Keamanan ID
Draft message menggunakan `crypto.randomBytes(8)` untuk menghasilkan ID 64-bit yang aman, mencegah tabrakan bahkan di konkurensi tinggi.
:::

::: tip Streaming AI
Untuk streaming AI, kirim `replyWithDraft` setiap potongan teks, lalu tutup dengan `ctx.reply` untuk pesan final yang tetap di riwayat chat.
:::
