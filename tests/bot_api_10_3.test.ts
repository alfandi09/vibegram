import { describe, expect, it, vi } from 'vitest';
import { Bot } from '../src/bot';
import { Context } from '../src/context';
import { Markup } from '../src/markup';
import type {
    BotCommand,
    BotSubscriptionUpdated,
    ChatAdministratorRights,
    ChatFullInfo,
    EphemeralMessageParameters,
    InlineKeyboardMarkup,
    InputRichBlock,
    InputRichMessage,
    Message,
    MessageGenerationStopped,
    ReplyKeyboardMarkup,
    ReplyParameters,
    RichBlock,
    RichText,
    UniqueGiftInfo,
    Update,
} from '../src/types';
import { createMockClient } from './helpers/mock';

const user = { id: 42, is_bot: false, first_name: 'Alice' };
const group = { id: -100123, type: 'supergroup' as const, title: 'Group' };

function callArgs(client: ReturnType<typeof createMockClient>) {
    return (client.callApi as ReturnType<typeof vi.fn>).mock.calls[0];
}

describe('Bot API 10.2 / 10.3 types', () => {
    it('models outgoing rich blocks, media, and buttons', () => {
        const blocks: InputRichBlock[] = [
            { type: 'heading', text: 'Report', size: 1 },
            { type: 'expandable_blockquote', text: 'Long quote', credit: 'Author' },
            { type: 'table', cells: [[{ text: 'A', is_header: true }]], is_compact: true },
            {
                type: 'buttons',
                align: 'center',
                buttons: [
                    { text: 'Open', url: 'https://example.com', style: 'primary' },
                    { text: 'Soon', disabled: {} },
                ],
            },
            {
                type: 'document',
                document: { type: 'document', media: 'file-id' },
                caption: { text: 'Spec' },
            },
            {
                type: 'voice_note',
                voice_note: { type: 'voice_note', media: 'voice-id', duration: 3 },
            },
            { type: 'list', items: [{ blocks: [{ type: 'paragraph', text: 'Item' }] }] },
            { type: 'map', location: { latitude: 1, longitude: 2 } },
            { type: 'thinking', text: 'Thinking...' },
        ];
        const richMessage: InputRichMessage = {
            markdown: '![cover](tg://photo?id=cover)',
            media: [{ id: 'cover', media: { type: 'photo', media: 'photo-id' } }],
        };
        const withBlocks: InputRichMessage = { blocks };

        expect(withBlocks.blocks).toHaveLength(9);
        expect(richMessage.media?.[0].id).toBe('cover');
    });

    it('models incoming rich blocks and rich text buttons', () => {
        const text: RichText = [
            'Tap ',
            { type: 'button', button: { text: 'here', callback_data: 'go' } },
        ];
        const blocks: RichBlock[] = [
            { type: 'paragraph', text },
            { type: 'expandable_blockquote', text: 'Quote' },
            { type: 'buttons', buttons: [{ text: 'Copy', copy_text: { text: 'x' } }] },
            {
                type: 'document',
                document: { file_id: 'f', file_unique_id: 'u' },
            },
        ];

        expect(blocks.map(block => block.type)).toEqual([
            'paragraph',
            'expandable_blockquote',
            'buttons',
            'document',
        ]);
    });

    it('models ephemeral, community, subscription, and keyboard fields', () => {
        const message: Message = {
            message_id: 0,
            date: 1,
            chat: group,
            receiver_user: user,
            ephemeral_message_id: 7,
            community_chat_added: { community: { id: 1, name: 'Devs' } },
            community_chat_joined: { community: { id: 1, name: 'Devs' } },
            community_chat_removed: {},
        };
        const replyToEphemeral: ReplyParameters = { ephemeral_message_id: 7 };
        const replyToMessage: ReplyParameters = { message_id: 1 };
        const params: EphemeralMessageParameters = {
            receiver_user_id: 42,
            callback_query_id: 'cb',
            replace_callback_query_message: true,
        };
        const command: BotCommand = { command: 'secret', description: 'x', is_ephemeral: true };
        const inline: InlineKeyboardMarkup = { inline_keyboard: [], force_reply: true };
        const reply: ReplyKeyboardMarkup = { keyboard: [], force_reply: true };
        const rights: Partial<ChatAdministratorRights> = { can_send_welcome_messages: true };
        const chat: Partial<ChatFullInfo> = { community: { id: 1, name: 'Devs' } };
        const gift: Partial<UniqueGiftInfo> = { text: 'Hi', entities: [], is_private: true };
        const subscription: BotSubscriptionUpdated = {
            user,
            invoice_payload: 'pro',
            state: 'canceled',
        };
        const stopped: MessageGenerationStopped = { chat: group, draft_id: 5 };

        expect(message.ephemeral_message_id).toBe(7);
        expect(replyToEphemeral.ephemeral_message_id).toBe(7);
        expect(replyToMessage.message_id).toBe(1);
        expect(params.receiver_user_id).toBe(42);
        expect(command.is_ephemeral).toBe(true);
        expect(inline.force_reply && reply.force_reply).toBe(true);
        expect(rights.can_send_welcome_messages).toBe(true);
        expect(chat.community?.name).toBe('Devs');
        expect(gift.is_private).toBe(true);
        expect(subscription.state).toBe('canceled');
        expect(stopped.draft_id).toBe(5);
    });

    it('builds disabled inline buttons', () => {
        expect(Markup.button.disabled('Sold out')).toEqual({ text: 'Sold out', disabled: {} });
    });
});

