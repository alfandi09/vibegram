import { Bot, InlineResults } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

bot.on('inline_query', async (ctx) => {
    const query = ctx.update.inline_query?.query || '';

    const results = InlineResults.builder()
        .article({
            id: '1',
            title: 'Hello World',
            text: `You searched for: ${query || 'nothing'}`,
            description: 'Send a greeting message'
        })
        .article({
            id: '2',
            title: 'Bold Text',
            text: `<b>${query || 'Hello'}</b>`,
            parse_mode: 'HTML',
            description: 'Send bold text'
        })
        .photo({
            id: '3',
            url: 'https://picsum.photos/400/300',
            title: 'Random Photo',
            caption: 'A random photo from Picsum'
        })
        .build();

    await ctx.answerInlineQuery(results, { cache_time: 10 });
});

bot.launch().then(() => console.log('Inline query bot running.'));
