# Instalasi

## Prasyarat

- **Node.js** versi 18.0 atau lebih baru
- **npm** atau **yarn**

Cek versi Node.js Anda:

```bash
node --version   # harus >= 18.0.0
```

## Install Package

```bash
npm install vibegram
```

Atau menggunakan yarn:

```bash
yarn add vibegram
```

## Inisialisasi Proyek TypeScript

Jika belum ada proyek TypeScript:

```bash
mkdir my-bot && cd my-bot
npm init -y
npm install vibegram
npm install -D typescript @types/node ts-node
npx tsc --init
```

Konfigurasi `tsconfig.json` yang direkomendasikan:

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

## Mendapatkan Token Bot

1. Buka Telegram dan cari **@BotFather**
2. Kirim `/newbot` dan ikuti petunjuknya
3. Simpan token yang diberikan di variabel lingkungan

```bash
# .env
BOT_TOKEN=1234567890:ABCDefGHIjklMNOpqrSTUvwxYZ
```

Gunakan `dotenv` untuk memuat `.env`:

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';
```

## Bot Pertama Anda

Buat file `src/index.ts`:

```typescript
import { Bot } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command('start', async (ctx) => {
    const nama = ctx.from?.first_name || 'kawan';
    await ctx.reply(`👋 Halo ${nama}! Selamat datang di bot saya.`);
});

bot.hears(/halo|hai/i, async (ctx) => {
    await ctx.reply('Halo! Ada yang bisa saya bantu?');
});

bot.launch().then(() => console.log('Bot berjalan! 🚀'));
```

Jalankan:

```bash
npx ts-node src/index.ts
```

## Struktur Proyek yang Direkomendasikan

```
my-bot/
├── src/
│   ├── index.ts          # Entry point bot
│   ├── handlers/
│   │   ├── commands.ts   # Handler command (/start, /help, dll)
│   │   ├── actions.ts    # Handler callback query
│   │   └── conversations.ts  # Conversation engine
│   ├── middlewares/
│   │   └── auth.ts       # Middleware kustom
│   └── scenes/
│       └── checkout.ts   # Scene wizard
├── .env
├── package.json
└── tsconfig.json
```

## Langkah Selanjutnya

- [Instansi Bot & Polling](/id/basics/instance) — Pelajari opsi konfigurasi
- [Pipeline Middleware](/id/core/middleware) — Pahami cara kerja routing
- [Session](/id/state/session) — Simpan data per-pengguna
