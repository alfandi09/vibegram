import { Bot, Markup, session, type Context } from 'vibegram';

interface SessionData {
    count: number;
}

type BotContext = Context<SessionData>;

/** Builds the bot without starting it, so tests can drive it offline. */
export function createBot(token: string): Bot<BotContext> {
    const bot = new Bot<BotContext>(token, { commandsOnEditedMessages: false });

    bot.use(session<SessionData>({ initial: () => ({ count: 0 }) }));

    bot.command('start', ctx =>
        ctx.reply(`Hi ${ctx.from?.first_name ?? 'there'}! Send me any text.`, {
            reply_markup: Markup.inlineKeyboard([[Markup.button.callback('Count', 'count')]]),
        })
    );

    bot.action('count', async ctx => {
        ctx.session.count++;
        await ctx.answerCbQuery(`Pressed ${ctx.session.count} time(s)`);
    });

    // Filter queries narrow types: ctx.message.text is a string here.
    bot.on('message:text', ctx => ctx.reply(`You said: ${ctx.message.text}`));

    bot.catch((error, ctx) => {
        console.error(`Error while handling update ${ctx.update.update_id}:`, error);
    });

    return bot;
}
