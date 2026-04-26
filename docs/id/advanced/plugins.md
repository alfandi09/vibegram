# Sistem Plugin

<FeatureGrid title="Komposisi plugin" description="Kemas middleware, command, handler, dan lifecycle hook menjadi unit reusable.">
  <FeatureCard title="Install plugin" description="Mount plugin class atau function melalui `bot.plugin()`." href="#install-plugin" cta="Buka install" />
  <FeatureCard title="Fitur reusable" description="Bagikan analytics, auth, logging, atau behavior domain antar bot." href="#membuat-plugin" cta="Buka pembuatan" />
  <FeatureCard title="Opsi bertipe" description="Jaga konfigurasi plugin tetap eksplisit dan mudah divalidasi." href="#opsi-plugin" cta="Buka opsi" />
</FeatureGrid>

Sistem plugin VibeGram memungkinkan komposisi fitur secara modular. Plugin mengenkapsulasi middleware, command, dan handler menjadi unit yang bisa digunakan ulang dan diinstal.

## Memulai Cepat

```typescript
import { Bot, BotPlugin } from 'vibegram';

// Plugin berbasis kelas
class WelcomePlugin implements BotPlugin {
    name = 'welcome';

    install(bot) {
        bot.command('selamat', ctx => ctx.reply('Selamat datang!'));
        bot.command('halo', ctx => ctx.reply('Halo! Ada yang bisa saya bantu?'));
    }
}

const bot = new Bot(process.env.BOT_TOKEN!);
bot.plugin(new WelcomePlugin());
```

## Interface Plugin

```typescript
interface BotPlugin<C extends Context = Context> {
    name: string;
    install(composer: Composer<C>, options?: any): void;
}
```

## Plugin Fungsional

Gunakan `createPlugin()` untuk plugin yang lebih sederhana dan bisa dikonfigurasi:

```typescript
import { createPlugin } from 'vibegram';

const salamPlugin = createPlugin('salam', (bot, opts: { pesan: string }) => {
    bot.command('salam', ctx => ctx.reply(opts.pesan));
    bot.hears(/halo/i, ctx => ctx.reply(opts.pesan));
});

// Install dengan opsi
bot.plugin(salamPlugin({ pesan: 'Halo dari plugin salam!' }));
```

## Preset

Gabungkan beberapa plugin menjadi satu preset yang bisa diinstal sekaligus:

```typescript
import { Preset } from 'vibegram';

const produksiPreset = new Preset('produksi', [
    new LoggerPlugin(),
    new RateLimitPlugin({ limit: 30 }),
    new SessionPlugin(),
    new CachePlugin({ ttl: 300 }),
]);

bot.plugin(produksiPreset);
```

## Membuat Plugin yang Bisa Digunakan Ulang

```typescript
// analytics-plugin.ts
import { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private webhookUrl: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const mulai = Date.now();
            await next();
            const durasi = Date.now() - mulai;

            // Kirim data ke layanan analytics Anda
            fetch(this.webhookUrl, {
                method: 'POST',
                body: JSON.stringify({
                    jenisUpdate: Object.keys(ctx.update).filter(k => k !== 'update_id'),
                    userId: ctx.from?.id,
                    durasi,
                }),
            }).catch(() => {});
        });
    }
}

// Penggunaan
bot.plugin(new AnalyticsPlugin('https://analytics.contoh.com/events'));
```

## Plugin vs Middleware

| Fitur        | Middleware   | Plugin                                |
| ------------ | ------------ | ------------------------------------- |
| Cakupan      | Satu fungsi  | Kumpulan middleware + command         |
| Konfigurasi  | Closure/opsi | Konstruktor atau factory              |
| Reusabilitas | Copy/paste   | Import dan install                    |
| Komposisi    | Manual       | Preset menggabungkan otomatis         |
| Publikasi    | N/A          | Bisa dipublikasikan sebagai paket npm |

::: tip
Plugin yang baik terdiri dari: middleware, handler command yang relevan, dan state inisialisasi. Hindari membuat plugin yang terlalu besar — satu plugin = satu fitur.
:::
