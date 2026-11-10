import { createBot } from './bot.js';

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('Set BOT_TOKEN in .env (get one from @BotFather).');
}

const bot = createBot(token);
await bot.launch({ onStart: me => console.log(`@${me.username} is running`) });
