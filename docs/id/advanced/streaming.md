# AI Streaming

`ReplyStreamer` mengalirkan teks hasil generate, misalnya token LLM, ke Telegram. Di
chat pribadi, jawaban muncul langsung lewat draft pesan (`sendMessageDraft`) dengan
tombol **stop** (Bot API 10.3); setelah stream selesai, teks lengkap dikirim sebagai
pesan biasa. Di grup, yang tidak mendukung draft, hanya pesan final yang dikirim.

Bisa dipakai dengan provider model apa pun: berikan `AsyncIterable<string>` berisi
potongan teks.

```typescript
import { Bot, ReplyStreamer } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
const streams = new ReplyStreamer();

bot.use(streams.middleware()); // menangani tombol stop

bot.on('message:text', ctx => {
    // Tidak di-await, supaya long polling tetap bisa menerima update tombol stop.
    streams
        .reply(ctx, buatJawaban(ctx.message.text), { parseMode: 'HTML' })
        .catch(error => console.error('Streaming gagal', error));
});

// Async generator potongan teks apa pun bisa, misalnya dari stream sebuah SDK.
async function* buatJawaban(prompt: string): AsyncGenerator<string> {
    for await (const chunk of modelSaya.stream(prompt)) {
        if (chunk.text) yield chunk.text;
    }
}
```

## Opsi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `throttleMs` | `400` | Jeda minimum antar-update draft. |
| `canStop` | `true` | Tampilkan tombol stop di bawah draft. |
| `onStop` | `'send'` | `'send'` mengirim teks sebagian; `'discard'` tidak mengirim apa pun. |
| `parseMode` | — | Parse mode untuk pesan final. Draft selalu teks biasa. |
| `extra` | — | Parameter tambahan untuk pesan final; `reply_markup` dipasang di pesan terakhir. |
| `signal` | — | `AbortSignal` untuk menghentikan dari luar (misalnya timeout). |
| `draftId` | acak | Draft id tetap. |

`reply()` selesai dengan `{ text, stopped, messages }`. Saat user menekan stop, iterator
sumber ditutup dengan `return()`, sehingga SDK bisa membatalkan request-nya. Jawaban
lebih dari 4096 karakter dipecah di batas paragraf, baris, atau kata
(`splitMessageText()` juga diekspor).

::: warning Long polling dan tombol stop
Dengan long polling default, update diproses satu per satu. Jika handler meng-await
`streams.reply()`, update tombol stop baru diproses setelah stream selesai. Jalankan
stream tanpa await (seperti contoh), pakai webhook, atau plugin `@vibegram/runner`
untuk polling paralel.
:::

## Timeout

```typescript
await streams.reply(ctx, buatJawaban(prompt), { signal: AbortSignal.timeout(60_000) });
```

## Scaffold bot AI

```bash
npm create vibegram@latest bot-ai-saya -- --template ai-bot
```
