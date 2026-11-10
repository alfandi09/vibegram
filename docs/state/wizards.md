# Wizards

A wizard walks a user through a fixed sequence of questions: sign-up forms, order
forms, onboarding. You give it an array of **steps**; the wizard remembers which step
each user is on (in their [session](/state/session)) and sends their next message to
that step.

## How Steps Work

Every step is a function that runs on **one incoming update**. The usual pattern:

1. Step 0 runs right away when the wizard starts. It asks the first question and calls
   `ctx.wizard.next()`.
2. The user's answer arrives and runs step 1. It saves the answer, asks the next
   question, and calls `next()` again.
3. The last step saves the final answer and calls `ctx.wizard.leave()`.

If a step does **not** call `next()`, the user stays on it, which is how you ask again
after an invalid answer.

## Quick Start

```typescript
import { Bot, session, Wizard } from 'vibegram';

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(session()); // the wizard stores its position in the session

const signup = new Wizard('signup', [
    async ctx => {
        await ctx.reply('What is your name?');
        ctx.wizard!.next();
    },
    async ctx => {
        const name = ctx.message?.text;
        if (!name) return ctx.reply('Please send your name as text.'); // stays on this step
        ctx.wizard!.state.name = name;
        await ctx.reply(`Nice to meet you, ${name}! What is your email?`);
        ctx.wizard!.next();
    },
    async ctx => {
        const email = ctx.message?.text ?? '';
        if (!email.includes('@')) return ctx.reply('That does not look like an email. Try again:');
        await ctx.reply(`Done!\nName: ${ctx.wizard!.state.name}\nEmail: ${email}`);
        ctx.wizard!.leave();
    },
]);

bot.use(signup.middleware()); // after session(), before your other handlers
bot.command('signup', ctx => signup.enter(ctx));
```

## API

| Member | Description |
| --- | --- |
| `wizard.enter(ctx)` | Start (or restart) the wizard and run step 0 immediately |
| `ctx.wizard.next()` | Send the user's next update to the next step |
| `ctx.wizard.back()` | Send the next update to the previous step |
| `ctx.wizard.goto(index)` | Send the next update to any step (0-based) |
| `ctx.wizard.leave()` | Exit the wizard and clear its state |
| `ctx.wizard.state` | Object shared by all steps; put the collected answers here |
| `ctx.wizard.cursor` | Index of the step that is running |

`next()`, `back()`, and `goto()` only choose which step handles the **next** update.
They do not run that step now, so ask the matching question yourself.

## While a User Is in a Wizard

The wizard middleware takes **every** update from that user: texts, photos, commands,
and button presses all go to the current step, and your other handlers do not run.
Two consequences:

- **Check the input type.** A user may send a sticker where you expect text, so
  `ctx.message?.text` can be `undefined` (see the Quick Start).
- **Offer a way out.** `/cancel` also reaches the current step. Wrap steps so every one
  understands it:

```typescript
import type { WizardStep } from 'vibegram';

const cancellable =
    (step: WizardStep): WizardStep =>
    async ctx => {
        if (ctx.message?.text === '/cancel') {
            ctx.wizard!.leave();
            await ctx.reply('Cancelled.');
            return;
        }
        await step(ctx);
    };

const order = new Wizard('order', [askProduct, saveProduct, saveQuantity].map(cancellable));
```

If the steps run out without `leave()`, the wizard ends itself and the next update
goes to your normal handlers.

## Buttons Inside a Wizard

Because button presses also go to the current step, handle them **in the step**, not
with `bot.action()` (a `bot.action()` handler never sees them while the user is in the
wizard):

```typescript
import { Markup } from 'vibegram';

const confirmOrder = new Wizard('confirm', [
    async ctx => {
        await ctx.reply('How many units?');
        ctx.wizard!.next();
    },
    async ctx => {
        const quantity = Number(ctx.message?.text);
        if (!Number.isInteger(quantity) || quantity < 1) return ctx.reply('Send a whole number:');
        ctx.wizard!.state.quantity = quantity;
        await ctx.reply(`Order ${quantity} units?`, {
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('✅ Confirm', 'confirm'), Markup.button.callback('↩️ Change', 'change')],
            ]),
        });
        ctx.wizard!.next();
    },
    async ctx => {
        const choice = ctx.update.callback_query?.data;
        if (!choice) return ctx.reply('Please use the buttons above.');
        await ctx.answerCbQuery();

        if (choice === 'change') {
            ctx.wizard!.back(); // the next message goes to the quantity step again
            return ctx.reply('How many units?');
        }
        await ctx.editMessageText(`✅ Ordered ${ctx.wizard!.state.quantity} units.`);
        ctx.wizard!.leave();
    },
]);
```

## Wizard, Scene, or Conversation?

| Use | When |
| --- | --- |
| **Wizard** | A fixed list of questions asked in order |
| [Scene](/state/scenes) | A mode with its own commands, entered and left by the user |
| [Conversation](/state/conversations) | Free-form flows written as one async function (`await conv.waitForText()`) |

Wizard progress lives in the session, so it survives restarts when the session uses a
persistent store such as Redis.
