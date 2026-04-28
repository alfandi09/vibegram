# Codex untuk Telegram

Plugin `@vibegram/codex` menambahkan `ctx.codex` ke setiap handler VibeGram agar bot Telegram bisa berkomunikasi dengan ChatGPT melalui session token Codex.

::: warning Status Experimental
Paket ini masih berada di `experimental/codex`. API, environment variable, dan endpoint internal dapat berubah sebelum rilis stabil.
:::

## Cara Kerja

Plugin menginjeksi helper `ctx.codex` ke setiap update. Saat user mengirim pesan, plugin akan:

1. Mengecek izin akses (`allowedUserIds` / `allowedChatIds`)
2. Membangun percakapan dari riwayat pesan (sliding window)
3. Menginjeksi personality/instruksi custom per-user jika ada
4. Mengirim percakapan ke `chatgpt.com/backend-api/codex/responses`
5. Mem-parse SSE stream response dan mengirim teks sebagai balasan Telegram

Penggunaan dihitung dari **kuota Codex** — terpisah dari kuota chat ChatGPT web.

## Batasan

`codexProvider()` menargetkan backend internal ChatGPT. Provider ini bersifat best-effort dan bisa gagal jika OpenAI mengubah aturan auth, sentinel check, atau proteksi anti-otomasi. Gunakan untuk eksperimen pribadi, bot privat, dan pembelajaran — bukan untuk workload produksi.

## Instalasi

Jika `@vibegram/codex` sudah dipublish:

```bash
npm install vibegram @vibegram/codex
```

Jika menggunakan package experimental dari repository ini:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
npm run build

cd experimental/codex
npm install
npm run build
```

Untuk mengkonsumsi package lokal dari project bot Anda:

```json
{
  "dependencies": {
    "vibegram": "^2.0.0",
    "@vibegram/codex": "file:../vibegram/experimental/codex"
  }
}
```

Lalu jalankan:

```bash
npm install
```

## Mendapatkan `auth.json`

`auth.json` dibuat oleh Codex CLI setelah Anda sign in dengan akun ChatGPT. Perlakukan file ini sebagai rahasia — berisi session token yang memberikan akses ke langganan Anda.

### 1. Sign in ke Codex

```bash
codex login
```

Pastikan sign in dengan mode ChatGPT (bukan mode API key).

### 2. Lokasi `auth.json`

| OS | Path default |
| --- | --- |
| Windows | `%USERPROFILE%\.codex\auth.json` |
| macOS/Linux | `~/.codex/auth.json` |

Verifikasi file ada tanpa mencetak token:

```powershell
Test-Path "$env:USERPROFILE\.codex\auth.json"
```

Jangan pernah commit `auth.json`, upload ke log, atau paste `tokens.access_token` di chat publik.

## Environment Variable

Windows PowerShell:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CHATGPT_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:GPT_MODEL="gpt-5.3-codex"
```

macOS/Linux:

```bash
export TELEGRAM_BOT_TOKEN="123456:replace-me"
export CHATGPT_AUTH_JSON_PATH="$HOME/.codex/auth.json"
export GPT_MODEL="gpt-5.3-codex"
```

Opsional:

```bash
TELEGRAM_BOT_USERNAME=my_bot
CHATGPT_ACCOUNT_ID=acct_xxx
CHATGPT_DEVICE_ID=stable-device-id
GPT_REASONING_EFFORT=low
GPT_ALLOWED_USER_IDS=123456,789012
GPT_ALLOWED_CHAT_IDS=123456,-1001234567890
GPT_AUTO_REPLY=true
```

## Bot Minimal

```typescript
import { Bot } from 'vibegram';
import { codex, codexProvider } from '@vibegram/codex';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN wajib diisi');
}

const allowedUserIds = process.env.GPT_ALLOWED_USER_IDS
    ?.split(',')
    .map(value => Number(value.trim()))
    .filter(Number.isFinite);

const bot = new Bot(token);

bot.use(
    codex({
        provider: codexProvider({
            authJsonPath: process.env.CHATGPT_AUTH_JSON_PATH,
            accountId: process.env.CHATGPT_ACCOUNT_ID,
            deviceId: process.env.CHATGPT_DEVICE_ID,
            model: process.env.GPT_MODEL ?? 'gpt-5.3-codex',
            reasoningEffort: process.env.GPT_REASONING_EFFORT as
                | 'low'
                | 'medium'
                | 'high'
                | 'xhigh'
                | undefined,
        }),
        systemPrompt: 'Kamu adalah asisten Telegram yang ringkas dan membantu.',
        autoReply: true,
        timeoutMs: 60_000,
        maxHistory: 20,
        allowedUserIds,
        onAudit: event => {
            console.log('[codex]', {
                userId: event.userId,
                chatId: event.chatId,
                provider: event.provider,
                model: event.model,
                success: event.success,
                durationMs: event.durationMs,
                error: event.error,
            });
        },
    })
);

bot.start(ctx => ctx.reply('Kirim pesan atau gunakan /codex ask <teks>.'));

await bot.launch();
```

