import { Bot } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Exact string match
bot.hears('hello', async (ctx) => {
    await ctx.reply('Hello there!');
});

// Case-insensitive regex match
bot.hears(/hello/i, async (ctx) => {
    await ctx.reply('Matched via regex handler!');
});

// Event-based routing — triggers when a photo is received
bot.on('photo', async (ctx) => {
    await ctx.reply('Photo received.');
});

bot.launch();
