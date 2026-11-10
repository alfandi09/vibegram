import { Bot } from 'vibegram';

/** Builds the bot without starting it, so tests can drive it offline. */
export function createBot(token: string): Bot {
    const bot = new Bot(token, { commandsOnEditedMessages: false });

    bot.command('start', ctx => ctx.reply('Hello from Cloudflare Workers!'));
    bot.on('message:text', ctx => ctx.reply(`Echo: ${ctx.message.text}`));

    return bot;
}
