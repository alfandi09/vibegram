import { Bot, session } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Define typed session interface for IDE autocompletion
interface MySession {
    counter: number;
}

// Register session middleware with typed initial state
bot.use(session<MySession>({
    initial: () => ({ counter: 0 })
}));

// Access session state via ctx.session
bot.on('message', async (ctx) => {
    ctx.session.counter++;
    const name = ctx.from?.first_name || 'Anonymous';

    await ctx.reply(`Hello ${name}! You have sent ${ctx.session.counter} messages in this session.`);
});

bot.launch().then(() => console.log('Session bot running.'));

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
