# Sistem Plugin

<FeatureGrid title="Komposisi plugin" description="Kemas middleware, command, handler, dan lifecycle hook menjadi unit yang bisa digunakan ulang.">
  <FeatureCard title="Install plugin" description="Pasang plugin berbentuk class atau function melalui `bot.plugin()`." href="#memulai-cepat" cta="Buka install" />
  <FeatureCard title="Fitur reusable" description="Bagikan analytics, auth, logging, atau behavior domain antar bot." href="#membuat-plugin-yang-bisa-digunakan-ulang" cta="Buka pembuatan" />
  <FeatureCard title="Plugin vs middleware" description="Kapan memakai plugin dan kapan cukup middleware biasa." href="#plugin-vs-middleware" cta="Buka perbandingan" />
</FeatureGrid>

Plugin adalah kumpulan kode setup yang punya nama: ia mendaftarkan middleware, command,
dan handler ke bot Anda dalam satu panggilan. Buat plugin saat fitur yang sama
(analitik, panel admin, command bantuan) dipakai di beberapa bot atau ingin dipublikasikan
sebagai package.

Untuk satu middleware di satu bot, `bot.use()` biasa sudah cukup.

## Memulai Cepat

Plugin adalah objek apa pun yang punya `name` dan metode `install(bot)`:

```typescript
import { Bot, type BotPlugin, type Composer, type Context } from 'vibegram';

class WelcomePlugin implements BotPlugin {
    name = 'welcome';

    install(bot: Composer<Context>) {
        bot.command('welcome', ctx => ctx.reply('Selamat datang!'));
    }
}

const bot = new Bot(process.env.BOT_TOKEN!);
bot.plugin(new WelcomePlugin());
```

`bot.plugin()` langsung memanggil `install()`, jadi handler plugin berada **di titik
itu** dalam urutan middleware, persis seolah Anda menulisnya di sana. Pasang plugin yang
menambah middleware (logging, session) sebelum handler Anda.

## Interface Plugin

```typescript
interface BotPlugin<C extends Context = Context> {
    /** Identitas plugin, misalnya untuk log. */
    name: string;
    /** Mendaftarkan middleware dan handler plugin. */
    install(composer: Composer<C>): void;
}
```

## Plugin Fungsional

`createPlugin(name, installer)` mengembalikan factory, cara paling sederhana untuk
membuat plugin yang bisa dikonfigurasi:

```typescript
import { createPlugin } from 'vibegram';

const sapaan = createPlugin<{ pesan: string }>('greeting', (bot, opsi) => {
    bot.command('sapa', ctx => ctx.reply(opsi.pesan));
});

bot.plugin(sapaan({ pesan: 'Halo dari plugin!' }));
```

## Preset

`Preset` memasang beberapa plugin secara berurutan dengan satu panggilan. Bungkus
middleware bawaan dengan `createPlugin()` untuk mengemas setup standar Anda:

```typescript
import { createPlugin, dedupeUpdates, logger, Preset, rateLimit, session } from 'vibegram';

const dasar = createPlugin<{ requestPerDetik: number }>('baseline', (bot, opsi) => {
    bot.use(logger());
    bot.use(dedupeUpdates()); // abaikan update yang dikirim Telegram dua kali
    bot.use(rateLimit({ windowMs: 1000, limit: opsi.requestPerDetik }));
    bot.use(session());
});

const produksi = new Preset('production', [dasar({ requestPerDetik: 2 }), new WelcomePlugin()]);

bot.plugin(produksi);
```

## Membuat Plugin yang Bisa Digunakan Ulang

Plugin ini mengukur lama setiap update diproses lalu melaporkannya. Karena membungkus
`await next()`, semua yang didaftarkan setelahnya ikut terukur:

```typescript
// analytics-plugin.ts
import type { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private readonly endpoint: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const mulai = Date.now();
            await next();

            // Kirim tanpa menunggu: layanan analitik yang lambat tidak boleh memperlambat bot.
            fetch(this.endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    updateType: ctx.updateType,
                    userId: ctx.from?.id,
                    durationMs: Date.now() - mulai,
                }),
            }).catch(() => {});
        });
    }
}

// bot.ts
bot.plugin(new AnalyticsPlugin('https://analytics.example.com/events'));
```

Untuk mempublikasikan plugin, taruh `vibegram` di `peerDependencies` agar plugin memakai
salinan milik bot. Plugin resmi `@vibegram/*` mengikuti susunan ini; lihat
[Pengembangan Plugin](/id/plugins/development).

## Plugin vs Middleware

| | Middleware | Plugin |
| --- | --- | --- |
| Bentuknya | Satu fungsi `(ctx, next)` | Langkah setup bernama yang bisa menambah banyak handler |
| Konfigurasi | Argumen closure | Opsi constructor atau `createPlugin()` |
| Pemakaian ulang | Salin fungsinya | Import lalu `bot.plugin(...)` |
| Pengemasan | `bot.use()` manual | `Preset` memasang beberapa sekaligus berurutan |
| Publikasi | Bisa, tapi kurang rapi | Cocok sebagai package npm |