## Command Bawaan

Plugin otomatis menyediakan command dengan prefix default `/codex`.

| Command | Fungsi |
| --- | --- |
| `/codex help` | Menampilkan bantuan |
| `/codex status` | Mengecek provider, model, expiry token, usage & personality |
| `/codex models` | Menampilkan daftar model provider |
| `/codex reset` | Menghapus riwayat percakapan user/chat |
| `/codex ask <teks>` | Mengirim prompt eksplisit |
| `/codex personality <teks>` | Set instruksi khusus untuk user Anda |
| `/codex personality` | Lihat personality saat ini |
| `/codex personality reset` | Reset ke personality default |

## Group Chat

Untuk group dan supergroup, set `botUsername` agar plugin hanya membalas saat bot disebut.

```typescript
bot.use(
    codex({
        provider,
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        groupMentionOnly: true,
    })
);
```

Jika `botUsername` tidak diisi, auto-reply di group dimatikan agar bot tidak membalas percakapan yang bukan ditujukan kepadanya.

## Custom Personality (Instruksi Per-User)

Setiap user bisa mengatur personality/instruksi khusus yang ditambahkan ke system prompt di setiap request. Fitur ini bekerja seperti "Custom Instructions" di ChatGPT.

### Mengatur Personality

```
/codex personality Jawab selalu dalam bahasa Indonesia dan gaya formal
/codex personality Kamu adalah coding expert. Selalu berikan contoh kode.
/codex personality Kamu adalah chef profesional. Berikan resep dan tips memasak.
```

### Melihat atau Reset

```
/codex personality          # Lihat personality saat ini
/codex personality reset    # Reset ke default
```

**Cara kerja:**
- Disimpan per-user di memory store (bertahan antar percakapan)
- Maksimal 2000 karakter
- Di-inject sebagai: `{systemPrompt}\n\nUser custom instructions: {personality}`
- Tampil di output `/codex status`

## Tracking Penggunaan

Plugin melacak statistik penggunaan selama sesi bot berjalan:

- Total request
- Token input/output/total yang dipakai
- Hitungan request dan token per-user

Lihat statistik dengan `/codex status`.

> Catatan: Ini hanya tracking penggunaan sesi lokal. Tidak ada API untuk mengecek sisa kuota langganan Codex/ChatGPT.

## Auto-Refresh Token

Ketika `access_token` kedaluwarsa, provider **otomatis me-refresh** menggunakan `refresh_token` dari `auth.json`. Proses ini transparan — user tidak akan merasakan gangguan.

**Cara kerja:**

1. Sebelum setiap request, provider mengecek JWT `exp` claim
2. Jika expired, mengirim request `grant_type: refresh_token` ke `auth.openai.com/oauth/token`
3. `access_token` baru menggantikan yang lama di memori dan di `auth.json` di disk
4. Request asli melanjutkan dengan token yang baru

**Detail penting:**

- Aktif secara default jika `refresh_token` ada di `auth.json`
- Request refresh bersamaan dicegah (hanya satu refresh pada satu waktu)
- Jika `refresh_token` sendiri expired atau dicabut, jalankan `codex login` lagi
- Nonaktifkan dengan `autoRefresh: false` di opsi provider

## Live Smoke Test

Contoh bot live tersedia di `experimental/codex/examples/live-telegram-bot.ts`.

```powershell
cd path\to\vibegram\experimental\codex
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CHATGPT_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:GPT_MODEL="gpt-5.3-codex"
npm run test:live
```

Untuk penggunaan group:

```powershell
$env:TELEGRAM_BOT_USERNAME="nama_bot_tanpa_at"
```

