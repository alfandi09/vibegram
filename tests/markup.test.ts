import { describe, it, expect } from 'vitest';
import { Markup } from '../src/markup';

// ---------------------------------------------------------------------------
// Markup.inlineKeyboard()
// ---------------------------------------------------------------------------
describe('Markup.inlineKeyboard()', () => {
    it('wraps button rows in inline_keyboard', () => {
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback('Yes', 'yes'), Markup.button.callback('No', 'no')]
        ]);
        expect(kb).toEqual({
            inline_keyboard: [[
                { text: 'Yes', callback_data: 'yes' },
                { text: 'No', callback_data: 'no' },
            ]]
        });
    });
});

// ---------------------------------------------------------------------------
// Markup.button factories
// ---------------------------------------------------------------------------
describe('Markup.button', () => {
    it('.callback() builds callback button', () => {
        expect(Markup.button.callback('Click', 'click_data')).toEqual({
            text: 'Click', callback_data: 'click_data'
        });
    });

    it('.url() builds URL button', () => {
        expect(Markup.button.url('Website', 'https://example.com')).toEqual({
            text: 'Website', url: 'https://example.com'
        });
    });

    it('.webApp() builds WebApp button', () => {
        expect(Markup.button.webApp('Open App', 'https://app.example.com')).toEqual({
            text: 'Open App', web_app: { url: 'https://app.example.com' }
        });
    });

    it('.pay() builds payment button', () => {
        expect(Markup.button.pay('Pay $9.99')).toEqual({ text: 'Pay $9.99', pay: true });
    });

    it('.switchInlineQuery() with default empty query', () => {
        const btn = Markup.button.switchInlineQuery('Search', '');
        expect(btn.switch_inline_query).toBe('');
    });

    it('.switchInlineQueryCurrentChat() builds correct button', () => {
        const btn = Markup.button.switchInlineQueryCurrentChat('Search here', 'query');
        expect(btn.switch_inline_query_current_chat).toBe('query');
    });
});

// ---------------------------------------------------------------------------
// Markup.pagination()
// ---------------------------------------------------------------------------
describe('Markup.pagination()', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
        text: `Item ${i + 1}`,
        callback_data: `item_${i + 1}`,
    }));

    it('renders correct number of items for page 1', () => {
        const kb = Markup.pagination(items, {
            currentPage: 1, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
        });
        // 5 item rows + 1 nav row
        expect(kb.inline_keyboard.length).toBe(6);
        expect(kb.inline_keyboard[0][0].text).toBe('Item 1');
        expect(kb.inline_keyboard[4][0].text).toBe('Item 5');
    });

    it('navigation row has Next button on first page but not Prev', () => {
        const kb = Markup.pagination(items, {
            currentPage: 1, itemsPerPage: 5,
            actionNext: 'next_page', actionPrev: 'prev_page',
        });
        const navRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
        const navTexts = navRow.map((b: any) => b.text);
        expect(navTexts).not.toContain('⬅️ Prev');
        expect(navTexts).toContain('Next ➡️');
    });

    it('navigation row has both Prev and Next on middle page', () => {
        const kb = Markup.pagination(items, {
            currentPage: 2, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
        });
        const navRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
        const navTexts = navRow.map((b: any) => b.text);
        expect(navTexts).toContain('⬅️ Prev');
        expect(navTexts).toContain('Next ➡️');
    });

    it('navigation row has Prev but not Next on last page', () => {
        const kb = Markup.pagination(items, {
            currentPage: 5, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
        });
        const navRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
        const navTexts = navRow.map((b: any) => b.text);
        expect(navTexts).toContain('⬅️ Prev');
        expect(navTexts).not.toContain('Next ➡️');
    });

    it('page indicator shows correct page/total', () => {
        const kb = Markup.pagination(items, {
            currentPage: 2, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
        });
        const navRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
        const indicator = navRow.find((b: any) => b.callback_data === 'ignore_nav');
        expect(indicator?.text).toBe('2/5');
    });

    it('custom pageIndicatorPattern is applied', () => {
        const kb = Markup.pagination(items, {
            currentPage: 3, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
            pageIndicatorPattern: 'Page {current} of {total}',
        });
        const navRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
        const indicator = navRow.find((b: any) => b.callback_data === 'ignore_nav');
        expect(indicator?.text).toBe('Page 3 of 5');
    });

    it('arranges items in grid columns', () => {
        const gridItems = Array.from({ length: 6 }, (_, i) => ({
            text: `I${i + 1}`, callback_data: `i${i + 1}`,
        }));
        const kb = Markup.pagination(gridItems, {
            currentPage: 1, itemsPerPage: 6,
            actionNext: 'next', actionPrev: 'prev',
            columns: 3,
        });
        // 6 items / 3 cols = 2 rows + 1 nav row
        expect(kb.inline_keyboard.length).toBe(3);
        expect(kb.inline_keyboard[0].length).toBe(3);
    });

    it('handles empty item list gracefully', () => {
        const kb = Markup.pagination([], {
            currentPage: 1, itemsPerPage: 5,
            actionNext: 'next', actionPrev: 'prev',
        });
        // only nav row
        expect(kb.inline_keyboard.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Markup.keyboard() / reply keyboards
// ---------------------------------------------------------------------------
describe('Markup.keyboard()', () => {
    it('builds ReplyKeyboardMarkup with resize_keyboard default true', () => {
        const kb = Markup.keyboard([[{ text: 'Option A' }, { text: 'Option B' }]]);
        expect(kb.resize_keyboard).toBe(true);
        expect(kb.keyboard[0]).toHaveLength(2);
    });

    it('respects custom options', () => {
        const kb = Markup.keyboard([[{ text: 'Send' }]], { one_time_keyboard: true, is_persistent: true });
        expect(kb.one_time_keyboard).toBe(true);
        expect(kb.is_persistent).toBe(true);
    });
});

describe('Markup.removeKeyboard()', () => {
    it('returns remove_keyboard: true', () => {
        expect(Markup.removeKeyboard()).toEqual({ remove_keyboard: true, selective: false });
    });

    it('respects selective option', () => {
        expect(Markup.removeKeyboard(true)).toEqual({ remove_keyboard: true, selective: true });
    });
});

describe('Markup.forceReply()', () => {
    it('returns force_reply: true', () => {
        const fr = Markup.forceReply();
        expect(fr.force_reply).toBe(true);
    });
});

describe('Markup.replyButton', () => {
    it('.text() builds standard text button', () => {
        expect(Markup.replyButton.text('Hello')).toEqual({ text: 'Hello' });
    });

    it('.requestContact() builds contact request button', () => {
        const btn = Markup.replyButton.requestContact('Share Contact');
        expect(btn.request_contact).toBe(true);
    });

    it('.requestLocation() builds location request button', () => {
        const btn = Markup.replyButton.requestLocation('Share Location');
        expect(btn.request_location).toBe(true);
    });
});
