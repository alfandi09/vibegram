import { describe, expect, it } from 'vitest';
import type {
    ChatBackground,
    ChatShared,
    ForumTopicCreated,
    DirectMessagePriceChanged,
    GiftInfo,
    Giveaway,
    GiveawayCompleted,
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
    VideoChatEnded,
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
});
