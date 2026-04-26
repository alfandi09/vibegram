import { describe, expect, it } from 'vitest';
import type {
    ChatBackground,
    ChatShared,
    ChatOwnerChanged,
    ChatOwnerLeft,
    InlineKeyboardButton,
    ForumTopicCreated,
    DirectMessagePriceChanged,
    ExtraPoll,
    GiftInfo,
    Giveaway,
    GiveawayCompleted,
    InputProfilePhoto,
    MessageOriginChannel,
    MessageOriginHiddenUser,
    MessageOriginUser,
    Invoice,
    ManagedBotUpdated,
    Message,
    PaidMessagePriceChanged,
    PollOptionAdded,
    PollOptionDeleted,
    ProximityAlertTriggered,
    RefundedPayment,
    SharedUser,
    StarTransactions,
    SuggestedPostApproved,
    SuggestedPostInfo,
    SuccessfulPayment,
    UsersShared,
    UserProfileAudios,
    VideoChatEnded,
    VideoQuality,
} from '../src/types';

describe('modern Telegram types', () => {
    it('accepts monetization and suggested-post service payloads', () => {
        const gift: GiftInfo = {
            gift: { gift_id: 'gift-1', star_count: 100 },
            owned_gift_id: 'owned-1',
            can_be_upgraded: true,
        };
        const suggestedPost: SuggestedPostInfo = {
            state: 'approved',
            price: { currency: 'XTR', amount: 500 },
            send_date: 1234567890,
        };
        const paidPrice: PaidMessagePriceChanged = { paid_message_star_count: 25 };
        const dmPrice: DirectMessagePriceChanged = { paid_message_star_count: 5 };
        const pollOptionAdded: PollOptionAdded = {
            option: { text: 'Blue', voter_count: 0, persistent_id: 'blue-1' },
        };
        const pollOptionDeleted: PollOptionDeleted = {
            option_persistent_id: 'blue-1',
            option_text: 'Blue',
        };
        const managedBot: ManagedBotUpdated = {
            user: { id: 1, is_bot: false, first_name: 'Owner' },
            bot: { id: 2, is_bot: true, first_name: 'Worker' },
        };
        const stars: StarTransactions = {
            transactions: [
                {
                    id: 'tx-1',
                    amount: { amount: 100 },
                    date: 1234567890,
                },
            ],
        };
        const approved: SuggestedPostApproved = {
            send_date: 1234567890,
            price: { currency: 'TON', amount: 10 },
        };
        const message: Message = {
            message_id: 1,
            date: 123,
            chat: { id: 99, type: 'private' },
            gift,
            suggested_post_info: suggestedPost,
            paid_message_price_changed: paidPrice,
            direct_message_price_changed: dmPrice,
            poll_option_added: pollOptionAdded,
            poll_option_deleted: pollOptionDeleted,
        };

        expect(message.gift?.owned_gift_id).toBe('owned-1');
        expect(message.suggested_post_info?.state).toBe('approved');
        expect(message.paid_message_price_changed?.paid_message_star_count).toBe(25);
        expect(message.direct_message_price_changed?.paid_message_star_count).toBe(5);
        expect(message.poll_option_added?.option.persistent_id).toBe('blue-1');
        expect(message.poll_option_deleted?.option_persistent_id).toBe('blue-1');
        expect(managedBot.bot.id).toBe(2);
        expect(stars.transactions).toHaveLength(1);
        expect(approved.price?.currency).toBe('TON');
    });

    it('accepts non-monetization service payloads that replaced old placeholders', () => {
        const invoice: Invoice = {
            title: 'Premium',
            description: 'Monthly plan',
            start_parameter: 'premium',
            currency: 'USD',
            total_amount: 999,
        };
        const successfulPayment: SuccessfulPayment = {
            currency: 'USD',
            total_amount: 999,
            invoice_payload: 'order-1',
            telegram_payment_charge_id: 'tg-1',
            provider_payment_charge_id: 'provider-1',
        };
        const refundedPayment: RefundedPayment = {
            currency: 'XTR',
            total_amount: 100,
            invoice_payload: 'refund-1',
            telegram_payment_charge_id: 'tg-refund-1',
        };
        const sharedUser: SharedUser = { user_id: 42, first_name: 'Ada' };
        const usersShared: UsersShared = { request_id: 1, users: [sharedUser] };
        const chatShared: ChatShared = { request_id: 2, chat_id: 99, title: 'Team' };
        const proximity: ProximityAlertTriggered = {
            traveler: { id: 1, is_bot: false, first_name: 'A' },
            watcher: { id: 2, is_bot: false, first_name: 'B' },
            distance: 12,
        };
        const forumTopic: ForumTopicCreated = {
            name: 'Roadmap',
            icon_color: 0xffffff,
        };
        const giveaway: Giveaway = {
            chats: [{ id: -100, type: 'channel', title: 'News' }],
            winners_selection_date: 1234567890,
            winner_count: 3,
        };
        const giveawayCompleted: GiveawayCompleted = {
            winner_count: 3,
            is_star_giveaway: true,
        };
        const chatBackground: ChatBackground = { type: 'fill_solid' };
        const videoChatEnded: VideoChatEnded = { duration: 300 };

        const message: Message = {
            message_id: 2,
            date: 124,
            chat: { id: 100, type: 'private' },
            invoice,
            successful_payment: successfulPayment,
            refunded_payment: refundedPayment,
            user_shared: sharedUser,
            users_shared: usersShared,
            chat_shared: chatShared,
            proximity_alert_triggered: proximity,
            forum_topic_created: forumTopic,
            giveaway,
            giveaway_completed: giveawayCompleted,
            chat_background_set: chatBackground,
            video_chat_ended: videoChatEnded,
        };

        expect(message.invoice?.title).toBe('Premium');
        expect(message.successful_payment?.invoice_payload).toBe('order-1');
        expect(message.refunded_payment?.currency).toBe('XTR');
        expect(message.users_shared?.users[0].user_id).toBe(42);
        expect(message.chat_shared?.title).toBe('Team');
        expect(message.proximity_alert_triggered?.distance).toBe(12);
        expect(message.forum_topic_created?.name).toBe('Roadmap');
        expect(message.giveaway?.winner_count).toBe(3);
        expect(message.giveaway_completed?.is_star_giveaway).toBe(true);
        expect(message.chat_background_set?.type).toBe('fill_solid');
        expect(message.video_chat_ended?.duration).toBe(300);
    });

    it('accepts Bot API 9.x profile, origin, and owner service payloads', () => {
        const originUser: MessageOriginUser = {
            type: 'user',
            date: 123,
            sender_user: { id: 1, is_bot: false, first_name: 'Ada' },
        };
        const originHidden: MessageOriginHiddenUser = {
            type: 'hidden_user',
            date: 124,
            sender_user_name: 'Anonymous',
        };
        const originChannel: MessageOriginChannel = {
            type: 'channel',
            date: 125,
            chat: { id: -100, type: 'channel', title: 'News' },
            message_id: 9,
        };
        const ownerLeft: ChatOwnerLeft = {};
        const ownerChanged: ChatOwnerChanged = {
            old_owner: { id: 1, is_bot: false, first_name: 'Old' },
            new_owner: { id: 2, is_bot: false, first_name: 'New' },
        };
        const profilePhoto: InputProfilePhoto = {
            type: 'static',
            photo: 'file-id',
        };
        const quality: VideoQuality = {
            file_id: 'video-720',
            file_unique_id: 'unique-720',
            width: 1280,
            height: 720,
            duration: 60,
        };
        const profileAudios: UserProfileAudios = {
            total_count: 1,
            audios: [
                {
                    file_id: 'audio-1',
                    file_unique_id: 'audio-u1',
                    duration: 10,
                },
            ],
        };
        const message: Message = {
            message_id: 3,
            date: 126,
            chat: { id: 100, type: 'private' },
            forward_origin: originUser,
            chat_owner_left: ownerLeft,
            chat_owner_changed: ownerChanged,
            video: {
                file_id: 'video-1',
                file_unique_id: 'video-u1',
                width: 1920,
                height: 1080,
                duration: 60,
                qualities: [quality],
            },
        };

        expect(message.forward_origin?.type).toBe('user');
        expect(originHidden.sender_user_name).toBe('Anonymous');
        expect(originChannel.message_id).toBe(9);
        expect(message.chat_owner_changed?.new_owner.id).toBe(2);
        expect(profilePhoto.type).toBe('static');
        expect(message.video?.qualities?.[0].height).toBe(720);
        expect(profileAudios.total_count).toBe(1);
    });

    it('accepts copy-text inline keyboard buttons', () => {
        const button: InlineKeyboardButton = {
            text: 'Copy code',
            copy_text: { text: 'ABC-123' },
        };

        expect(button.copy_text?.text).toBe('ABC-123');
    });

    it('accepts modern multi-answer quiz poll options', () => {
        const extra: ExtraPoll = {
            type: 'quiz',
            allows_multiple_answers: true,
            correct_option_ids: [0, 2],
        };

        // @ts-expect-error correct_option_id was removed in favor of correct_option_ids.
        const legacyExtra: ExtraPoll = { correct_option_id: 0 };

        expect(extra.correct_option_ids).toEqual([0, 2]);
        expect(legacyExtra).toEqual({ correct_option_id: 0 });
    });
});
