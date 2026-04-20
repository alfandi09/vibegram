# Sistem Plugin

Sistem plugin VibeGram memungkinkan komposisi fitur secara modular. Plugin mengenkapsulasi middleware, command, handler, dan service bersama menjadi unit yang bisa digunakan ulang dan diinstal.

## Memulai Cepat

```typescript
import { Bot, definePlugin } from 'vibegram';

const welcomePlugin = definePlugin({
    name: 'welcome',
    install(ctx) {
        ctx.bot.command('selamat', ctx => ctx.reply('Selamat datang!'));
        ctx.bot.command('halo', ctx => ctx.reply('Halo! Ada yang bisa saya bantu?'));
    },
});

const bot = new Bot(process.env.BOT_TOKEN!);
bot.plugin(welcomePlugin());
```

## Gaya yang Didukung

Saat ini VibeGram mendukung dua gaya penulisan plugin:

- plugin legacy lewat `BotPlugin`
- plugin modern berbasis `definePlugin()`

Untuk plugin baru, `definePlugin()` adalah pilihan yang disarankan karena mendukung dependency, service registry, dan lifecycle.

## Interface Legacy

```typescript
interface BotPlugin<C extends Context = Context> {
    name: string;
    install(composer: Composer<C>, options?: any): void;
}
```

## Plugin Berbasis Definisi

Gunakan `definePlugin()` untuk plugin baru:

```typescript
import { definePlugin } from 'vibegram';

const salamPlugin = definePlugin({
    name: 'salam',
    defaults: { pesan: 'Halo' },
    install(ctx) {
        ctx.bot.command('salam', ctx => ctx.reply(ctx.options.pesan));
        ctx.bot.hears(/halo/i, ctx => ctx.reply(ctx.options.pesan));
    },
});

bot.plugin(salamPlugin({ pesan: 'Halo dari plugin salam!' }));
```

## Helper Fungsional Legacy

Gunakan `createPlugin()` jika Anda memang ingin bentuk helper lama yang ringan:

```typescript
import { createPlugin } from 'vibegram';

const salamLegacy = createPlugin('salam-legacy', (bot, opts: { pesan: string }) => {
    bot.command('salam-legacy', ctx => ctx.reply(opts.pesan));
});

bot.plugin(salamLegacy({ pesan: 'Halo dari plugin legacy!' }));
```

## Plugin Context

Plugin berbasis definisi menerima `PluginContext`:

```typescript
interface PluginContext<C extends Context = Context, O extends object = {}> {
    bot: Bot<C>;
    composer: Composer<C>;
    options: Readonly<O>;
    metadata: RegisteredPluginMetadata;
    services: PluginServiceRegistry;
    provide<T>(key: string, value: T): void;
    require<T>(key: string): T;
    has(key: string): boolean;
}
```

## Dependency dan Service

Plugin bisa bergantung pada plugin lain dan berbagi service lewat registry:

```typescript
import { definePlugin } from 'vibegram';

const cachePlugin = definePlugin({
    name: 'cache',
    install(ctx) {
        ctx.provide('cache-store', new Map());
    },
});

const fiturPlugin = definePlugin({
    name: 'fitur',
    dependencies: [{ name: 'cache' }],
    install(ctx) {
        const store = ctx.require<Map<string, string>>('cache-store');
        store.set('siap', 'ya');
    },
});

bot.plugin(cachePlugin());
bot.plugin(fiturPlugin());
```

## Lifecycle

Gunakan `setup()` untuk pekerjaan startup dan `teardown()` untuk cleanup:

```typescript
const workerPlugin = definePlugin({
    name: 'worker',
    install() {},
    async setup(ctx) {
        ctx.provide('worker-status', { running: true });
    },
    async teardown() {
        // Tutup koneksi, hentikan worker, flush buffer, dan sebagainya.
    },
});
```

Lifecycle juga bisa dipanggil eksplisit tanpa menjalankan polling:

```typescript
await bot.initializePlugins();
await bot.teardownPlugins();
```

## Preset

Gabungkan beberapa plugin menjadi satu preset yang bisa diinstal sekaligus:

```typescript
import { Preset, loggerPlugin, rateLimitPlugin, sessionPlugin } from 'vibegram';

const produksiPreset = new Preset('produksi', [
    loggerPlugin(),
    rateLimitPlugin({ limit: 30 }),
    sessionPlugin(),
]);

bot.plugin(produksiPreset);
```

## Wrapper Plugin First-Party

Wrapper yang saat ini tersedia untuk API plugin baru:

- `loggerPlugin(options?)`
- `rateLimitPlugin(options?)`
- `i18nPlugin(options?)`
- `sessionPlugin(options?)`

Contoh:

```typescript
import { Bot, i18nPlugin, loggerPlugin, sessionPlugin } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.plugin(loggerPlugin());
bot.plugin(
    i18nPlugin({
        defaultLang: 'id',
        locales: {
            id: { welcome: 'Selamat datang' },
        },
    })
);
bot.plugin(sessionPlugin({ initial: () => ({ count: 0 }) }));
```

## Membuat Plugin Legacy yang Bisa Digunakan Ulang

```typescript
import { BotPlugin, Composer, Context } from 'vibegram';

export class AnalyticsPlugin implements BotPlugin {
    name = 'analytics';

    constructor(private webhookUrl: string) {}

    install(bot: Composer<Context>) {
        bot.use(async (ctx, next) => {
            const mulai = Date.now();
            await next();
            const durasi = Date.now() - mulai;

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

bot.plugin(new AnalyticsPlugin('https://analytics.contoh.com/events'));
```

## Rekomendasi Saat Ini

- Gunakan `definePlugin()` untuk plugin baru.
- Pertahankan `createPlugin()` dan `BotPlugin` berbasis class untuk kompatibilitas atau helper kecil.
- Gunakan service registry untuk integrasi antar plugin, jangan bergantung ke detail internal plugin lain.

## Plugin vs Middleware

| Fitur | Middleware | Plugin |
|-------|-----------|--------|
| Cakupan | Satu fungsi | Kumpulan middleware, command, dan service |
| Konfigurasi | Closure/opsi | Definisi plugin, factory, atau class |
| Reusabilitas | Copy/paste | Import dan install |
| Komposisi | Manual | Dependency dan preset |
| Publikasi | N/A | Bisa dipublikasikan sebagai paket npm |
