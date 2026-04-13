import { Bot, rateLimit } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Enable anti-spam rate limiter with default Telegram-aligned thresholds
// Default: Private chats = 1 msg/sec | Group chats = 20 msg/min
bot.use(rateLimit());

// Alternative: Custom rate limiting for specific use cases (e.g., quiz events)
/*
bot.use(rateLimit({
    window: 5000,   // 5-second window
    limit: 1,       // Max 1 message per window
    onLimitExceeded: async (ctx, next) => {
        await ctx.reply('Rate limit exceeded. Please wait 5 seconds.');
    }
}));
*/

bot.command('start', async (ctx) => {
    await ctx.reply('Welcome! Try sending 10 rapid messages. The rate limiter will automatically throttle excess traffic without impacting server performance.');
});

bot.on('message', async (ctx) => {
    console.log(`[Processed] Message from: ${ctx.from?.first_name}`);
    await ctx.reply('Message processed.');
});

bot.launch().then(() => console.log('Rate-limited bot running.'));
