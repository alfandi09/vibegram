import { Bot, session, Wizard } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Session is required for wizard state persistence
bot.use(session());

// Define a multi-step conversation wizard
const registrationWizard = new Wizard('register_flow', [
    async (ctx) => {
        await ctx.reply('Welcome! Let\'s get started. What is your name?');
        ctx.wizard?.next();
    },
    async (ctx) => {
        const name = ctx.message?.text;
        ctx.wizard!.state.name = name;
        await ctx.reply(`Thank you, ${name}. What city do you live in?`);
        ctx.wizard?.next();
    },
    async (ctx) => {
        ctx.wizard!.state.city = ctx.message?.text;
        await ctx.reply(`Registration complete!\nName: ${ctx.wizard!.state.name}\nCity: ${ctx.wizard!.state.city}`);
        ctx.wizard?.leave();
    }
]);

bot.use(registrationWizard.middleware());

bot.command('register', (ctx) => {
    registrationWizard.enter(ctx);
});

bot.launch().then(() => console.log('Wizard bot running. Send /register'));