describe('Context: new update sources', () => {
    it('resolves chat for stopped_message_generation updates', () => {
        const update: Update = {
            update_id: 1,
            stopped_message_generation: { chat: group, draft_id: 9 },
        };
        const ctx = new Context(update, createMockClient());
        expect(ctx.chat?.id).toBe(group.id);
        expect(ctx.updateType).toBe('stopped_message_generation');
    });

    it('resolves from for subscription updates', () => {
        const update: Update = {
            update_id: 1,
            subscription: { user, invoice_payload: 'pro', state: 'failed' },
        };
        const ctx = new Context(update, createMockClient());
        expect(ctx.from?.id).toBe(42);
    });
});

describe('Context: ephemeral shortcuts', () => {
    it('replyEphemeral links the triggering callback query', async () => {
        const client = createMockClient();
        const ctx = new Context(
            {
                update_id: 1,
                callback_query: {
                    id: 'cb-1',
                    from: user,
                    chat_instance: 'ci',
                    data: 'peek',
                    message: { message_id: 10, date: 1, chat: group },
                },
            },
            client
        );

        await ctx.replyEphemeral('Only you can see this');

        const [method, payload] = callArgs(client);
        expect(method).toBe('sendMessage');
        expect(payload).toMatchObject({
            chat_id: group.id,
            text: 'Only you can see this',
            ephemeral_message_parameters: { receiver_user_id: 42, callback_query_id: 'cb-1' },
        });
        expect(payload.reply_parameters).toBeUndefined();
    });

    it('replyEphemeral replies to an incoming ephemeral command', async () => {
        const client = createMockClient();
        const ctx = new Context(
            {
                update_id: 1,
                message: {
                    message_id: 0,
                    ephemeral_message_id: 77,
                    date: 1,
                    chat: group,
                    from: user,
                    text: '/secret',
                },
            },
            client
        );

        await ctx.replyEphemeral('Psst');

        const [, payload] = callArgs(client);
        expect(payload.ephemeral_message_parameters).toEqual({ receiver_user_id: 42 });
        expect(payload.reply_parameters).toEqual({ ephemeral_message_id: 77 });
    });

    it('edits the ephemeral message whose button was pressed', async () => {
        const client = createMockClient(true);
        const ctx = new Context(
            {
                update_id: 1,
                callback_query: {
                    id: 'cb-2',
                    from: user,
                    chat_instance: 'ci',
                    data: 'next',
                    message: {
                        message_id: 0,
                        ephemeral_message_id: 5,
                        receiver_user: user,
                        date: 1,
                        chat: group,
                    },
                },
            },
            client
        );

        await ctx.editEphemeralMessageText({ markdown: '**Updated**' });

        const [method, payload] = callArgs(client);
        expect(method).toBe('editEphemeralMessageText');
        expect(payload).toEqual({
            chat_id: group.id,
            receiver_user_id: 42,
            ephemeral_message_id: 5,
            rich_message: { markdown: '**Updated**' },
        });
    });

    it('throws when no ephemeral message is in scope', async () => {
        const ctx = new Context(
            { update_id: 1, message: { message_id: 1, date: 1, chat: group, from: user } },
            createMockClient()
        );
        await expect(ctx.deleteEphemeralMessage()).rejects.toThrow(/ephemeral message/);
    });

    it('replyWithDraft sends a non-zero draft_id', async () => {
        const client = createMockClient(true);
        const ctx = new Context(
            {
                update_id: 1,
                message: {
                    message_id: 1,
                    date: 1,
                    chat: { id: 42, type: 'private' },
                    from: user,
                },
            },
            client
        );

        await ctx.replyWithDraft('Thinking', { can_stop: true, keep_on_stop: true });
        await ctx.replyWithDraft('Thinking more', { draft_id: 99 });

        const calls = (client.callApi as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls[0][0]).toBe('sendMessageDraft');
        expect(Number.isInteger(calls[0][1].draft_id)).toBe(true);
        expect(calls[0][1].draft_id).not.toBe(0);
        expect(calls[0][1]).toMatchObject({ chat_id: 42, can_stop: true, keep_on_stop: true });
        expect(calls[0][1]).not.toHaveProperty('random_id');
        expect(calls[1][1].draft_id).toBe(99);
    });
});

