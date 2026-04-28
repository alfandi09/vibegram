# Codex untuk Telegram

Plugin `@vibegram/codex` menambahkan `ctx.codex` ke handler VibeGram agar bot Telegram bisa berkomunikasi dengan ChatGPT melalui session token Codex.

::: warning Status Experimental
Paket ini masih berada di `experimental/codex`. API, environment variable, dan endpoint internal ChatGPT dapat berubah sebelum rilis stabil.
:::

## Rekomendasi Penggunaan

Gunakan plugin ini untuk bot pribadi, eksperimen privat, dan internal tool dengan daftar user Telegram yang Anda kontrol.

Jangan anggap ini seperti OpenAI API resmi. `codexProvider()` mengarah ke backend ChatGPT/Codex dengan session token ChatGPT, bukan ke `api.openai.com` dengan API key. Provider ini best-effort dan bisa berhenti bekerja jika OpenAI mengubah aturan session, header backend, sentinel check, atau proteksi anti-otomasi.

## Cara Kerja

Plugin menginjeksi helper `ctx.codex` ke setiap update. Untuk setiap prompt, plugin akan:

1. Mengecek `allowedUserIds` dan `allowedChatIds`
2. Membangun percakapan singkat dari riwayat tersimpan
3. Menambahkan `systemPrompt` dan personality per-user jika ada
4. Mengirim request ke `chatgpt.com/backend-api/codex/responses`
5. Mem-parse SSE stream response dan mengirim teks ke Telegram

Penggunaan dihitung dari kuota Codex pada akun ChatGPT yang login.

## Instalasi

Saat package experimental ini sudah dipublish, install dari npm:

```bash
npm install vibegram @vibegram/codex
```

Sampai saat itu, gunakan package experimental langsung dari repository ini:

```bash
git clone https://github.com/alfandi09/vibegram.git
cd vibegram
npm install
npm run build

cd experimental/codex
npm install
npm run build
```

Lalu gunakan dari project bot Anda dengan local file dependency:

```json
{
  "dependencies": {
    "vibegram": "^2.1.0",
    "@vibegram/codex": "file:../vibegram/experimental/codex"
  }
}
```

## Setup Server

Untuk bot sungguhan, buat session Codex di mesin terpercaya, lalu deploy `auth.json` ke server sebagai secret file. Bot hanya perlu membaca file itu saat runtime.

Layout server yang disarankan:

```text
/opt/my-telegram-bot/
  app/
  secrets/
    codex-auth.json
```

Contoh environment:

```bash
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
CODEX_ALLOWED_CHAT_IDS=123456,-1001234567890
TELEGRAM_BOT_USERNAME=my_bot
```

Simpan secret file di luar repository, batasi permission, dan jangan pernah cetak isinya ke log.

```bash
chmod 600 /opt/my-telegram-bot/secrets/codex-auth.json
```

Jika platform Anda mendukung secret mount, mount `codex-auth.json` sebagai file lalu arahkan `CODEX_AUTH_JSON_PATH` ke path mount tersebut. Ini opsi paling rapi karena provider bisa me-refresh access token dan menulis token baru kembali ke disk.

## Mendapatkan `auth.json`

Jalankan Codex login di mesin lokal terpercaya atau temporary shell server:

```bash
codex login
```

Pilih mode login ChatGPT, bukan mode API key.

Path lokal default:

| OS | Path default |
| --- | --- |
| Windows | `%USERPROFILE%\.codex\auth.json` |
| macOS/Linux | `~/.codex/auth.json` |

Verifikasi file ada tanpa mencetak token:

```bash
test -f "$HOME/.codex/auth.json"
```

Setelah itu salin file ke secret path server dengan metode deployment Anda. Contohnya `scp`, Docker/Kubernetes secrets, private CI secret artifact, atau file manual di VPS.

## Resep Deployment

Contoh berikut mengasumsikan bot Anda sudah dibuild menjadi aplikasi Node.js yang siap deploy.

### VPS dengan systemd

Simpan konfigurasi runtime di environment file:

```bash
sudo install -d -m 700 /opt/my-telegram-bot/secrets
sudo cp ~/.codex/auth.json /opt/my-telegram-bot/secrets/codex-auth.json
sudo chmod 600 /opt/my-telegram-bot/secrets/codex-auth.json
```

```text
# /etc/vibegram-codex.env
TELEGRAM_BOT_TOKEN=123456:replace-me
CODEX_AUTH_JSON_PATH=/opt/my-telegram-bot/secrets/codex-auth.json
CODEX_MODEL=gpt-5.3-codex
CODEX_ALLOWED_USER_IDS=123456,789012
TELEGRAM_BOT_USERNAME=my_bot
```

Unit service minimal:

```ini
[Unit]
Description=VibeGram Codex Telegram Bot
After=network-online.target

[Service]
WorkingDirectory=/opt/my-telegram-bot/app
EnvironmentFile=/etc/vibegram-codex.env
ExecStart=/usr/bin/node dist/bot.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Docker secret mount

Mount `codex-auth.json` sebagai file, lalu arahkan `CODEX_AUTH_JSON_PATH` ke path mount:

```yaml
services:
  bot:
    image: my-telegram-bot:latest
    environment:
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
      CODEX_AUTH_JSON_PATH: /run/secrets/codex-auth.json
      CODEX_MODEL: gpt-5.3-codex
      CODEX_ALLOWED_USER_IDS: "123456,789012"
      TELEGRAM_BOT_USERNAME: my_bot
    volumes:
      - ./secrets/codex-auth.json:/run/secrets/codex-auth.json
    restart: unless-stopped
```

Pastikan file mount bisa ditulis jika ingin auto-refresh token tersimpan dan tetap bertahan setelah container restart.

## Bot Server Minimal

```typescript
import { Bot } from 'vibegram';
import { codex, codexProvider } from '@vibegram/codex';

function parseNumberList(value: string | undefined): number[] {
    if (!value) return [];

    return value
        .split(',')
        .map(item => Number(item.trim()))
        .filter(Number.isFinite);
}

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const authJsonPath = process.env.CODEX_AUTH_JSON_PATH;

if (!telegramToken) {
    throw new Error('TELEGRAM_BOT_TOKEN wajib diisi');
}

if (!authJsonPath) {
    throw new Error('CODEX_AUTH_JSON_PATH wajib diisi');
}

const bot = new Bot(telegramToken);