## Opsi Plugin

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `provider` | wajib | Provider Codex (`codexProvider()`) |
| `systemPrompt` | `You are a helpful assistant.` | Instruksi sistem untuk setiap percakapan |
| `maxPromptLength` | `4000` | Panjang maksimal prompt user |
| `maxResponseLength` | `4096` | Panjang maksimal balasan sebelum dipotong |
| `maxHistory` | `20` | Sliding window riwayat percakapan |
| `timeoutMs` | `30000` | Timeout request provider |
| `allowedUserIds` | semua | Allowlist user Telegram |
| `allowedChatIds` | semua | Allowlist chat Telegram |
| `commandPrefix` | `codex` | Prefix command, contoh `/codex` |
| `autoReply` | `true` | Auto-reply ke pesan teks di DM |
| `groupMentionOnly` | `true` | Di group, hanya reply saat disebut |
| `botUsername` | kosong | Username bot untuk deteksi mention di group |
| `memoryStore` | in-memory | Adapter penyimpanan riwayat percakapan |
| `onAudit` | kosong | Callback audit aman tanpa isi prompt |

## Opsi codexProvider

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `accessToken` | — | Bearer token langsung (skip auth.json) |
| `authJsonPath` | `~/.codex/auth.json` | Path ke file auth Codex |
| `model` | `gpt-5.3-codex` | Model yang diminta |
| `reasoningEffort` | — | `low` / `medium` / `high` / `xhigh` |
| `timeoutMs` | `60000` | Timeout request |
| `maxRetries` | `2` | Percobaan ulang pada error 5xx |
| `baseUrl` | `chatgpt.com/backend-api/codex` | Base URL API backend |
| `accountId` | auto-detected | Header ChatGPT account ID |
| `deviceId` | random UUID | Header `oai-device-id` |
| `autoRefresh` | `true` | Auto-refresh token expired via OAuth2 |

## Cara Kerja `codexProvider`

Provider membaca `access_token` dari `auth.json`, lalu memanggil:

```text
POST https://chatgpt.com/backend-api/codex/responses
```

Payload utama:

```json
{
  "model": "gpt-5.3-codex",
  "instructions": "Kamu adalah asisten Telegram.",
  "input": [{ "role": "user", "content": "Halo" }],
  "store": false,
  "stream": true
}
```

Header penting:

```text
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: text/event-stream
oai-device-id: <uuid>
oai-language: en
Chatgpt-Account-Id: <account_id jika tersedia>
```

Response dikembalikan sebagai Server-Sent Events (SSE). Provider mengumpulkan event `response.output_text.delta` dan menggunakan `response.completed` sebagai hasil akhir.

## Troubleshooting

| Error | Penyebab umum | Solusi |
| --- | --- | --- |
| `auth JSON not found` | Path salah | Set `CHATGPT_AUTH_JSON_PATH` ke path absolut |
| `No access_token found` | Login Codex belum selesai | Jalankan `codex login` lagi |
| `access_token has expired` | JWT sudah expired dan auto-refresh gagal | Cek validitas `refresh_token` atau jalankan `codex login` |
| `Token refresh failed` | `refresh_token` expired atau dicabut | Jalankan `codex login` untuk token baru |
| `401` saat token belum expired | Backend mungkin butuh token keamanan tambahan | Refresh login dan coba lagi |
| `403` | Model tidak tersedia atau plan tidak cocok | Coba model lain yang tersedia dari `/codex models` |
| `429` | Rate limit Codex | Tunggu dan coba lagi |
| `503 Cloudflare` | Akses otomatis diblokir | Plugin ini tidak bypass Cloudflare |
| `Empty response` | SSE stream tidak mengembalikan event teks | Cek nama model dan coba model lain dari `/codex models` |

## Checklist Keamanan

- Simpan `TELEGRAM_BOT_TOKEN` dan `auth.json` di environment variable atau secret manager.
- Jangan pernah commit `.env`, `auth.json`, log token, atau file `.codex` yang dicetak.
- Gunakan `allowedUserIds` untuk bot pribadi agar user lain tidak bisa menghabiskan kuota Codex Anda.
- Gunakan `onAudit` untuk observabilitas, tapi jangan log full prompt jika mengandung data sensitif.
- Rotasi Telegram bot token jika pernah terbagikan di chat atau log.
