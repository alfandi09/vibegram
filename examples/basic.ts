import { Bot, Markup } from '../src/index';

export function createBasicExample(token: string = 'YOUR_BOT_TOKEN') {
    const bot = new Bot(token);

    // Global middleware — logs every incoming update type
    bot.use(async (ctx, next) => {
        console.log(`Update received: ${ctx.updateType}`);
        await next();
    });

    // /start command with inline keyboard
    bot.command('start', async ctx => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('Send Image', 'send_pic')],
            [Markup.button.url('Visit Website', 'https://telegram.org')],
        ]);
        await ctx.reply('Welcome! Choose an option below:', { reply_markup: keyboard });
    });

    // Action handler for the "Send Image" button
    bot.action('send_pic', async ctx => {
        await ctx.answerCbQuery('Sending image...');
        await ctx.replyWithPhoto('https://picsum.photos/400', {
            caption: 'Demo image from Picsum.',
        });
    });

    // Global error handler
    bot.catch((err, ctx) => {
        console.error(`Error for chat_id ${ctx.chat?.id}:`, err);
    });

    return bot;
}

if (require.main === module) {
    const bot = createBasicExample(process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN');
    bot.launch().then(() => console.log('Bot is running.'));

    process.once('SIGINT', () => void bot.stop('SIGINT'));
    process.once('SIGTERM', () => void bot.stop('SIGTERM'));
}