describe('Bot: ephemeral and draft methods', () => {
    it('forwards ephemeral edit/delete calls with the right payloads', async () => {
        const bot = new Bot('test-token');
        const callApi = vi.fn().mockResolvedValue(true);
        bot.client.callApi = callApi as any;

        await bot.editEphemeralMessageText(-1, 42, 5, 'hi', { parse_mode: 'HTML' });
        await bot.editEphemeralMessageMedia(-1, 42, 5, { type: 'photo', media: 'id' });
        await bot.editEphemeralMessageCaption(-1, 42, 5, 'cap', {
            show_caption_above_media: true,
        });
        await bot.editEphemeralMessageReplyMarkup(-1, 42, 5, { inline_keyboard: [] });
        await bot.deleteEphemeralMessage(-1, 42, 5);
        await bot.sendMessageDraft(42, 3, 'partial', { can_stop: true });
        await bot.sendRichMessageDraft(42, 3, { markdown: '*x*' }, { keep_on_stop: true });

        const target = { chat_id: -1, receiver_user_id: 42, ephemeral_message_id: 5 };
        expect(callApi.mock.calls.map(call => call[0])).toEqual([
            'editEphemeralMessageText',
            'editEphemeralMessageMedia',
            'editEphemeralMessageCaption',
            'editEphemeralMessageReplyMarkup',
            'deleteEphemeralMessage',
            'sendMessageDraft',
            'sendRichMessageDraft',
        ]);
        expect(callApi.mock.calls[0][1]).toEqual({ ...target, text: 'hi', parse_mode: 'HTML' });
        expect(callApi.mock.calls[1][1]).toEqual({
            ...target,
            media: { type: 'photo', media: 'id' },
        });
        expect(callApi.mock.calls[2][1]).toEqual({
            ...target,
            caption: 'cap',
            show_caption_above_media: true,
        });
        expect(callApi.mock.calls[3][1]).toEqual({
            ...target,
            reply_markup: { inline_keyboard: [] },
        });
        expect(callApi.mock.calls[4][1]).toEqual(target);
        expect(callApi.mock.calls[5][1]).toEqual({
            chat_id: 42,
            draft_id: 3,
            text: 'partial',
            can_stop: true,
        });
        expect(callApi.mock.calls[6][1]).toMatchObject({ draft_id: 3, keep_on_stop: true });
    });
});
