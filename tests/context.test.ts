import { describe, it, expect, vi } from 'vitest';
import { Context } from '../src/context';
import {
    makeMessageUpdate,
    makeCommandUpdate,
    makeCallbackQueryUpdate,
    makePhotoUpdate,
    createContext,
} from './helpers/mock';

// ---------------------------------------------------------------------------
// Context getters
// ---------------------------------------------------------------------------
describe('Context getters', () => {
    it('.message returns update.message', () => {
        const { ctx } = createContext(makeMessageUpdate('hello'));
        expect(ctx.message?.text).toBe('hello');
    });

    it('.chat returns the chat from message', () => {
        const { ctx } = createContext(makeMessageUpdate('hello'));
        expect(ctx.chat?.id).toBe(99);
        expect(ctx.chat?.type).toBe('private');
    });

    it('.from returns the sender from message', () => {
        const { ctx } = createContext(makeMessageUpdate('hello'));
        expect(ctx.from?.id).toBe(42);
        expect(ctx.from?.username).toBe('testuser');
    });

    it('.chat returns chat from callback_query when no message', () => {
        const { ctx } = createContext(makeCallbackQueryUpdate('btn'));
        expect(ctx.chat?.id).toBe(99);
    });

    it('.from returns from from callback_query', () => {
        const { ctx } = createContext(makeCallbackQueryUpdate('btn'));
        expect(ctx.from?.id).toBe(42);
    });

    it('.message returns undefined for callback_query-only updates without message', () => {
        const update = {
            update_id: 10,
            callback_query: {
                id: 'cbq-x',
                from: { id: 1, is_bot: false, first_name: 'X' },
                data: 'test',
                chat_instance: 'ci',
            },
        } as any;
        const { ctx } = createContext(update);
        expect(ctx.message).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// reply() API calls
// ---------------------------------------------------------------------------
describe('Context.reply()', () => {
    it('calls sendMessage with correct chat_id and text', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.reply('World');

        expect(client.callApi).toHaveBeenCalledWith('sendMessage', expect.objectContaining({
            chat_id: 99,
            text: 'World',
        }));
    });

    it('throws when chat is not available', async () => {
        const update = { update_id: 1, inline_query: { id: 'iq1', from: { id: 1, is_bot: false, first_name: 'X' }, query: 'test', offset: '' } } as any;
        const { ctx } = createContext(update);
        await expect(ctx.reply('test')).rejects.toThrow('Cannot reply');
    });

    it('passes extra parameters to the API call', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.reply('Hi', { parse_mode: 'HTML', disable_notification: true });

        expect(client.callApi).toHaveBeenCalledWith('sendMessage', expect.objectContaining({
            parse_mode: 'HTML',
            disable_notification: true,
        }));
    });

    it('replyWithHTML sets parse_mode to HTML', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithHTML('<b>Bold</b>');

        expect(client.callApi).toHaveBeenCalledWith('sendMessage', expect.objectContaining({
            parse_mode: 'HTML',
            text: '<b>Bold</b>',
        }));
    });

    it('replyWithMarkdown sets parse_mode to Markdown', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithMarkdown('*bold*');

        expect(client.callApi).toHaveBeenCalledWith('sendMessage', expect.objectContaining({
            parse_mode: 'Markdown',
        }));
    });
});

// ---------------------------------------------------------------------------
// answerCbQuery()
// ---------------------------------------------------------------------------
describe('Context.answerCbQuery()', () => {
    it('calls answerCallbackQuery with callback_query id', async () => {
        const { ctx, client } = createContext(makeCallbackQueryUpdate('btn'));
        await ctx.answerCbQuery('Done!');

        expect(client.callApi).toHaveBeenCalledWith('answerCallbackQuery', expect.objectContaining({
            callback_query_id: 'cbq-1',
            text: 'Done!',
        }));
    });

    it('throws when no callback_query in update', async () => {
        const { ctx } = createContext(makeMessageUpdate('hello'));
        await expect(ctx.answerCbQuery()).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// deleteMessage()
// ---------------------------------------------------------------------------
describe('Context.deleteMessage()', () => {
    it('calls deleteMessage with chat_id and message_id', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.deleteMessage();

        expect(client.callApi).toHaveBeenCalledWith('deleteMessage', expect.objectContaining({
            chat_id: 99,
            message_id: 100,
        }));
    });

    it('throws when no message in context', async () => {
        const update = { update_id: 5, inline_query: { id: 'iq', from: { id: 1, is_bot: false, first_name: 'X' }, query: '', offset: '' } } as any;
        const { ctx } = createContext(update);
        await expect(ctx.deleteMessage()).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// replyWithPhoto()
// ---------------------------------------------------------------------------
describe('Context.replyWithPhoto()', () => {
    it('calls sendPhoto with file id', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithPhoto('file-id-123');

        expect(client.callApi).toHaveBeenCalledWith('sendPhoto', expect.objectContaining({
            chat_id: 99,
            photo: 'file-id-123',
        }));
    });
});

// ---------------------------------------------------------------------------
// banChatMember()
// ---------------------------------------------------------------------------
describe('Context.banChatMember()', () => {
    it('calls banChatMember API with correct user_id', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.banChatMember(99999);

        expect(client.callApi).toHaveBeenCalledWith('banChatMember', expect.objectContaining({
            chat_id: 99,
            user_id: 99999,
        }));
    });

    it('passes extra options (until_date, revoke_messages)', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.banChatMember(99999, { until_date: 9999999, revoke_messages: true });

        expect(client.callApi).toHaveBeenCalledWith('banChatMember', expect.objectContaining({
            until_date: 9999999,
            revoke_messages: true,
        }));
    });
});

// ---------------------------------------------------------------------------
// getChatMember()
// ---------------------------------------------------------------------------
describe('Context.getChatMember()', () => {
    it('calls getChatMember with correct params', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.getChatMember(42);

        expect(client.callApi).toHaveBeenCalledWith('getChatMember', {
            chat_id: 99,
            user_id: 42,
        });
    });
});
