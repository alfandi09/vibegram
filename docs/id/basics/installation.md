# Instalasi

<PackageStats
  :stats="[
    { label: 'Runtime', value: 'Node.js 18+', description: 'Sesuai engines package' },
    { label: 'Output', value: 'CJS + ESM', description: 'Aman untuk setup Node modern' },
    { label: 'Types', value: 'Strict TS', description: 'Deklarasi tipe tersedia' }
  ]"
/>

<InstallTabs title="Install package" copy-label="Salin" copied-label="Tersalin" />

<CompatibilityTable />

<SecurityNote title="Jaga secret tetap di luar repository" variant="warning">
Install package di project aplikasi Anda, lalu baca token bot dari environment variable.
Jangan commit file `.env` atau token Telegram asli.
</SecurityNote>

## Prasyarat

- Node.js v18.0 atau lebih baru
- npm atau yarn
- Token bot Telegram dari BotFather

Cek versi Node.js:

```bash
node --version
```

## Install

```bash
npm install vibegram
```

Atau dengan yarn:

```bash
yarn add vibegram
```

## Setup TypeScript

VibeGram ditulis dengan TypeScript dan sudah membawa deklarasi tipe. Tidak perlu
package `@types` tambahan untuk VibeGram.

Untuk project TypeScript baru:

```bash
mkdir my-bot && cd my-bot
npm init -y
npm install vibegram
npm install -D typescript ts-node @types/node
npx tsc --init
```

`tsconfig.json` yang direkomendasikan:

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "CommonJS",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "outDir": "./dist",
        "rootDir": "./src"
    },
    "include": ["src/**/*"]
}
```

## Token Environment

Buat bot lewat `@BotFather` di Telegram, lalu simpan token di environment runtime:

```bash
BOT_TOKEN=1234567890:ganti-token
```

Untuk memuat `.env` lokal:

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';
```

## Bot Pertama

Buat `src/index.ts`:

```typescript
import 'dotenv/config';
import { Bot } from 'vibegram';

const token = process.env.BOT_TOKEN;

if (!token) {
    throw new Error('BOT_TOKEN wajib diisi');
}

const bot = new Bot(token);

bot.start(async ctx => {
    const name = ctx.from?.first_name ?? 'teman';
    await ctx.reply(`Halo ${name}. Selamat datang di bot.`);
});

bot.hears(/halo|hai/i, ctx => ctx.reply('Halo. Ada yang bisa saya bantu?'));

await bot.launch();
```

Jalankan:

```bash
npx ts-node src/index.ts
```

## Struktur Project

Project VibeGram untuk produksi biasanya dimulai seperti ini:

```text
my-bot/
  src/
    index.ts
    handlers/
      commands.ts
      actions.ts
    middlewares/
      auth.ts
    scenes/
      checkout.ts
  .env
  package.json
  tsconfig.json
```

## Verifikasi Instalasi

Kirim `/start` ke bot Anda di Telegram. Jika bot membalas, instalasi package,
loading token, dan polling sudah berjalan.

## Langkah Selanjutnya

- [Instansi Bot & Polling](/id/basics/instance) - konfigurasi opsi launch.
- [Pipeline Middleware](/id/core/middleware) - pahami urutan middleware.
- [Session](/id/state/session) - simpan state per-user atau per-chat.
