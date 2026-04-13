import { Bot, and, or, not, isPrivate, isGroup, isAdmin, isBot, hasPhoto, hasText, isUser } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Only respond in private chats
bot.on('message', and(isPrivate, hasText), async (ctx, next) => {
    console.log(`Private message from ${ctx.from?.first_name}`);
    await next();
});

// Admin-only command in groups
bot.command('ban', and(isGroup, isAdmin()), async (ctx) => {
    await ctx.reply('Admin action executed.');
});

// Ignore bots
bot.on('message', and(not(isBot), hasText), async (ctx) => {
    await ctx.reply('Hello human!');
});

// Only specific users
bot.command('secret', isUser(123456, 789012), async (ctx) => {
    await ctx.reply('Secret content for VIPs only.');
});

// Photo in private chat
bot.on('message', and(isPrivate, hasPhoto), async (ctx) => {
    await ctx.reply('Nice photo! (private chat only)');
});

bot.launch().then(() => console.log('Filter bot running.'));
