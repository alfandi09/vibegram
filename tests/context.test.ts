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

    it('.chat and .from support chat_join_request updates', () => {
        const update = {
            update_id: 11,
            chat_join_request: {
                chat: { id: -200, type: 'supergroup', title: 'Applicants' },
                from: { id: 77, is_bot: false, first_name: 'Joiner' },
                user_chat_id: 1000,
                date: 123,
            },
        } as any;
        const { ctx } = createContext(update);

        expect(ctx.chat?.id).toBe(-200);
        expect(ctx.from?.id).toBe(77);
    });

    it('.message includes edited_business_message', () => {
        const update = {
            update_id: 12,
            edited_business_message: {
                message_id: 333,
                date: 123,
                text: 'Business edit',
                chat: { id: 88, type: 'private' },
                from: { id: 55, is_bot: false, first_name: 'Biz' },
            },
        } as any;
        const { ctx } = createContext(update);

        expect(ctx.message?.message_id).toBe(333);
        expect(ctx.chat?.id).toBe(88);
        expect(ctx.from?.id).toBe(55);
    });
});

// ---------------------------------------------------------------------------
// reply() API calls
// ---------------------------------------------------------------------------
describe('Context.reply()', () => {
    it('calls sendMessage with correct chat_id and text', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.reply('World');

        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                chat_id: 99,
                text: 'World',
            })
        );
    });

    it('throws when chat is not available', async () => {
        const update = {
            update_id: 1,
            inline_query: {
                id: 'iq1',
                from: { id: 1, is_bot: false, first_name: 'X' },
                query: 'test',
                offset: '',
            },
        } as any;
        const { ctx } = createContext(update);
        await expect(ctx.reply('test')).rejects.toThrow('Cannot reply');
    });

    it('passes extra parameters to the API call', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.reply('Hi', { parse_mode: 'HTML', disable_notification: true });

        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                parse_mode: 'HTML',
                disable_notification: true,
            })
        );
    });

    it('replyWithHTML sets parse_mode to HTML', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithHTML('<b>Bold</b>');

        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                parse_mode: 'HTML',
                text: '<b>Bold</b>',
            })
        );
    });

    it('replyWithMarkdown sets parse_mode to Markdown', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithMarkdown('*bold*');

        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                parse_mode: 'Markdown',
            })
        );
    });
});

// ---------------------------------------------------------------------------
// answerCbQuery()
// ---------------------------------------------------------------------------
describe('Context.answerCbQuery()', () => {
    it('calls answerCallbackQuery with callback_query id', async () => {
        const { ctx, client } = createContext(makeCallbackQueryUpdate('btn'));
        await ctx.answerCbQuery('Done!');

        expect(client.callApi).toHaveBeenCalledWith(
            'answerCallbackQuery',
            expect.objectContaining({
                callback_query_id: 'cbq-1',
                text: 'Done!',
            })
        );
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

        expect(client.callApi).toHaveBeenCalledWith(
            'deleteMessage',
            expect.objectContaining({
                chat_id: 99,
                message_id: 100,
            })
        );
    });

    it('throws when no message in context', async () => {
        const update = {
            update_id: 5,
            inline_query: {
                id: 'iq',
                from: { id: 1, is_bot: false, first_name: 'X' },
                query: '',
                offset: '',
            },
        } as any;
        const { ctx } = createContext(update);
        await expect(ctx.deleteMessage()).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// editMessageText()
// ---------------------------------------------------------------------------
describe('Context.editMessageText()', () => {
    it('uses inline_message_id when editing inline callback messages', async () => {
        const update = {
            update_id: 20,
            callback_query: {
                id: 'inline-cb',
                from: { id: 42, is_bot: false, first_name: 'Inline' },
                inline_message_id: 'inline-msg-1',
                chat_instance: 'ci-inline',
                data: 'edit',
            },
        } as any;

        const { ctx, client } = createContext(update);
        await ctx.editMessageText('Updated');

        expect(client.callApi).toHaveBeenCalledWith(
            'editMessageText',
            expect.objectContaining({
                inline_message_id: 'inline-msg-1',
                text: 'Updated',
            })
        );
    });
});

// ---------------------------------------------------------------------------
// replyWithPhoto()
// ---------------------------------------------------------------------------
describe('Context.replyWithPhoto()', () => {
    it('calls sendPhoto with file id', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.replyWithPhoto('file-id-123');

        expect(client.callApi).toHaveBeenCalledWith(
            'sendPhoto',
            expect.objectContaining({
                chat_id: 99,
                photo: 'file-id-123',
            })
        );
    });
});

// ---------------------------------------------------------------------------
// banChatMember()
// ---------------------------------------------------------------------------
describe('Context.banChatMember()', () => {
    it('calls banChatMember API with correct user_id', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.banChatMember(99999);

        expect(client.callApi).toHaveBeenCalledWith(
            'banChatMember',
            expect.objectContaining({
                chat_id: 99,
                user_id: 99999,
            })
        );
    });

    it('passes extra options (until_date, revoke_messages)', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));
        await ctx.banChatMember(99999, { until_date: 9999999, revoke_messages: true });

        expect(client.callApi).toHaveBeenCalledWith(
            'banChatMember',
            expect.objectContaining({
                until_date: 9999999,
                revoke_messages: true,
            })
        );
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
