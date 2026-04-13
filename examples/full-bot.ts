/**
 * VibeGram — Full-featured Bot Example
 *
 * Demonstrates all major features: command routing, hears, action,
 * session, scene manager, wizard, conversation, rate limiter,
 * pagination, and webhook setup.
 *
 * Run: ts-node examples/full-bot.ts
 */

import {
    Bot,
    session,
    rateLimit,
    Markup,
    Scene,
    Stage,
    Wizard,
    Conversation,
    createExpressMiddleware,
} from '../src/index';

const bot = new Bot(process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN');

// ---------------------------------------------------------------------------
// MIDDLEWARE STACK
// ---------------------------------------------------------------------------

// 1. Session — persistent per-user state
bot.use(session({ initial: () => ({ count: 0, lang: 'en' }) }));

// 2. Rate Limiter — auto-tuned to Telegram limits
bot.use(rateLimit());

// ---------------------------------------------------------------------------
// COMMANDS
// ---------------------------------------------------------------------------

bot.command('start', async ctx => {
    const name = ctx.from?.first_name || 'there';
    await ctx.reply(
        `👋 Hello <b>${name}</b>! I am VibeGram Demo Bot.\n\n` +
        `Available commands:\n` +
        `/count - Increment your counter\n` +
        `/products - Browse paginated products\n` +
        `/checkout - Multi-step wizard form\n` +
        `/language - Select your language\n` +
        `/quiz - Start a quiz\n`,
        { parse_mode: 'HTML' }
    );
});

bot.command('count', async ctx => {
    ctx.session.count++;
    await ctx.reply(`You have run /count ${ctx.session.count} times.`);
});

// ---------------------------------------------------------------------------
// HEARS — text pattern matching with ctx.match
// ---------------------------------------------------------------------------

bot.hears(/^#(\w+)$/, async ctx => {
    const tag = ctx.match![1]; // capture group 1
    await ctx.reply(`You used the hashtag: <b>#${tag}</b>`, { parse_mode: 'HTML' });
});

bot.hears('ping', async ctx => {
    await ctx.reply('🏓 Pong!');
});

// ---------------------------------------------------------------------------
// INLINE KEYBOARD — Markup.grid
// ---------------------------------------------------------------------------

bot.command('products', async ctx => {
    const items = Array.from({ length: 12 }, (_, i) => ({
        text: `Product ${i + 1}`,
        callback_data: `product_${i + 1}`,
    }));

    await ctx.reply('Choose a product:', {
        reply_markup: Markup.pagination(items, {
            currentPage: 1,
            itemsPerPage: 6,
            actionNext: 'page_next',
            actionPrev: 'page_prev',
            columns: 2,
        })
    });
});

bot.action(/^product_(\d+)$/, async ctx => {
    const id = ctx.match![1];
    await ctx.answerCbQuery(`Selected Product #${id}`);
    await ctx.editMessageText(`You selected Product #${id} 🛒`);
});

// ---------------------------------------------------------------------------
// LANGUAGE SELECTION — grid keyboard
// ---------------------------------------------------------------------------

bot.command('language', async ctx => {
    await ctx.reply('Choose your language:', {
        reply_markup: Markup.grid([
            Markup.button.callback('🇺🇸 English', 'lang_en'),
            Markup.button.callback('🇮🇩 Indonesia', 'lang_id'),
            Markup.button.callback('🇯🇵 日本語', 'lang_ja'),
            Markup.button.callback('🇸🇦 العربية', 'lang_ar'),
        ], 2)
    });
});

bot.action(/^lang_(\w+)$/, async ctx => {
    const lang = ctx.match![1];
    ctx.session.lang = lang;
    await ctx.answerCbQuery(`Language set to ${lang}`);
    await ctx.editMessageText(`✅ Language updated to: ${lang}`);
});

// ---------------------------------------------------------------------------
// WIZARD — Multi-step form
// ---------------------------------------------------------------------------

bot.use(session());

const checkout = new Wizard('checkout', [
    async ctx => {
        await ctx.reply('📦 Step 1/3: What is the recipient name?');
        ctx.wizard?.next();
    },
    async ctx => {
        const name = ctx.message?.text;
        (ctx.wizard as any).state.recipient = name;
        await ctx.reply('📍 Step 2/3: What is the delivery address?');
        ctx.wizard?.next();
    },
    async ctx => {
        const address = ctx.message?.text;
        const { recipient } = (ctx.wizard as any).state;
        await ctx.reply(
            `✅ Order confirmed!\n\nRecipient: ${recipient}\nAddress: ${address}`,
        );
        ctx.wizard?.leave();
    }
]);

bot.use(checkout.middleware());
bot.command('checkout', ctx => checkout.enter(ctx));

// ---------------------------------------------------------------------------
// CONVERSATION — async linear dialogues
// ---------------------------------------------------------------------------

const conv = new Conversation();

conv.define('quiz', async (ctx, c) => {
    await ctx.reply('🧠 Quiz: What is 2 + 2?');
    const answer = await c.waitForText({
        validate: ctx => ['4', 'four'].includes(ctx.message?.text?.toLowerCase() || ''),
        validationError: '❌ Wrong! Hint: it is a single digit. Try again:',
        timeout: 30_000,
    });
    await ctx.reply(`✅ Correct! "${answer}" is right!`);
});

bot.use(conv.middleware());
bot.command('quiz', ctx => conv.enter('quiz', ctx));

// ---------------------------------------------------------------------------
// SCENE MANAGER
// ---------------------------------------------------------------------------

const adminScene = new Scene('admin');
adminScene.command('exit', ctx => ctx.scene?.leave());
adminScene.on('message', ctx =>
    ctx.reply('You are in Admin Mode. Type /exit to leave.')
);

const stage = new Stage([adminScene]);
bot.use(stage.middleware());
bot.command('admin', ctx => ctx.scene?.enter('admin'));

// ---------------------------------------------------------------------------
// LAUNCH — polling or webhook
// ---------------------------------------------------------------------------

if (process.env.WEBHOOK_URL) {
    // Webhook mode
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.post('/webhook', createExpressMiddleware(bot, { secretToken: process.env.WEBHOOK_SECRET }));
    app.listen(3000, () => {
        bot.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
        console.log('[VibeGram] Webhook server running on :3000');
    });
} else {
    // Polling mode
    bot.launch({ onStart: me => console.log(`[VibeGram] @${me.username} is online`) });
}

export {};
