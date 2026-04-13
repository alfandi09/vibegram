import { Bot, createPlugin, BotPlugin, Preset } from '../src/index';
import { rateLimit } from '../src/index';
import { logger } from '../src/index';
import { session } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// 1. Create a plugin using the functional API
const greetingPlugin = createPlugin('greeting', (bot, opts: { message: string }) => {
    bot.command('greet', async (ctx) => {
        await ctx.reply(opts.message);
    });
});

// 2. Create a class-based plugin
class WelcomePlugin implements BotPlugin {
    name = 'welcome';

    install(bot: any) {
        bot.command('welcome', async (ctx: any) => {
            await ctx.reply(`Welcome, ${ctx.from?.first_name}!`);
        });
    }
}

// 3. Combine plugins into a preset
const productionPreset = new Preset('production', [
    {
        name: 'logger',
        install: (bot) => bot.use(logger())
    },
    {
        name: 'rateLimit',
        install: (bot) => bot.use(rateLimit())
    },
    {
        name: 'session',
        install: (bot) => bot.use(session())
    }
]);

// Install everything
bot.plugin(productionPreset);
bot.plugin(greetingPlugin({ message: 'Hello from the greeting plugin!' }));
bot.plugin(new WelcomePlugin());

bot.launch().then(() => console.log('Plugin bot running. Try /greet or /welcome'));
