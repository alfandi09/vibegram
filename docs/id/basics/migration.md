# Migrasi dari Telegraf dan grammY

VibeGram memakai pola yang familiar, dengan session, scene, wizard, menu, queue,
caching, dan adapter tersedia langsung dalam satu package.

| Telegraf                  | grammY                                    | VibeGram                  |
| ------------------------- | ----------------------------------------- | ------------------------- |
| `bot.start(handler)`      | `bot.command('start', handler)`           | `bot.start(handler)`      |
| `bot.help(handler)`       | `bot.command('help', handler)`            | `bot.help(handler)`       |
| `ctx.replyWithHTML(text)` | `ctx.reply(text, { parse_mode: 'HTML' })` | `ctx.replyWithHTML(text)` |
| `Scenes.WizardScene`      | conversations plugin                      | `new Wizard(id, steps)`   |
| session middleware        | session plugin                            | `session()`               |

```typescript
import { session, Wizard } from 'vibegram';

bot.use(session());

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

## Catatan Breaking Change

- Untuk pesan forward, gunakan `message.forward_origin`; field legacy Bot API seperti `forward_from`, `forward_sender_name`, dan `forward_date` tidak lagi tersedia di tipe TypeScript.
