import { Bot, apiCache } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Enable API response caching with 5-minute TTL
bot.use(apiCache({ ttl: 300 }));

bot.command('info', async (ctx) => {
    // First call hits the API
    const chat = await ctx.getChat();

    // Second call (within TTL) returns cached data — no API hit
    const chatAgain = await ctx.getChat();

    await ctx.reply(`Chat: ${chat.title || chat.first_name}\n(Response was cached)`);
});

bot.command('members', async (ctx) => {
    const count = await ctx.getChatMembersCount();
    await ctx.reply(`Members: ${count} (cached for 5 minutes)`);
});

bot.launch().then(() => console.log('Cache bot running. Try /info'));
