import { Bot, Menu, session } from '../src/index';

export function createMenuExample(token: string = 'YOUR_BOT_TOKEN') {
    const bot = new Bot(token);
    bot.use(session());

    // Build a main menu
    const mainMenu = new Menu('main');

    mainMenu.text('📢 News', async ctx => {
        await ctx.answerCbQuery('Loading news...');
        await ctx.reply('Latest news: VibeGram v1.1 released!');
    });

    mainMenu.text('💰 Balance', async ctx => {
        await ctx.answerCbQuery();
        await ctx.reply('Your balance: $100.00');
    });

    mainMenu.row();

    // Create a settings sub-menu
    const settingsMenu = mainMenu.submenu('settings', '⚙️ Settings');

    settingsMenu.text('🌙 Dark Mode', async ctx => {
        await ctx.answerCbQuery('Dark mode toggled!');
    });

    settingsMenu.text('🔔 Notifications', async ctx => {
        await ctx.answerCbQuery('Notifications toggled!');
    });

    settingsMenu.row();
    settingsMenu.back('← Back to Main');

    mainMenu.row();
    mainMenu.url('📚 Documentation', 'https://telegram.org');

    // Register menu middleware
    bot.use(mainMenu.middleware());

    bot.command('menu', async ctx => {
        const keyboard = await mainMenu.render(ctx);
        await ctx.reply('📋 Main Menu:', { reply_markup: keyboard });
    });

    return { bot, mainMenu };
}

if (require.main === module) {
    const { bot } = createMenuExample(process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN');
    bot.launch().then(() => console.log('Menu bot running. Send /menu'));
}
