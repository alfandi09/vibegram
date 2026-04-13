import { Bot, Markup, PaginationItem } from '../src/index';

const bot = new Bot('YOUR_BOT_TOKEN');

// Sample product catalog (14 items)
const products: PaginationItem[] = Array.from({ length: 14 }).map((_, i) => ({
    text: `📦 Limited Edition Shoe #${i + 1}`,
    callback_data: `buy_item_${i + 1}`
}));

bot.command('catalog', async (ctx) => {
    const keyboard = Markup.pagination(products, {
        currentPage: 1,
        itemsPerPage: 5,
        actionNext: 'nav_page_2',
        actionPrev: 'nav_page_0',
        pageIndicatorPattern: 'Page {current} of {total}'
    });

    await ctx.reply('Browse our exclusive catalog:', {
        reply_markup: keyboard
    });
});

// Navigation button handler using regex pattern matching
bot.action(/nav_page_(\d+)/, async (ctx) => {
    const rawData = ctx.update.callback_query?.data || '';
    const requestedPage = parseInt(rawData.split('_')[2] || '1');

    const nextTarget = `nav_page_${requestedPage + 1}`;
    const prevTarget = `nav_page_${requestedPage - 1}`;

    const newKeyboard = Markup.pagination(products, {
        currentPage: requestedPage,
        itemsPerPage: 5,
        actionNext: nextTarget,
        actionPrev: prevTarget,
        pageIndicatorPattern: 'Page {current} of {total}',
        columns: 1
    });

    await ctx.answerCbQuery();

    await bot.callApi('editMessageText', {
        chat_id: ctx.chat?.id,
        message_id: ctx.update.callback_query?.message?.message_id,
        text: 'Browse our exclusive catalog:',
        reply_markup: newKeyboard
    });
});

// Product item selection handler
bot.action(/buy_item_\d+/, async (ctx) => {
    await ctx.answerCbQuery('✅ Added to cart!', true);
});

bot.launch().then(() => console.log('E-Commerce catalog bot running. Send /catalog'));
