import { describe, it, expect, vi } from 'vitest';
import { Menu } from '../src/menu';
import { createContext } from './helpers/mock';

describe('Menu', () => {
    it('handles nested submenu actions recursively', async () => {
        const handler = vi.fn();
        const menu = new Menu('main');
        const settings = menu.submenu('settings', 'Settings');
        const advanced = settings.submenu('advanced', 'Advanced');
        advanced.text('Deep action', handler);

        const { ctx } = createContext({
            update_id: 1,
            callback_query: {
                id: 'cb-1',
                from: { id: 42, is_bot: false, first_name: 'User' },
                data: 'menu:advanced:1_0',
                chat_instance: 'ci',
                message: {
                    message_id: 100,
                    date: 0,
                    chat: { id: 99, type: 'private' },
                    from: { id: 1, is_bot: true, first_name: 'Bot' },
                    text: 'menu',
                },
            },
        } as any);

        await menu.middleware()(ctx as any, async () => {
            throw new Error('next() should not be called for nested menu actions');
        });

        expect(handler).toHaveBeenCalledWith(ctx);
    });

    it('uses inline_message_id when switching submenu in inline mode', async () => {
        const menu = new Menu('main');
        menu.submenu('settings', 'Settings');

        const { ctx, client } = createContext({
            update_id: 2,
            callback_query: {
                id: 'cb-2',
                from: { id: 42, is_bot: false, first_name: 'User' },
                data: 'menu:main:sub_settings',
                inline_message_id: 'inline-msg-123',
                chat_instance: 'ci-inline',
            },
        } as any);

        await menu.middleware()(ctx as any, async () => {
            throw new Error('next() should not be called when submenu handler matches');
        });

        expect(client.callApi).toHaveBeenCalledWith(
            'answerCallbackQuery',
            expect.objectContaining({
                callback_query_id: 'cb-2',
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'editMessageReplyMarkup',
            expect.objectContaining({
                inline_message_id: 'inline-msg-123',
            })
        );
    });
});
