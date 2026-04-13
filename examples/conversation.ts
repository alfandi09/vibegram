import { Bot, session, Conversation } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');
bot.use(session());

const conv = new Conversation();

// Define an order conversation with validation
conv.define('order', async (ctx, c) => {
    await ctx.reply('What product would you like to order?');
    const product = await c.waitForText();

    await ctx.reply(`How many "${product}" do you want? (enter a number)`);
    const qtyText = await c.waitForText({
        validate: (ctx) => !isNaN(parseInt(ctx.message?.text || '')),
        validationError: 'Please enter a valid number.'
    });
    const qty = parseInt(qtyText);

    await ctx.reply(`Order confirmed: ${qty}x ${product}. Thank you!`);
});

// Define a feedback conversation with timeout
conv.define('feedback', async (ctx, c) => {
    await ctx.reply('Please share your feedback (you have 60 seconds):');
    try {
        const feedback = await c.waitForText({ timeout: 60000 });
        await ctx.reply(`Thank you for your feedback: "${feedback}"`);
    } catch (err) {
        await ctx.reply('Feedback timed out. You can try again with /feedback.');
    }
});

bot.use(conv.middleware());

bot.command('order', ctx => conv.enter('order', ctx));
bot.command('feedback', ctx => conv.enter('feedback', ctx));

bot.launch().then(() => console.log('Conversation bot running. Try /order or /feedback'));
