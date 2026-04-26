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

    it('.telegram aliases the scoped Telegram client for direct API calls', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));

        expect(ctx.telegram).toBe(ctx.client);

        await ctx.telegram.callApi('sendChatAction', { chat_id: 99, action: 'typing' });

        expect(client.callApi).toHaveBeenCalledWith('sendChatAction', {
            chat_id: 99,
            action: 'typing',
        });
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

    it('.businessConnectionId resolves from business_connection and message payload', () => {
        const fromConnection = createContext({
            update_id: 13,
            business_connection: { id: 'bc-1' },
        } as any).ctx;
        const fromMessage = createContext({
            update_id: 14,
            business_message: {
                message_id: 1,
                date: 1,
                chat: { id: 99, type: 'private' },
                business_connection_id: 'bc-2',
            },
        } as any).ctx;

        expect(fromConnection.businessConnectionId).toBe('bc-1');
        expect(fromConnection.businessConnectionId).toBe('bc-1');
        expect(fromMessage.businessConnectionId).toBe('bc-2');
    });

    it('.updateType resolves the primary update key', () => {
        const { ctx: messageCtx } = createContext(makeMessageUpdate('hello'));
        const { ctx: callbackCtx } = createContext(makeCallbackQueryUpdate('btn'));

        expect(messageCtx.updateType).toBe('message');
        expect(messageCtx.updateType).toBe('message');
        expect(callbackCtx.updateType).toBe('callback_query');
    });

    it('.chat and .from resolve reaction and deleted business updates', () => {
        const reactionCtx = createContext({
            update_id: 15,
            message_reaction: {
                chat: { id: -500, type: 'supergroup', title: 'Room' },
                message_id: 7,
                date: 1,
                user: { id: 77, is_bot: false, first_name: 'React' },
                old_reaction: [],
                new_reaction: [{ type: 'emoji', emoji: '🔥' }],
            },
        } as any).ctx;
        const deletedCtx = createContext({
            update_id: 16,
            deleted_business_messages: {
                business_connection_id: 'bc-3',
                chat: { id: 123, type: 'private' },
                message_ids: [1, 2],
            },
        } as any).ctx;

        expect(reactionCtx.chat?.id).toBe(-500);
        expect(reactionCtx.from?.id).toBe(77);
        expect(deletedCtx.chat?.id).toBe(123);
        expect(deletedCtx.businessConnectionId).toBe('bc-3');
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

    it('propagates forum topic thread id by default and allows override', async () => {
        const { ctx, client } = createContext(
            makeMessageUpdate('topic', { message_thread_id: 123 })
        );

        await ctx.reply('same topic');
        await ctx.replyWithPhoto('photo-id');
        await ctx.sendChatAction('typing');
        await ctx.reply('override topic', { message_thread_id: 456 });

        expect(client.callApi).toHaveBeenNthCalledWith(
            1,
            'sendMessage',
            expect.objectContaining({ message_thread_id: 123 })
        );
        expect(client.callApi).toHaveBeenNthCalledWith(
            2,
            'sendPhoto',
            expect.objectContaining({ message_thread_id: 123 })
        );
        expect(client.callApi).toHaveBeenNthCalledWith(
            3,
            'sendChatAction',
            expect.objectContaining({ message_thread_id: 123 })
        );
        expect(client.callApi).toHaveBeenNthCalledWith(
            4,
            'sendMessage',
            expect.objectContaining({ message_thread_id: 456 })
        );
    });

    it('replyQuote quotes the current message', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));

        await ctx.replyQuote('quoted');

        expect(client.callApi).toHaveBeenCalledWith(
            'sendMessage',
            expect.objectContaining({
                text: 'quoted',
                reply_parameters: { message_id: 100 },
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

describe('Context API coverage helpers', () => {
    it('calls invite, forum, and multi-message helpers with expected payloads', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));

        await ctx.revokeChatInviteLink('https://t.me/+invite');
        await ctx.closeGeneralForumTopic();
        await ctx.deleteMessages([1, 2, 3]);
        await ctx.forwardMessages(12345, [4, 5]);

        expect(client.callApi).toHaveBeenNthCalledWith(1, 'revokeChatInviteLink', {
            chat_id: 99,
            invite_link: 'https://t.me/+invite',
        });
        expect(client.callApi).toHaveBeenNthCalledWith(2, 'closeGeneralForumTopic', {
            chat_id: 99,
        });
        expect(client.callApi).toHaveBeenNthCalledWith(3, 'deleteMessages', {
            chat_id: 99,
            message_ids: [1, 2, 3],
        });
        expect(client.callApi).toHaveBeenNthCalledWith(4, 'forwardMessages', {
            chat_id: 12345,
            from_chat_id: 99,
            message_ids: [4, 5],
        });
    });

    it('calls sticker and sender-chat helpers with expected payloads', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));

        await ctx.banChatSenderChat(-100);
        await ctx.setChatStickerSet('stickers_by_bot');
        await ctx.setStickerEmojiList('sticker-id', ['😀']);

        expect(client.callApi).toHaveBeenNthCalledWith(1, 'banChatSenderChat', {
            chat_id: 99,
            sender_chat_id: -100,
        });
        expect(client.callApi).toHaveBeenNthCalledWith(2, 'setChatStickerSet', {
            chat_id: 99,
            sticker_set_name: 'stickers_by_bot',
        });
        expect(client.callApi).toHaveBeenNthCalledWith(3, 'setStickerEmojiList', {
            sticker: 'sticker-id',
            emoji_list: ['😀'],
        });
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

    it('supports editing media and live locations', async () => {
        const { ctx, client } = createContext(makeCallbackQueryUpdate('btn'));

        await ctx.editMessageMedia({ type: 'photo', media: 'https://example.com/photo.jpg' });
        await ctx.editMessageLiveLocation(1.23, 4.56, { heading: 180 });
        await ctx.stopMessageLiveLocation();

        expect(client.callApi).toHaveBeenCalledWith(
            'editMessageMedia',
            expect.objectContaining({
                chat_id: 99,
                message_id: 100,
                media: { type: 'photo', media: 'https://example.com/photo.jpg' },
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'editMessageLiveLocation',
            expect.objectContaining({
                latitude: 1.23,
                longitude: 4.56,
                heading: 180,
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'stopMessageLiveLocation',
            expect.objectContaining({
                chat_id: 99,
                message_id: 100,
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

describe('Context modern send helpers', () => {
    it('replyWithGame sends a game and replyWithInvoice includes business connection metadata', async () => {
        const { ctx, client } = createContext(
            makeMessageUpdate('hello', {
                business_connection_id: 'bc-9',
            } as any)
        );

        await ctx.replyWithGame('game_short_name');
        await ctx.replyWithInvoice('Title', 'Desc', 'payload', 'XTR', [
            { label: 'Test', amount: 100 },
        ]);

        expect(client.callApi).toHaveBeenCalledWith(
            'sendGame',
            expect.objectContaining({
                business_connection_id: 'bc-9',
                game_short_name: 'game_short_name',
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'sendInvoice',
            expect.objectContaining({
                business_connection_id: 'bc-9',
                currency: 'XTR',
            })
        );
    });

    it('replyWithChecklist supports both modern checklist payloads and legacy title/tasks signature', async () => {
        const { ctx, client } = createContext(
            makeMessageUpdate('hello', {
                business_connection_id: 'bc-10',
            } as any)
        );

        await ctx.replyWithChecklist({
            title: 'Checklist',
            tasks: [{ text: 'Task 1' }],
        });
        await ctx.replyWithChecklist('Legacy', [{ text: 'Task 2' }]);

        expect(client.callApi).toHaveBeenNthCalledWith(
            1,
            'sendChecklist',
            expect.objectContaining({
                business_connection_id: 'bc-10',
                checklist: {
                    title: 'Checklist',
                    tasks: [{ text: 'Task 1' }],
                },
            })
        );
        expect(client.callApi).toHaveBeenNthCalledWith(
            2,
            'sendChecklist',
            expect.objectContaining({
                checklist: {
                    title: 'Legacy',
                    tasks: [{ text: 'Task 2' }],
                },
            })
        );
    });

    it('replyWithPoll sends modern quiz correct_option_ids unchanged', async () => {
        const { ctx, client } = createContext(makeMessageUpdate('hello'));

        await ctx.replyWithPoll(
            'Pick the correct answers',
            [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
            {
                type: 'quiz',
                allows_multiple_answers: true,
                correct_option_ids: [0, 2],
            }
        );

        expect(client.callApi).toHaveBeenCalledWith(
            'sendPoll',
            expect.objectContaining({
                chat_id: 99,
                question: 'Pick the correct answers',
                correct_option_ids: [0, 2],
            })
        );
    });

    it('supports gift, star balance, business account gifts, and suggested post helpers', async () => {
        const { ctx, client } = createContext(
            makeMessageUpdate('hello', {
                business_connection_id: 'bc-11',
            } as any)
        );

        await ctx.sendGift(42, 'gift_regular', { pay_for_upgrade: true, text: 'Congrats' });
        await ctx.sendGiftToChat('@channelname', 'gift_regular');
        await ctx.getMyStarBalance();
        await ctx.getStarBalance();
        await ctx.getStarTransactions({ offset: 10, limit: 5 });
        await ctx.getUserGifts(42, { limit: 10 });
        await ctx.getUserGifts({ user_id: 43, offset: 'next' });
        await ctx.convertGiftToStars('bc-11', 'owned-1');
        await ctx.saveGift('bc-11', 'owned-2', { is_saved: false });
        await ctx.getBusinessAccountGifts('bc-11', { exclude_unique: true, limit: 20 });
        await ctx.getBusinessAccountStarBalance('bc-11');
        await ctx.transferBusinessAccountStars('bc-11', 50);
        await ctx.approveSuggestedPost(100, { send_date: 1234567890 });
        await ctx.declineSuggestedPost(100, { comment: 'Not aligned yet' });

        expect(client.callApi).toHaveBeenCalledWith(
            'sendGift',
            expect.objectContaining({
                user_id: 42,
                gift_id: 'gift_regular',
                pay_for_upgrade: true,
                text: 'Congrats',
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'sendGift',
            expect.objectContaining({
                chat_id: '@channelname',
                gift_id: 'gift_regular',
            })
        );
        expect(client.callApi).toHaveBeenCalledWith('getMyStarBalance');
        expect(client.callApi).toHaveBeenCalledWith('getStarTransactions', {
            offset: 10,
            limit: 5,
        });
        expect(client.callApi).toHaveBeenCalledWith('getUserGifts', {
            user_id: 42,
            limit: 10,
        });
        expect(client.callApi).toHaveBeenCalledWith('getUserGifts', {
            user_id: 43,
            offset: 'next',
        });
        expect(client.callApi).toHaveBeenCalledWith('convertGiftToStars', {
            business_connection_id: 'bc-11',
            owned_gift_id: 'owned-1',
        });
        expect(client.callApi).toHaveBeenCalledWith('saveGift', {
            business_connection_id: 'bc-11',
            owned_gift_id: 'owned-2',
            is_saved: false,
        });
        expect(client.callApi).toHaveBeenCalledWith(
            'getBusinessAccountGifts',
            expect.objectContaining({
                business_connection_id: 'bc-11',
                exclude_unique: true,
                limit: 20,
            })
        );
        expect(client.callApi).toHaveBeenCalledWith('getBusinessAccountStarBalance', {
            business_connection_id: 'bc-11',
        });
        expect(client.callApi).toHaveBeenCalledWith('transferBusinessAccountStars', {
            business_connection_id: 'bc-11',
            star_count: 50,
        });
        expect(client.callApi).toHaveBeenCalledWith(
            'approveSuggestedPost',
            expect.objectContaining({
                chat_id: 99,
                message_id: 100,
                send_date: 1234567890,
            })
        );
        expect(client.callApi).toHaveBeenCalledWith(
            'declineSuggestedPost',
            expect.objectContaining({
                chat_id: 99,
                message_id: 100,
                comment: 'Not aligned yet',
            })
        );
    });
});
