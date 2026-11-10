# Pesan Draft (Bot API 9.5)

<ApiMethodCard title="Pesan draft" endpoint="sendMessageDraft" since="Bot API 9.5" returns="true" method="API">
  Tampilkan pesan selagi masih ditulis, lalu ganti dengan pesan final.
</ApiMethodCard>

Draft adalah **pratinjau sementara** dari pesan yang masih ditulis. Setiap kali Anda
mengirim teks baru dengan `draft_id` yang sama, Telegram memperbarui pratinjau di tempat,
sehingga user melihat jawaban seolah "sedang diketik". Fitur ini dibuat untuk streaming
jawaban panjang, misalnya balasan AI, di **chat pribadi**.

Draft bukan pesan sungguhan: ia hilang sekitar 30 detik setelah update terakhir dan
tidak tersimpan di riwayat chat. Setelah teks lengkap, kirim dengan `ctx.reply()`.

::: tip Streaming jawaban AI
Untuk output AI, [ReplyStreamer](/id/advanced/streaming) mengerjakan semua ini: membatasi
frekuensi update, memakai draft di chat pribadi, beralih ke edit pesan di grup, dan
mengirim pesan final.
:::

## Memulai Cepat

```typescript
bot.command('hitung', async ctx => {
    const draft_id = Date.now() % 2 ** 31; // angka bukan nol apa pun, dipakai di setiap update

    for (const langkah of ['Satu', 'Satu, dua', 'Satu, dua, tiga']) {
        await ctx.replyWithDraft(langkah, { draft_id });
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    await ctx.reply('Satu, dua, tiga!'); // pesan permanen yang sebenarnya
});
```

Tiga aturan agar berfungsi:

1. **Pakai satu `draft_id`** untuk seluruh jawaban. Id baru memulai pratinjau baru.
2. **Kirim seluruh teks sejauh ini** setiap kali, bukan hanya potongan terbaru.
3. **Akhiri dengan `ctx.reply()`**. Tanpanya user tidak mendapat apa-apa setelah
   pratinjau kedaluwarsa.

## Streaming Jawaban yang Dihasilkan

```typescript
bot.command('tanya', async ctx => {
    const pertanyaan = ctx.command?.args?.join(' ') || 'Ceritakan lelucon';
    const draft_id = Date.now() % 2 ** 31;
    let jawaban = '';
    let updateTerakhir = 0;

    for await (const potongan of generateAnswer(pertanyaan)) {
        jawaban += potongan;
        // Update paling banyak dua kali per detik agar aman dari rate limit.
        if (Date.now() - updateTerakhir > 500) {
            await ctx.replyWithDraft(jawaban, { draft_id });
            updateTerakhir = Date.now();
        }
    }

    await ctx.reply(jawaban);
});
```

`generateAnswer` mewakili async iterator teks apa pun, misalnya stream dari SDK AI.

## Opsi

| Opsi           | Deskripsi                                                              |
| -------------- | ---------------------------------------------------------------------- |
| `draft_id`     | Identitas pratinjau. Dibuat acak jika tidak diisi (draft sekali pakai) |
| `can_stop`     | Menampilkan tombol stop agar user bisa membatalkan jawaban             |
| `keep_on_stop` | Menyimpan teks parsial sebagai pesan saat user menekan stop            |
| `parse_mode`, `entities` | Format teks, sama seperti `ctx.reply()`                      |

## Batasan

- Hanya chat pribadi. Di grup, kirim pesan lalu edit (ReplyStreamer melakukannya otomatis).
- Pratinjau bersifat sementara (sekitar 30 detik setelah update terakhir) dan tidak disimpan.
- `ctx.replyWithDraft()` butuh chat, jadi tidak berfungsi di handler inline query.
