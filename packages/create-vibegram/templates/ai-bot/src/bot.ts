import { Bot, ReplyStreamer } from 'vibegram';
import { generateAnswer } from './ai.js';

/** Builds the bot without starting it, so tests can drive it offline. */
export function createBot(token: string, generate = generateAnswer): Bot {
    const bot = new Bot(token, { commandsOnEditedMessages: false });
    const streams = new ReplyStreamer();

    // Handles the draft "stop" button (Bot API 10.3).
    bot.use(streams.middleware());

    bot.command('start', ctx =>
        ctx.reply('Ask me anything. Press stop under the draft to interrupt.')
    );

    bot.on('message:text', ctx => {
        // Not awaited: with long polling this lets the stop-button update arrive meanwhile.
        streams
            .reply(ctx, generate(ctx.message.text), { throttleMs: 300 })
            .catch(error => console.error('Streaming failed:', error));
    });

    return bot;
}