bot.use(
    codex({
        provider: codexProvider({
            authJsonPath,
            accountId: process.env.CODEX_ACCOUNT_ID,
            deviceId: process.env.CODEX_DEVICE_ID,
            model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
            reasoningEffort: process.env.CODEX_REASONING_EFFORT as
                | 'low'
                | 'medium'
                | 'high'
                | 'xhigh'
                | undefined,
        }),
        systemPrompt: process.env.CODEX_SYSTEM_PROMPT ?? 'Kamu adalah asisten Telegram yang ringkas.',
        allowedUserIds: parseNumberList(process.env.CODEX_ALLOWED_USER_IDS),
        allowedChatIds: parseNumberList(process.env.CODEX_ALLOWED_CHAT_IDS),
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        autoReply: process.env.CODEX_AUTO_REPLY !== 'false',
        groupMentionOnly: true,
        maxHistory: 20,
        timeoutMs: 60_000,
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

## Development Lokal

Untuk test lokal, bot bisa langsung diarahkan ke file default Codex CLI:

```powershell
$env:TELEGRAM_BOT_TOKEN="123456:replace-me"
$env:CODEX_AUTH_JSON_PATH="$env:USERPROFILE\.codex\auth.json"
$env:CODEX_MODEL="gpt-5.3-codex"
```

Atau di macOS/Linux:

```bash
export TELEGRAM_BOT_TOKEN="123456:replace-me"
export CODEX_AUTH_JSON_PATH="$HOME/.codex/auth.json"
export CODEX_MODEL="gpt-5.3-codex"
```

Contoh live smoke test memang khusus local dan berada di:

```text
experimental/codex/examples/live-telegram-bot.ts
```

Jalankan dari package experimental:

```bash
cd experimental/codex
npm run build
npm run test:live
```

## Command Bawaan

Plugin otomatis menyediakan command dengan prefix default `/codex`.

| Command | Fungsi |
| --- | --- |
| `/codex help` | Menampilkan bantuan |
| `/codex status` | Mengecek provider, model, expiry token, usage, dan personality |
| `/codex models` | Menampilkan daftar model provider |
| `/codex reset` | Menghapus riwayat percakapan user/chat |
| `/codex ask <teks>` | Mengirim prompt eksplisit |
| `/codex personality <teks>` | Set instruksi khusus untuk user |
| `/codex personality` | Melihat personality saat ini |
| `/codex personality reset` | Reset ke personality default |

## Group Chat

Untuk group dan supergroup, set `botUsername` agar plugin hanya membalas saat bot disebut secara eksplisit.

```typescript
bot.use(
    codex({
        provider,
        botUsername: process.env.TELEGRAM_BOT_USERNAME,
        groupMentionOnly: true,
    })
);
```

Jika `botUsername` tidak diisi, auto-reply di group dimatikan agar bot tidak membalas pesan yang bukan ditujukan kepadanya.

## Custom Personality

Setiap user Telegram bisa mengatur instruksi khusus. Plugin akan menambahkan instruksi itu ke `systemPrompt`.

```text
/codex personality Jawab dalam bahasa Indonesia dan ringkas
/codex personality Kamu adalah coding expert. Selalu berikan contoh kode.
/codex personality reset
```

Detail:

- Disimpan per user di memory store yang dikonfigurasi
- Maksimal 2000 karakter
- Tampil di `/codex status`

## Tracking Penggunaan

Plugin melacak statistik penggunaan selama proses bot berjalan:

- Total request
- Token input, output, dan total
- Hitungan request dan token per-user

Lihat statistik dengan `/codex status`.

Ini hanya telemetry lokal proses bot. Plugin tidak mengecek sisa kuota langganan ChatGPT/Codex.

## Auto Refresh

Saat access token expired, provider bisa me-refresh token memakai `refresh_token` dari `auth.json`.

Ini paling aman jika memakai `authJsonPath`, karena provider bisa memperbarui file yang sama di disk setelah refresh. Jika hanya memberikan direct access token, tidak ada refresh token yang bisa dipakai dan bot perlu re-authentication setelah token expired.

Alur refresh:

1. Provider mengecek JWT `exp` claim sebelum request
2. Jika expired, provider mengirim refresh request ke `auth.openai.com/oauth/token`
3. Access token baru disimpan di memori
4. Jika path auth file tersedia, token baru ditulis kembali ke disk

## Persistence

Secara default, plugin memakai in-memory store. Ini cukup untuk test lokal dan bot pribadi sederhana, tapi data berikut akan hilang saat proses restart:

- Riwayat percakapan
- Personality/instruksi per-user
- Counter penggunaan dalam proses

Untuk bot server jangka panjang, gunakan custom `memoryStore` yang disimpan di database atau cache Anda sendiri.

```typescript
import type { CodexMemoryStore, CodexMessage } from '@vibegram/codex';

class DatabaseCodexStore implements CodexMemoryStore {
    async append(key: string, message: CodexMessage): Promise<void> {
        // Simpan { key, role: message.role, content: message.content } ke store Anda.
    }

    async list(key: string): Promise<CodexMessage[]> {
        // Kembalikan message dari paling lama ke paling baru.
        return [];
    }

    async clear(key: string): Promise<void> {
        // Hapus semua message untuk key ini.
    }
}

bot.use(
    codex({
        provider,
        memoryStore: new DatabaseCodexStore(),
    })
);
```

Store key sudah discoping berdasarkan user, chat, dan thread group jika memungkinkan. Pertahankan urutan message saat mengembalikan data dari `list()`.

## Advanced Auth Loading

Gunakan `authJsonPath` untuk sebagian besar deployment server karena provider bisa membaca `access_token` dan `refresh_token`, lalu menulis token hasil refresh kembali ke disk.

Jika platform Anda menyimpan secret sebagai JSON object, bukan file, Anda bisa membuat provider dengan `codexProviderFromJson()`:

```typescript
import { codexProviderFromJson } from '@vibegram/codex';

const authJson = JSON.parse(process.env.CODEX_AUTH_JSON_JSON ?? '{}');

const provider = codexProviderFromJson(authJson, {
    model: process.env.CODEX_MODEL ?? 'gpt-5.3-codex',
    accountId: process.env.CODEX_ACCOUNT_ID,
    deviceId: process.env.CODEX_DEVICE_ID,
});
```

Ini berguna untuk secret manager atau test environment, tapi token hasil refresh tidak bisa otomatis ditulis kembali ke sumber secret. Untuk bot jangka panjang, lebih baik gunakan `authJsonPath` yang writable kecuali deployment Anda punya mekanisme rotate dan reload secret.

## Opsi Plugin

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `provider` | wajib | Provider Codex dari `codexProvider()` |
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
| `botUsername` | kosong | Username bot untuk deteksi mention group |
| `memoryStore` | in-memory | Adapter penyimpanan riwayat percakapan |
| `onAudit` | kosong | Callback audit aman tanpa isi prompt |

## Opsi codexProvider

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `accessToken` | kosong | Bearer token langsung. Ini melewati `auth.json` dan tidak bisa refresh kecuali provider dibuat ulang dengan token baru. |
| `authJsonPath` | `~/.codex/auth.json` | Path ke file auth JSON Codex |
| `model` | `gpt-5.3-codex` | Model yang diminta |
| `reasoningEffort` | kosong | `low`, `medium`, `high`, atau `xhigh` |
| `timeoutMs` | `60000` | Timeout request provider |
| `maxRetries` | `2` | Percobaan ulang pada error 5xx sementara |
| `baseUrl` | `https://chatgpt.com/backend-api/codex` | Base URL backend API |
| `accountId` | auto-detected | Header ChatGPT account ID |
| `deviceId` | random UUID | Header `oai-device-id` |
| `autoRefresh` | `true` jika `refresh_token` tersedia | Auto-refresh token expired via OAuth2 |

## Troubleshooting

| Error | Penyebab umum | Solusi |
| --- | --- | --- |
| `auth JSON not found` | Path secret server salah | Set `CODEX_AUTH_JSON_PATH` ke path absolut yang bisa dibaca |
| `No access_token found` | File login tidak lengkap atau memakai mode API key | Jalankan `codex login` lagi dengan mode ChatGPT |
| `access_token has expired` | JWT expired dan refresh tidak tersedia atau gagal | Cek `refresh_token` atau jalankan `codex login` lagi |
| `Token refresh failed` | Refresh token expired atau dicabut | Ganti secret server dengan `auth.json` baru |
| `401` saat token belum expired | Backend membutuhkan perilaku client tambahan yang tidak direplikasi provider | Refresh login dan coba lagi |
| `403` | Model tidak tersedia atau plan tidak cocok | Coba model lain dari `/codex models` |
| `429` | Rate limit Codex | Tunggu dan coba lagi |
| `503 Cloudflare` | Akses otomatis diblokir | Plugin ini tidak bypass Cloudflare |
| `Empty response` | SSE stream tidak mengembalikan event teks | Cek akses model dan coba lagi |

## Checklist Keamanan

- Simpan `TELEGRAM_BOT_TOKEN` dan `codex-auth.json` di secret manager atau path privat server.
- Jangan commit `.env`, `auth.json`, log token, screenshot token, atau file `.codex` yang disalin.
- Gunakan `allowedUserIds` atau `allowedChatIds`; kalau tidak, siapa pun yang mengakses bot bisa menghabiskan kuota.
- Pastikan `onAudit` hanya berisi metadata. Jangan log full prompt secara default.
- Rotasi token bot Telegram jika pernah terbagikan di chat atau log.
- Perlakukan plugin ini sebagai experimental dan private-use only.
