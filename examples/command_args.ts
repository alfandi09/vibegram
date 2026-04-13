import { Bot } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Command argument parsing example
// Usage: /ban @username Reason for ban
bot.command('ban', async (ctx) => {
    const args = ctx.command?.args;

    if (!args || args.length === 0) {
        return ctx.reply('Usage: /ban @username [reason]');
    }

    const targetUser = args[0]; // "@username"
    const reason = args.slice(1).join(' ') || 'No reason provided';

    await ctx.reply(`User banned:\nTarget: ${targetUser}\nReason: ${reason}`);
});

// Multi-argument command
// Usage: /pay 50000 ewallet
bot.command('pay', async (ctx) => {
    const args = ctx.command?.args;

    if (args?.length !== 2) {
        return ctx.reply('Usage: /pay <amount> <method>');
    }

    const amount = parseInt(args[0]);
    const method = args[1];

    await ctx.reply(`Invoice created: $${amount} via ${method}.`);
});

bot.launch().then(() => console.log('Bot running. Try /pay 50000 ewallet'));
