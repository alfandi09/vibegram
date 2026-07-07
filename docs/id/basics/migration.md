# Migrasi dari Telegraf dan grammY

VibeGram mengikuti pola bot Telegram yang familiar, sambil membawa session, scene,
wizard, menu, queue, caching, dan adapter dalam satu package.

## Mapping Umum

| Telegraf | grammY | VibeGram |
| --- | --- | --- |
| `bot.start(handler)` | `bot.command('start', handler)` | `bot.start(handler)` |
| `bot.help(handler)` | `bot.command('help', handler)` | `bot.help(handler)` |
| `ctx.replyWithHTML(text)` | `ctx.reply(text, { parse_mode: 'HTML' })` | `ctx.replyWithHTML(text)` |
| `Scenes.WizardScene` | conversations plugin | `new Wizard(id, steps)` |
| session middleware | session plugin | `session()` |
| custom webhook handler | setup adapter/plugin | `createExpressMiddleware`, `createFastifyPlugin`, `createHonoHandler` |

## Handler Command

```typescript
// Gaya Telegraf
bot.start(ctx => ctx.reply('Hello'));

// VibeGram
bot.start(ctx => ctx.reply('Hello'));
bot.command('status', ctx => ctx.reply('OK'));
```

Command yang ditargetkan ke bot lain akan diabaikan. Contohnya, `/start@OtherBot`
tidak memicu handler setelah VibeGram mengetahui username bot ini dari `getMe()`.

## Session

```typescript
import { session } from 'vibegram';

bot.use(session({ initial: () => ({ count: 0 }) }));

bot.hears('count', async ctx => {
    ctx.session.count += 1;
    await ctx.reply(String(ctx.session.count));
});
```

## Flow Wizard

```typescript
import { Wizard } from 'vibegram';

const signup = new Wizard('signup', [
    async ctx => {
        await ctx.reply('Nama?');
        ctx.wizard?.next();
    },
    async ctx => {
        ctx.wizard!.state.name = ctx.message?.text;
        await ctx.reply('Selesai');
        ctx.wizard?.leave();
    },
]);

bot.use(signup.middleware());
bot.command('signup', ctx => signup.enter(ctx));
```

## Catatan

- Gunakan local state lebih dulu; tambahkan scene, wizard, atau conversation ketika state flow sudah eksplisit.
- Simpan webhook secret dan bot token di luar source control.
- Untuk pesan forward, gunakan `message.forward_origin`; field legacy Bot API seperti `forward_from`, `forward_sender_name`, dan `forward_date` tidak lagi tersedia di tipe TypeScript.
- Untuk quiz poll, gunakan `correct_option_ids: [index]` atau beberapa index; `correct_option_id` tidak lagi tersedia di tipe TypeScript.
- `Chat` sekarang hanya memodelkan identitas chat ringkas dari update. Gunakan `ChatFullInfo` dari `ctx.getChat()` untuk metadata lengkap seperti permission, deskripsi, foto, reaction, dan pengaturan hadiah.
- Jalankan suite validasi penuh sebelum publish perubahan library.
