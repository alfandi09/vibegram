import { describe, it, expect } from 'vitest';
import { Markup } from '../src/markup';

// ---------------------------------------------------------------------------
// Markup.grid()
// ---------------------------------------------------------------------------
describe('Markup.grid()', () => {
    it('splits flat array into rows of specified column count', () => {
        const buttons = [
            Markup.button.callback('A', 'a'),
            Markup.button.callback('B', 'b'),
            Markup.button.callback('C', 'c'),
            Markup.button.callback('D', 'd'),
        ];
        const kb = Markup.grid(buttons, 2);
        expect(kb.inline_keyboard).toHaveLength(2);
        expect(kb.inline_keyboard[0]).toHaveLength(2);
        expect(kb.inline_keyboard[1]).toHaveLength(2);
    });

    it('handles odd number of buttons (last row may be shorter)', () => {
        const buttons = [
            Markup.button.callback('A', 'a'),
            Markup.button.callback('B', 'b'),
            Markup.button.callback('C', 'c'),
        ];
        const kb = Markup.grid(buttons, 2);
        expect(kb.inline_keyboard).toHaveLength(2);
        expect(kb.inline_keyboard[1]).toHaveLength(1); // last row is shorter
    });

    it('defaults to 2 columns when not specified', () => {
        const buttons = Array.from({ length: 4 }, (_, i) =>
            Markup.button.callback(`${i}`, `${i}`)
        );
        const kb = Markup.grid(buttons);
        expect(kb.inline_keyboard[0]).toHaveLength(2);
    });

    it('single column — each button on its own row', () => {
        const buttons = [
            Markup.button.callback('X', 'x'),
            Markup.button.callback('Y', 'y'),
        ];
        const kb = Markup.grid(buttons, 1);
        expect(kb.inline_keyboard).toHaveLength(2);
        expect(kb.inline_keyboard[0]).toHaveLength(1);
    });

    it('handles empty array gracefully', () => {
        const kb = Markup.grid([], 3);
        expect(kb.inline_keyboard).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Markup.button.login()
// ---------------------------------------------------------------------------
describe('Markup.button.login()', () => {
    it('builds a login_url button', () => {
        const btn = Markup.button.login('Login with Telegram', {
            url: 'https://auth.example.com',
            request_write_access: true,
        });
        expect(btn.login_url.url).toBe('https://auth.example.com');
        expect(btn.login_url.request_write_access).toBe(true);
        expect(btn.text).toBe('Login with Telegram');
    });
});

// ---------------------------------------------------------------------------
// Markup.button.copy()
// ---------------------------------------------------------------------------
describe('Markup.button.copy()', () => {
    it('builds a copy_text button with correct structure', () => {
        const btn = Markup.button.copy('Copy Code', 'PROMO123');
        expect(btn.text).toBe('Copy Code');
        expect(btn.copy_text.text).toBe('PROMO123');
    });
});
