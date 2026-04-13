import { Bot, session, Scene, Stage } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Session middleware is required for scene state persistence
bot.use(session());

// ======== DEFINE A SCENE ========
const settingsScene = new Scene('settings');

// Commands scoped within this scene only
settingsScene.hears('back', async (ctx) => {
    await ctx.reply('✅ Exiting settings. Returning to global router.');
    ctx.scene?.leave();
});

settingsScene.on('message', async (ctx) => {
    await ctx.reply('⚙️ [Settings Scene]\n\nYou are in an isolated scene. Messages are not routed globally.\nType "back" to exit.');
});


// ======== REGISTER THE STAGE ========
const stage = new Stage([settingsScene]);
bot.use(stage.middleware());


// ======== GLOBAL COMMANDS ========
bot.command('start', async (ctx) => {
    await ctx.reply('Welcome! Send /settings to enter an isolated scene.');
});

bot.command('settings', async (ctx) => {
    await ctx.reply('Entering settings scene...');
    ctx.scene?.enter('settings');
});

bot.launch().then(() => console.log('Scene navigation bot running.'));
