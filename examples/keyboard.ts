import { Bot, Markup } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.command('start', async (ctx) => {
    // Custom Reply Keyboard — persistent buttons at the bottom of the chat
    const replyKeyboard = Markup.keyboard([
        [Markup.replyButton.text('📢 Latest Deals'), Markup.replyButton.text('🛍️ My Shop')],
        [Markup.replyButton.requestContact('📱 Share Phone Number')],
        [Markup.replyButton.requestLocation('📍 Share Location')]
    ], {
        resize_keyboard: true,
        one_time_keyboard: false
    });

    await ctx.reply('Hello! Tap a button below to get started:', {
        reply_markup: replyKeyboard
    });
});

bot.hears('📢 Latest Deals', async (ctx) => {
    await ctx.reply('No promotions available today.');
});

// Remove custom keyboard, restore default OS keyboard
bot.command('close', async (ctx) => {
    await ctx.reply('Custom keyboard removed.', {
        reply_markup: Markup.removeKeyboard()
    });
});

// Force Reply — prompts the user to reply to the bot's message
bot.command('survey', async (ctx) => {
    await ctx.reply('What is the capital of Indonesia?', {
        reply_markup: Markup.forceReply({
            input_field_placeholder: 'Type your answer...'
        })
    });
});

bot.launch().then(() => console.log('Keyboard bot running. Send /start'));
