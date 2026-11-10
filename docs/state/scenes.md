# Scenes

A scene is a **mode** the user enters and later leaves, with its own handlers. While
a user is in the `settings` scene, the words "theme" or "back" mean something different
than they do elsewhere in your bot. Each user's current scene is stored in their
[session](/state/session).

## Quick Start

```typescript
import { Bot, session, Scene, Stage } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session()); // 1. scenes store the current scene in the session

const settings = new Scene('settings');
settings.hears('theme', ctx => ctx.reply('Choose: light or dark?'));
settings.hears('back', async ctx => {
    ctx.scene!.leave();
    await ctx.reply('Left settings.');
});
settings.on('message', ctx => ctx.reply('You are in settings. Send "theme" or "back".'));

bot.use(new Stage([settings]).middleware()); // 2. after session(), before other handlers

bot.command('settings', async ctx => {
    ctx.scene!.enter('settings'); // 3. enter from a normal handler
    await ctx.reply('Settings. Send "theme" or "back".');
});
```

Entering a scene sends nothing by itself, so reply with instructions right after
`enter()`. The user's **next** update is the first one routed into the scene.

## How Routing Works

For a user in a scene, the Stage middleware runs the scene's handlers first:

- If a scene handler handles the update, your global handlers do **not** run.
- If no scene handler matches (or one calls `next()`), the update **continues** to
  your global handlers.

So the catch-all `settings.on('message', ...)` above is what keeps every message
inside the scene. Without it, a message the scene does not recognise reaches your
global handlers. Updates the scene has no handler for, such as button presses here,
always continue to the global handlers.

## API

| Member | Description |
| --- | --- |
| `new Scene(id)` | A scene; add handlers with `command`, `hears`, `on`, `action`, `filter`, ... |
| `new Stage([scenes])` | Holds all scenes; register `stage.middleware()` once |
| `ctx.scene.enter(id, state?)` | Enter a scene; `state` becomes `ctx.scene.state` |
| `ctx.scene.reenter(state?)` | Stay in the current scene and reset its state |
| `ctx.scene.leave()` | Exit the current scene |
| `ctx.scene.current` | Id of the current scene, or `undefined` |
| `ctx.scene.state` | Data kept for the user while they are in the scene |

## Scene State

Pass data in when entering and read it later; it is cleared on `leave()`:

```typescript
const quiz = new Scene('quiz');

quiz.hears(/^\d+$/, async ctx => {
    const answer = Number(ctx.message?.text);
    ctx.scene!.state.score = (ctx.scene!.state.score ?? 0) + (answer === 4 ? 1 : 0);
    await ctx.reply(`Score: ${ctx.scene!.state.score}. Next: what is 2 + 2?`);
});
quiz.command('stop', async ctx => {
    await ctx.reply(`Final score: ${ctx.scene!.state.score ?? 0}`);
    ctx.scene!.leave();
});

bot.command('quiz', async ctx => {
    ctx.scene!.enter('quiz', { score: 0 });
    await ctx.reply('Quiz started! What is 2 + 2? (/stop to finish)');
});
```

## Several Scenes

Register all scenes in one Stage. A user is in at most one scene at a time; entering
another one replaces it.

```typescript
const faq = new Scene('faq');
faq.hears('back', ctx => ctx.scene!.leave());
faq.on('message', ctx => ctx.reply('Ask a question, or send "back".'));

const contact = new Scene('contact');
contact.hears('back', ctx => ctx.scene!.leave());
contact.on('message', ctx => ctx.reply('Thanks! We will reply soon. Send "back" to leave.'));

bot.use(new Stage([faq, contact]).middleware());

bot.command('faq', ctx => ctx.scene!.enter('faq'));
bot.command('contact', ctx => ctx.scene!.enter('contact'));
```

## Scene, Wizard, or Conversation?

| Use | When |
| --- | --- |
| **Scene** | A mode with its own commands and words, left when the user chooses |
| [Wizard](/state/wizards) | A fixed list of questions asked in order |
| [Conversation](/state/conversations) | Free-form flows written as one async function |

::: tip Order matters
Register `bot.use(session())` before `stage.middleware()`, and the stage before the
handlers it should take priority over.
:::
