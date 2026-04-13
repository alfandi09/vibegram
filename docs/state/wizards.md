# Wizards

Wizards guide users through multi-step conversations (forms, registration flows, onboarding). Each step is a function that runs sequentially.

## Quick Start

```typescript
import { Bot, session, Wizard } from 'vibegram';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(session());

const registrationWizard = new Wizard('register', [
    async (ctx) => {
        await ctx.reply('Step 1: What is your name?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.name = ctx.message?.text;
        await ctx.reply(`Step 2: Hello ${ctx.wizard!.state.name}! What is your email?`);
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.email = ctx.message?.text;
        await ctx.reply(`Done!\nName: ${ctx.wizard!.state.name}\nEmail: ${ctx.wizard!.state.email}`);
        ctx.wizard?.leave();
    }
]);

bot.use(registrationWizard.middleware());

bot.command('register', ctx => registrationWizard.enter(ctx));
```

## Wizard API

| Method | Description |
|--------|-------------|
| `wizard.enter(ctx)` | Start the wizard from step 0 |
| `ctx.wizard?.next()` | Advance to the next step |
| `ctx.wizard?.back()` | Go back to the previous step |
| `ctx.wizard?.leave()` | Exit the wizard |
| `ctx.wizard?.state` | Shared state object across all steps |
| `ctx.wizard?.cursor` | Current step index (0-based) |

## Wizard State

The `ctx.wizard.state` object persists across all steps within a single wizard session:

```typescript
const orderWizard = new Wizard('order', [
    async (ctx) => {
        await ctx.reply('What product would you like to order?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.product = ctx.message?.text;
        await ctx.reply('How many units?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.quantity = parseInt(ctx.message?.text || '1');
        await ctx.reply('What is your delivery address?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        const { product, quantity } = ctx.wizard!.state;
        const address = ctx.message?.text;
        await ctx.reply(`Order confirmed!\nProduct: ${product}\nQuantity: ${quantity}\nAddress: ${address}`);
        ctx.wizard?.leave();
    }
]);
```

## Input Validation

```typescript
const validated = new Wizard('validated', [
    async (ctx) => {
        await ctx.reply('Enter your age (number only):');
        ctx.wizard?.next();
    },
    async (ctx) => {
        const age = parseInt(ctx.message?.text || '');
        if (isNaN(age) || age < 1 || age > 150) {
            return ctx.reply('Invalid age. Please enter a valid number:');
            // Don't call next() — stay on same step
        }
        ctx.wizard!.state.age = age;
        await ctx.reply(`Age ${age} recorded. Done!`);
        ctx.wizard?.leave();
    }
]);
```

::: tip
If you don't call `ctx.wizard?.next()`, the user stays on the current step — perfect for input validation loops.
:::
