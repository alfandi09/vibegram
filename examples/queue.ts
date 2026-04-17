import { Bot, BotQueue } from '../src/index';

export function createQueueExample(token: string = 'YOUR_BOT_TOKEN') {
    const bot = new Bot(token);

    const queue = new BotQueue(bot.client, {
        concurrency: 25,
        delayMs: 1000,
        onError: (err, chatId) => console.error(`Failed for ${chatId}:`, err.message),
        onProgress: (done, total) => console.log(`Progress: ${done}/${total}`),
    });

    // Broadcast to multiple users
    bot.command('broadcast', async ctx => {
        // In production, load user IDs from your database
        const userIds = [123456, 789012, 345678];

        await ctx.reply(`Starting broadcast to ${userIds.length} users...`);

        const result = await queue.broadcastMessage(
            userIds,
            '📢 Important announcement from the bot!',
            {
                parse_mode: 'HTML',
            }
        );

        await ctx.reply(
            `Broadcast complete:\n` +
                `✅ Success: ${result.success}\n` +
                `❌ Failed: ${result.failed}\n` +
                `⏱️ Duration: ${result.durationMs}ms`
        );
    });

    // Schedule a recurring message
    bot.command('schedule', async ctx => {
        queue.scheduleInterval('daily_tip', 60000, async () => {
            console.log('Scheduled job executed');
            // await bot.callApi('sendMessage', { chat_id: channelId, text: 'Daily tip!' });
        });
        await ctx.reply('Recurring job scheduled (every 60 seconds).');
    });

    bot.command('cancel_schedule', async ctx => {
        queue.cancelScheduled('daily_tip');
        await ctx.reply('Scheduled job cancelled.');
    });

    return { bot, queue };
}

if (require.main === module) {
    const { bot } = createQueueExample(process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN');
    bot.launch().then(() => console.log('Queue bot running. Try /broadcast'));
}
