# Migration from Telegraf and grammY

VibeGram follows familiar Telegram bot patterns while keeping sessions, scenes, wizards,
menus, queues, caching, and adapters in one package.

## Common Mapping

| Telegraf                  | grammY                                    | VibeGram                                                              |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `bot.start(handler)`      | `bot.command('start', handler)`           | `bot.start(handler)`                                                  |
| `bot.help(handler)`       | `bot.command('help', handler)`            | `bot.help(handler)`                                                   |
| `ctx.replyWithHTML(text)` | `ctx.reply(text, { parse_mode: 'HTML' })` | `ctx.replyWithHTML(text)`                                             |
| `Scenes.WizardScene`      | conversations plugin                      | `new Wizard(id, steps)`                                               |
| session middleware        | session plugin                            | `session()`                                                           |
| custom webhook handler    | adapter/plugin setup                      | `createExpressMiddleware`, `createFastifyPlugin`, `createHonoHandler` |

## Command Handlers

```typescript
// Telegraf-style
bot.start(ctx => ctx.reply('Hello'));

// VibeGram
bot.start(ctx => ctx.reply('Hello'));
bot.command('status', ctx => ctx.reply('OK'));
```

## Sessions

```typescript
import { session } from 'vibegram';

bot.use(session({ initial: () => ({ count: 0 }) }));

bot.hears('count', async ctx => {
    ctx.session.count += 1;
    await ctx.reply(String(ctx.session.count));
});
```

## Wizard Flows

```typescript
import { Wizard } from 'vibegram';

const signup = new Wizard('signup', [
    async ctx => {
        await ctx.reply('Name?');
        ctx.wizard?.next();
    },
    async ctx => {
        ctx.wizard!.state.name = ctx.message?.text;
        await ctx.reply('Done');
        ctx.wizard?.leave();
    },
]);

bot.use(signup.middleware());
bot.command('signup', ctx => signup.enter(ctx));
```

## Notes

- Use local state first; add scenes, wizards, or conversations when flow state becomes explicit.
- Keep webhook secrets and bot tokens outside source control.
- For forwarded messages, use `message.forward_origin`; legacy Bot API fields such as `forward_from`, `forward_sender_name`, and `forward_date` are no longer typed.
- For quiz polls, use `correct_option_ids: [index]` or multiple indexes; `correct_option_id` is no longer typed.
- `Chat` now only models compact update chat identity. Use `ChatFullInfo` from `ctx.getChat()` for full metadata such as permissions, description, photo, reactions, and gift settings.
- Run the full validation suite before publishing library changes.
