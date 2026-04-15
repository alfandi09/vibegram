import { TelegramClient } from './client';
import {
    Update,
    Message,
    User,
    Chat,
    ChatPermissions,
    ExtraReplyMessage,
    ExtraMedia,
    ExtraEditMessage,
    ExtraPoll,
    ExtraBanMember,
    ExtraRestrictMember,
    ExtraPromoteMember,
    ExtraInviteLink,
    ReplyParameters,
    PollOption,
} from './types';
import * as crypto from 'crypto';

/**
 * Context object is passed to all middlewares and handlers.
 * It encapsulates the current Update and provides shortcuts to Telegram API methods.
 */
export class Context {
    public readonly update: Update;
    public readonly client: TelegramClient;
    public session?: any; // Injected by session() middleware
    public wizard?: {
        state: any;
        next: () => void;
        leave: () => void;
        cursor: number;
    }; // Wizard step navigation helpers

    public i18n?: {
        locale: string;
        t: (key: string, placeholders?: Record<string, string>) => string;
    }; // On-the-fly localization helpers

    public command?: {
        name: string;
        args: string[];
    }; // Auto-injected command argument parser

    public scene?: {
        state: any;
        enter: (sceneId: string, initialState?: any) => void;
        leave: () => void;
        current?: string;
    }; // Scene Manager navigation control

    /**
     * Populated by hears() and action() when a RegExp trigger is matched.
     * Contains the full RegExpMatchArray (index 0 = full match, index 1+ = capture groups).
     * null when the trigger was a plain string.
     */
    public match?: RegExpMatchArray | null;

    constructor(update: Update, client: TelegramClient) {
        this.update = update;
        this.client = client;
    }

    /**
     * Getter for the Message object (if available in this update)
     */
    get message() {
        return (
            this.update.message ||
            this.update.edited_message ||
            this.update.channel_post ||
            this.update.edited_channel_post ||
            this.update.business_message ||
            this.update.edited_business_message
        );
    }

    /**
     * Getter for the specific chat where this update happened
     */
    get chat() {
        return (
            this.message?.chat ||
            this.update.callback_query?.message?.chat ||
            this.update.my_chat_member?.chat ||
            this.update.chat_member?.chat ||
            this.update.chat_join_request?.chat ||
            this.update.chat_boost?.chat ||
            this.update.removed_chat_boost?.chat
        );
    }

    /**
     * Getter for the user who triggered this update
     */
    get from() {
        return (
            this.message?.from ||
            this.update.callback_query?.from ||
            this.update.inline_query?.from ||
            this.update.chosen_inline_result?.from ||
            this.update.my_chat_member?.from ||
            this.update.chat_member?.from ||
            this.update.chat_join_request?.from ||
            this.update.shipping_query?.from ||
            this.update.pre_checkout_query?.from
        );
    }

    /**
     * Getter for Business Connection ID (Native Business Mode API)
     */
    get businessConnectionId() {
        return this.update.business_connection?.id || (this.message as any)?.business_connection_id;
    }

    private getEditTarget() {
        const inlineMessageId = this.update.callback_query?.inline_message_id;
        if (inlineMessageId) {
            return { inline_message_id: inlineMessageId };
        }

        const messageId =
            this.message?.message_id || this.update.callback_query?.message?.message_id;
        if (!this.chat || !messageId) {
            throw new Error(
                'Cannot edit message: Chat ID, Message ID, or inline message ID is not available'
            );
        }

        return {
            chat_id: this.chat.id,
            message_id: messageId,
        };
    }

    /**
     * Shortcut to reply to the current chat
     */
    async reply(text: string, extra?: ExtraReplyMessage) {
        if (!this.chat) {
            throw new Error('Cannot reply: Chat ID is not available in the current context');
        }
        return this.client.callApi('sendMessage', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            text,
            ...extra,
        });
    }

    /**
     * Shortcut to reply with HTML formatting
     */
    async replyWithHTML(text: string, extra?: ExtraReplyMessage) {
        return this.reply(text, { parse_mode: 'HTML', ...extra });
    }

    /**
     * Shortcut to reply with Markdown formatting
     */
    async replyWithMarkdown(text: string, extra?: ExtraReplyMessage) {
        return this.reply(text, { parse_mode: 'Markdown', ...extra });
    }

    /**
     * Shortcut to reply with MarkdownV2 formatting
     */
    async replyWithMarkdownV2(text: string, extra?: ExtraReplyMessage) {
        return this.reply(text, { parse_mode: 'MarkdownV2', ...extra });
    }

    /**
     * Shortcut: Draft Message API 9.5 (Pre-fills text input on client side)
     */
    async replyWithDraft(
        text: string,
        extra?: ExtraReplyMessage & { random_id?: number | string }
    ) {
        if (!this.chat) throw new Error('Cannot send draft: Chat ID is not available');
        // Generate cryptographically safe 64-bit random ID for MTProto validation
        const randomId = extra?.random_id || crypto.randomBytes(8).readBigUInt64BE().toString();
        return this.client.callApi('sendMessageDraft', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            text,
            random_id: randomId,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Photo
     */
    async replyWithPhoto(photo: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send photo: Chat ID is not available');
        return this.client.callApi('sendPhoto', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            photo,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Video
     */
    async replyWithVideo(video: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send video: Chat ID is not available');
        return this.client.callApi('sendVideo', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            video,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Document
     */
    async replyWithDocument(document: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send document: Chat ID is not available');
        return this.client.callApi('sendDocument', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            document,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Audio (music file)
     */
    async replyWithAudio(audio: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send audio: Chat ID is not available');
        return this.client.callApi('sendAudio', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            audio,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Voice (compressed OGG/Opus audio)
     */
    async replyWithVoice(voice: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send voice: Chat ID is not available');
        return this.client.callApi('sendVoice', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            voice,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Video Note (circular video message)
     */
    async replyWithVideoNote(videoNote: string | any, extra?: any) {
        if (!this.chat) throw new Error('Cannot send video note: Chat ID is not available');
        return this.client.callApi('sendVideoNote', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            video_note: videoNote,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Animation (GIF or H.264 video without sound)
     */
    async replyWithAnimation(animation: string | any, extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send animation: Chat ID is not available');
        return this.client.callApi('sendAnimation', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            animation,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Sticker
     */
    async replyWithSticker(sticker: string | any, extra?: any) {
        if (!this.chat) throw new Error('Cannot send sticker: Chat ID is not available');
        return this.client.callApi('sendSticker', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            sticker,
            ...extra,
        });
    }

    /**
     * Media Shortcut: Media Group (album of photos/videos)
     */
    async replyWithMediaGroup(media: any[], extra?: any) {
        if (!this.chat) throw new Error('Cannot send media group: Chat ID is not available');
        return this.client.callApi('sendMediaGroup', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            media,
            ...extra,
        });
    }

    /**
     * Interactive Shortcut: Poll / Quiz
     */
    async replyWithPoll(question: string, options: Array<{ text: string }>, extra?: ExtraPoll) {
        if (!this.chat) throw new Error('Cannot send poll: Chat ID is not available');
        return this.client.callApi('sendPoll', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            question,
            options,
            ...extra,
        });
    }

    /**
     * Interface Shortcut: Location
     */
    async replyWithLocation(latitude: number, longitude: number, extra?: any) {
        if (!this.chat) throw new Error('Cannot send location: Chat ID is not available');
        return this.client.callApi('sendLocation', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            latitude,
            longitude,
            ...extra,
        });
    }

    /**
     * Interface Shortcut: Venue
     */
    async replyWithVenue(
        latitude: number,
        longitude: number,
        title: string,
        address: string,
        extra?: any
    ) {
        if (!this.chat) throw new Error('Cannot send venue: Chat ID is not available');
        return this.client.callApi('sendVenue', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            latitude,
            longitude,
            title,
            address,
            ...extra,
        });
    }

    /**
     * Interface Shortcut: Contact
     */
    async replyWithContact(phoneNumber: string, firstName: string, extra?: any) {
        if (!this.chat) throw new Error('Cannot send contact: Chat ID is not available');
        return this.client.callApi('sendContact', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            phone_number: phoneNumber,
            first_name: firstName,
            ...extra,
        });
    }

    /**
     * Edit Message Text directly
     */
    async editMessageText(text: string, extra?: ExtraEditMessage) {
        const target = this.getEditTarget();
        return this.client.callApi('editMessageText', {
            business_connection_id: this.businessConnectionId,
            ...target,
            text,
            ...extra,
        });
    }

    /**
     * Edit Message Reply Markup directly
     */
    async editMessageReplyMarkup(reply_markup: any, extra?: any) {
        const target = this.getEditTarget();
        return this.client.callApi('editMessageReplyMarkup', {
            business_connection_id: this.businessConnectionId,
            ...target,
            reply_markup,
            ...extra,
        });
    }

    /**
     * Edit Message Caption
     */
    async editMessageCaption(caption: string, extra?: any) {
        const target = this.getEditTarget();
        return this.client.callApi('editMessageCaption', {
            business_connection_id: this.businessConnectionId,
            ...target,
            caption,
            ...extra,
        });
    }

    /**
     * Delete Message
     */
    async deleteMessage(messageId?: number) {
        if (!this.chat) throw new Error('Cannot delete message: Chat ID is not available');
        const targetId =
            messageId ||
            this.message?.message_id ||
            this.update.callback_query?.message?.message_id;
        return this.client.callApi('deleteMessage', {
            chat_id: this.chat.id,
            message_id: targetId,
        });
    }

    /**
     * Web3 Monetization: Create Star Invoice Payload (XTR)
     */
    async replyWithInvoice(
        title: string,
        description: string,
        payload: string,
        currency: string,
        prices: any[],
        extra?: any
    ) {
        if (!this.chat) throw new Error('Cannot send invoice: Chat ID is not available');
        return this.client.callApi('sendInvoice', {
            chat_id: this.chat.id,
            title,
            description,
            payload,
            currency,
            prices,
            ...extra,
        });
    }

    /**
     * Inline Core Query Answering (Global bot invocation tracking)
     */
    async answerInlineQuery(results: any[], extra?: any) {
        if (!this.update.inline_query)
            throw new Error('Cannot answer inline query: Not an inline query update');
        return this.client.callApi('answerInlineQuery', {
            inline_query_id: this.update.inline_query.id,
            results,
            ...extra,
        });
    }

    /**
     * Answer a Callback Query (to stop the loading indicator on the inline button)
     */
    async answerCbQuery(text?: string, showAlert?: boolean, extra?: any) {
        if (!this.update.callback_query) {
            throw new Error('Cannot answer callback query: Not a callback query update');
        }
        return this.client.callApi('answerCallbackQuery', {
            callback_query_id: this.update.callback_query.id,
            text,
            show_alert: showAlert,
            ...extra,
        });
    }

    /**
     * E-Commerce / Stars: Checkout Answering validation payload
     */
    async answerPreCheckoutQuery(ok: boolean, errorMessage?: string) {
        if (!this.update.pre_checkout_query)
            throw new Error('Cannot answer pre-checkout: No pending pre_checkout_query');
        return this.client.callApi('answerPreCheckoutQuery', {
            pre_checkout_query_id: this.update.pre_checkout_query.id,
            ok,
            error_message: errorMessage,
        });
    }

    /**
     * Set Chat Action indicator (e.g., Typing, Recording, Uploading)
     * Options: 'typing' | 'upload_photo' | 'record_video' | 'record_voice' | 'upload_document' | 'choose_sticker' | 'find_location' | 'record_video_note' | 'upload_video_note'
     */
    async sendChatAction(action: string, messageThreadId?: number) {
        if (!this.chat) throw new Error('Cannot send chat action: Chat ID is not available');
        return this.client.callApi('sendChatAction', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            action,
            message_thread_id: messageThreadId,
        });
    }

    /**
     * Set Message Reaction
     */
    async setReaction(reaction: string | any[], isBig?: boolean) {
        if (!this.chat || !this.message?.message_id)
            throw new Error('Cannot set reaction: Chat ID or Message ID is not available');

        // Parse a string emoji into the MessageReaction array format.
        let formattedReaction = reaction;
        if (typeof reaction === 'string') {
            formattedReaction = [{ type: 'emoji', emoji: reaction }];
        }

        return this.client.callApi('setMessageReaction', {
            chat_id: this.chat.id,
            message_id: this.message.message_id,
            reaction: formattedReaction,
            is_big: isBig,
        });
    }

    /**
     * Send Paid Media (Telegram Stars)
     */
    async replyWithPaidMedia(star_count: number, media: any[], extra?: ExtraMedia) {
        if (!this.chat) throw new Error('Cannot send paid media: Chat ID is not available');
        return this.client.callApi('sendPaidMedia', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            star_count,
            media,
            ...extra,
        });
    }

    /**
     * Copy Message (Silent transfer)
     */
    async copyMessage(toChatId: number | string, extra?: any) {
        if (!this.chat || !this.message?.message_id)
            throw new Error('Cannot copy message: Origin Chat ID or Message ID is not available');
        return this.client.callApi('copyMessage', {
            chat_id: toChatId,
            from_chat_id: this.chat.id,
            message_id: this.message.message_id,
            ...extra,
        });
    }

    /**
     * Administration: Standard Message Forwarding
     */
    async forwardMessage(toChatId: number | string, extra?: any) {
        if (!this.chat || !this.message?.message_id)
            throw new Error(
                'Cannot forward message: Origin Chat ID or Message ID is not available'
            );
        return this.client.callApi('forwardMessage', {
            chat_id: toChatId,
            from_chat_id: this.chat.id,
            message_id: this.message.message_id,
            ...extra,
        });
    }

    /**
     * UI Mutator: Pin Active Message to Top of the Chat Header
     */
    async pinChatMessage(messageId?: number, disableNotification?: boolean) {
        if (!this.chat) throw new Error('Cannot pin message: Chat ID is not available');
        const targetId = messageId || this.message?.message_id;
        if (!targetId) throw new Error('Cannot pin message: Target Message ID is not available');
        return this.client.callApi('pinChatMessage', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            message_id: targetId,
            disable_notification: disableNotification,
        });
    }

    /**
     * UI Mutator: Unpin Active Message from the Chat Header
     */
    async unpinChatMessage(messageId?: number) {
        if (!this.chat) throw new Error('Cannot unpin message: Chat ID is not available');
        return this.client.callApi('unpinChatMessage', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            message_id: messageId || this.message?.message_id,
        });
    }

    /**
     * Group Admin: Ban a user from the chat permanently or temporarily
     */
    async banChatMember(userId: number, extra?: ExtraBanMember) {
        if (!this.chat) throw new Error('Cannot ban member: Chat ID is not available');
        return this.client.callApi('banChatMember', {
            chat_id: this.chat.id,
            user_id: userId,
            ...extra,
        });
    }

    /**
     * Group Admin: Restrict user permissions (e.g., mute or disable media)
     */
    async restrictChatMember(
        userId: number,
        permissions: ChatPermissions,
        extra?: ExtraRestrictMember
    ) {
        if (!this.chat) throw new Error('Cannot restrict member: Chat ID is not available');
        return this.client.callApi('restrictChatMember', {
            chat_id: this.chat.id,
            user_id: userId,
            permissions,
            ...extra,
        });
    }

    /**
     * Gatekeeper: Approve a user's pending join request to the chat/channel
     */
    async approveChatJoinRequest(userId: number) {
        if (!this.chat) throw new Error('Cannot approve join request: Chat ID is not available');
        return this.client.callApi('approveChatJoinRequest', {
            chat_id: this.chat.id,
            user_id: userId,
        });
    }

    /**
     * Gatekeeper: Decline a user's pending join request
     */
    async declineChatJoinRequest(userId: number) {
        if (!this.chat) throw new Error('Cannot decline join request: Chat ID is not available');
        return this.client.callApi('declineChatJoinRequest', {
            chat_id: this.chat.id,
            user_id: userId,
        });
    }

    /**
     * Autonomous Control: Command the bot to leave the current chat/group voluntarily
     */
    async leaveChat() {
        if (!this.chat) throw new Error('Cannot leave chat: Chat ID is not available');
        return this.client.callApi('leaveChat', {
            chat_id: this.chat.id,
        });
    }

    /**
     * Group Admin: Unban a previously banned user
     */
    async unbanChatMember(userId: number, extra?: { only_if_banned?: boolean }) {
        if (!this.chat) throw new Error('Cannot unban member: Chat ID is not available');
        return this.client.callApi('unbanChatMember', {
            chat_id: this.chat.id,
            user_id: userId,
            only_if_banned: true,
            ...extra,
        });
    }

    /**
     * Group Admin: Promote a user to administrator
     */
    async promoteChatMember(userId: number, permissions?: ExtraPromoteMember) {
        if (!this.chat) throw new Error('Cannot promote member: Chat ID is not available');
        return this.client.callApi('promoteChatMember', {
            chat_id: this.chat.id,
            user_id: userId,
            ...permissions,
        });
    }

    /**
     * Group Admin: Set default chat permissions
     */
    async setChatPermissions(
        permissions: ChatPermissions,
        extra?: { use_independent_chat_permissions?: boolean }
    ) {
        if (!this.chat) throw new Error('Cannot set permissions: Chat ID is not available');
        return this.client.callApi('setChatPermissions', {
            chat_id: this.chat.id,
            permissions,
            ...extra,
        });
    }

    /**
     * Group Admin: Get information about a chat member
     */
    async getChatMember(userId: number) {
        if (!this.chat) throw new Error('Cannot get chat member: Chat ID is not available');
        return this.client.callApi('getChatMember', {
            chat_id: this.chat.id,
            user_id: userId,
        });
    }

    /**
     * Group Admin: Get the number of members in a chat
     */
    async getChatMembersCount() {
        if (!this.chat) throw new Error('Cannot get member count: Chat ID is not available');
        return this.client.callApi('getChatMemberCount', {
            chat_id: this.chat.id,
        });
    }

    /**
     * Group: Create a custom invite link
     */
    async createChatInviteLink(extra?: ExtraInviteLink) {
        if (!this.chat) throw new Error('Cannot create invite link: Chat ID is not available');
        return this.client.callApi('createChatInviteLink', {
            chat_id: this.chat.id,
            ...extra,
        });
    }

    /**
     * Group: Export the primary invite link
     */
    async exportChatInviteLink() {
        if (!this.chat) throw new Error('Cannot export invite link: Chat ID is not available');
        return this.client.callApi('exportChatInviteLink', {
            chat_id: this.chat.id,
        });
    }

    /**
     * Get information about the current chat
     */
    async getChat() {
        if (!this.chat) throw new Error('Cannot get chat: Chat ID is not available');
        return this.client.callApi('getChat', {
            chat_id: this.chat.id,
        });
    }

    /**
     * Helper to quickly get direct link to download a file from telegram server
     */
    async getFileLink(fileId: string): Promise<string> {
        return this.client.getFileLink(fileId);
    }

    /**
     * Helper to stream download a file from telegram directly to local hard drive or buffer
     */
    async downloadFile(fileId: string, destPath?: string): Promise<Buffer | void> {
        return this.client.downloadFile(fileId, destPath);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORUM TOPIC MANAGEMENT (Bot API 6.4+)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new topic in a supergroup forum chat.
     */
    async createForumTopic(
        name: string,
        extra?: { icon_color?: number; icon_custom_emoji_id?: string }
    ) {
        if (!this.chat) throw new Error('Cannot create forum topic: Chat ID is not available');
        return this.client.callApi('createForumTopic', { chat_id: this.chat.id, name, ...extra });
    }

    /**
     * Edit name or icon of an existing forum topic.
     */
    async editForumTopic(
        messageThreadId: number,
        extra?: { name?: string; icon_custom_emoji_id?: string }
    ) {
        if (!this.chat) throw new Error('Cannot edit forum topic: Chat ID is not available');
        return this.client.callApi('editForumTopic', {
            chat_id: this.chat.id,
            message_thread_id: messageThreadId,
            ...extra,
        });
    }

    /**
     * Close an open forum topic so no new messages can be sent.
     */
    async closeForumTopic(messageThreadId: number) {
        if (!this.chat) throw new Error('Cannot close forum topic: Chat ID is not available');
        return this.client.callApi('closeForumTopic', {
            chat_id: this.chat.id,
            message_thread_id: messageThreadId,
        });
    }

    /**
     * Reopen a previously closed forum topic.
     */
    async reopenForumTopic(messageThreadId: number) {
        if (!this.chat) throw new Error('Cannot reopen forum topic: Chat ID is not available');
        return this.client.callApi('reopenForumTopic', {
            chat_id: this.chat.id,
            message_thread_id: messageThreadId,
        });
    }

    /**
     * Permanently delete a forum topic and all its messages.
     */
    async deleteForumTopic(messageThreadId: number) {
        if (!this.chat) throw new Error('Cannot delete forum topic: Chat ID is not available');
        return this.client.callApi('deleteForumTopic', {
            chat_id: this.chat.id,
            message_thread_id: messageThreadId,
        });
    }

    /**
     * Unpin all messages in a forum topic.
     */
    async unpinAllForumTopicMessages(messageThreadId: number) {
        if (!this.chat)
            throw new Error('Cannot unpin forum topic messages: Chat ID is not available');
        return this.client.callApi('unpinAllForumTopicMessages', {
            chat_id: this.chat.id,
            message_thread_id: messageThreadId,
        });
    }

    /**
     * Edit the name of the "General" forum topic (the first topic).
     */
    async editGeneralForumTopic(name: string) {
        if (!this.chat) throw new Error('Cannot edit general topic: Chat ID is not available');
        return this.client.callApi('editGeneralForumTopic', { chat_id: this.chat.id, name });
    }

    /**
     * Hide the "General" forum topic from the topic list.
     */
    async hideGeneralForumTopic() {
        if (!this.chat) throw new Error('Cannot hide general topic: Chat ID is not available');
        return this.client.callApi('hideGeneralForumTopic', { chat_id: this.chat.id });
    }

    /**
     * Unhide the "General" forum topic.
     */
    async unhideGeneralForumTopic() {
        if (!this.chat) throw new Error('Cannot unhide general topic: Chat ID is not available');
        return this.client.callApi('unhideGeneralForumTopic', { chat_id: this.chat.id });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAR GIFTS & MONETIZATION (Bot API 9.x)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the list of gifts that can be sent by the bot.
     */
    async getAvailableGifts(): Promise<any> {
        return this.client.callApi('getAvailableGifts');
    }

    /**
     * Send a Star gift to another user.
     */
    async sendGift(
        userId: number,
        giftId: string,
        extra?: { text?: string; text_parse_mode?: string; text_entities?: any[] }
    ) {
        return this.client.callApi('sendGift', { user_id: userId, gift_id: giftId, ...extra });
    }

    /**
     * Get the list of gifts owned by the given user or the bot.
     */
    async getUserGifts(extra?: {
        user_id?: number;
        offset?: string;
        limit?: number;
    }): Promise<any> {
        return this.client.callApi('getUserGifts', extra);
    }

    /**
     * Convert a received gift to Telegram Stars.
     */
    async convertGiftToStars(businessConnectionId: string, messageId: number): Promise<boolean> {
        return this.client.callApi('convertGiftToStars', {
            business_connection_id: businessConnectionId,
            message_id: messageId,
        });
    }

    /**
     * Save a received gift to the bot's profile.
     */
    async saveGift(
        businessConnectionId: string,
        messageId: number,
        extra?: { is_saved?: boolean }
    ): Promise<boolean> {
        return this.client.callApi('saveGift', {
            business_connection_id: businessConnectionId,
            message_id: messageId,
            ...extra,
        });
    }

    /**
     * Get the number of Telegram Stars owned by the bot.
     */
    async getStarBalance(): Promise<any> {
        return this.client.callApi('getStarBalance');
    }

    /**
     * Refund a Telegram Stars payment to the user.
     */
    async refundStarPayment(userId: number, telegramPaymentChargeId: string): Promise<boolean> {
        return this.client.callApi('refundStarPayment', {
            user_id: userId,
            telegram_payment_charge_id: telegramPaymentChargeId,
        });
    }

    /**
     * Get a list of Telegram Star transactions for this bot.
     */
    async getStarTransactions(extra?: { offset?: number; limit?: number }): Promise<any> {
        return this.client.callApi('getStarTransactions', extra);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER / CHAT VERIFICATION (Bot API 8.3+)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Verify a user on behalf of the organization which is represented by the bot.
     */
    async verifyUser(userId: number, extra?: { custom_description?: string }): Promise<boolean> {
        return this.client.callApi('verifyUser', { user_id: userId, ...extra });
    }

    /**
     * Remove verification from a user who is currently verified by the bot.
     */
    async removeUserVerification(userId: number): Promise<boolean> {
        return this.client.callApi('removeUserVerification', { user_id: userId });
    }

    /**
     * Verify a chat on behalf of the organization which is represented by the bot.
     */
    async verifyChat(
        chatId: number | string,
        extra?: { custom_description?: string }
    ): Promise<boolean> {
        return this.client.callApi('verifyChat', { chat_id: chatId, ...extra });
    }

    /**
     * Remove verification from a chat that is currently verified by the bot.
     */
    async removeChatVerification(chatId: number | string): Promise<boolean> {
        return this.client.callApi('removeChatVerification', { chat_id: chatId });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BOOST, STICKERS & MISC (Bot API 7.x+)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get the list of boosts applied to a chat by the current user.
     */
    async getUserChatBoosts(userId: number): Promise<any> {
        if (!this.chat) throw new Error('Cannot get user chat boosts: Chat ID is not available');
        return this.client.callApi('getUserChatBoosts', { chat_id: this.chat.id, user_id: userId });
    }

    /**
     * Upload a sticker file for use in a sticker set.
     */
    async uploadStickerFile(
        userId: number,
        sticker: any,
        stickerFormat: 'static' | 'animated' | 'video'
    ): Promise<any> {
        return this.client.callApi('uploadStickerFile', {
            user_id: userId,
            sticker,
            sticker_format: stickerFormat,
        });
    }

    /**
     * Create a new sticker set owned by a user.
     */
    async createNewStickerSet(
        userId: number,
        name: string,
        title: string,
        stickers: any[],
        extra?: any
    ): Promise<boolean> {
        return this.client.callApi('createNewStickerSet', {
            user_id: userId,
            name,
            title,
            stickers,
            ...extra,
        });
    }

    /**
     * Add stickers to an existing sticker set.
     */
    async addStickerToSet(userId: number, name: string, sticker: any): Promise<boolean> {
        return this.client.callApi('addStickerToSet', { user_id: userId, name, sticker });
    }

    /**
     * Delete a sticker from a sticker set owned by the bot.
     */
    async deleteStickerFromSet(sticker: string): Promise<boolean> {
        return this.client.callApi('deleteStickerFromSet', { sticker });
    }

    /**
     * Set the thumbnail of a custom sticker set.
     */
    async setStickerSetThumbnail(
        name: string,
        userId: number,
        extra?: { thumbnail?: any; format?: string }
    ): Promise<boolean> {
        return this.client.callApi('setStickerSetThumbnail', { name, user_id: userId, ...extra });
    }

    /**
     * Get a sticker set by its name.
     */
    async getStickerSet(name: string): Promise<any> {
        return this.client.callApi('getStickerSet', { name });
    }

    /**
     * Get information about custom emoji stickers by their IDs.
     */
    async getCustomEmojiStickers(customEmojiIds: string[]): Promise<any[]> {
        return this.client.callApi('getCustomEmojiStickers', { custom_emoji_ids: customEmojiIds });
    }

    /**
     * Delete all messages sent by the user in the current supergroup.
     * Requires can_delete_messages admin right.
     */
    async deleteUserMessagesFromChat(userId: number): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot delete user messages: Chat ID is not available');
        return this.client.callApi('deleteChatMessages', {
            chat_id: this.chat.id,
            user_id: userId,
        });
    }

    /**
     * Set administrator custom title in a supergroup.
     */
    async setChatAdministratorCustomTitle(userId: number, customTitle: string): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot set admin title: Chat ID is not available');
        return this.client.callApi('setChatAdministratorCustomTitle', {
            chat_id: this.chat.id,
            user_id: userId,
            custom_title: customTitle,
        });
    }

    /**
     * Get the list of administrators in the current chat.
     */
    async getChatAdministrators(): Promise<any[]> {
        if (!this.chat) throw new Error('Cannot get administrators: Chat ID is not available');
        return this.client.callApi('getChatAdministrators', { chat_id: this.chat.id });
    }

    /**
     * Send an animated dice emoji (🎲, 🎯, 🏀, etc).
     */
    async replyWithDice(
        emoji: '🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰' = '🎲',
        extra?: ExtraReplyMessage
    ) {
        if (!this.chat) throw new Error('Cannot send dice: Chat ID is not available');
        return this.client.callApi('sendDice', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            emoji,
            ...extra,
        });
    }

    /**
     * Send a checklist message (Bot API 9.6).
     */
    async replyWithChecklist(
        title: string,
        tasks: { text: string; text_parse_mode?: string }[],
        extra?: ExtraReplyMessage
    ) {
        if (!this.chat) throw new Error('Cannot send checklist: Chat ID is not available');
        return this.client.callApi('sendChecklist', {
            chat_id: this.chat.id,
            business_connection_id: this.businessConnectionId,
            title,
            tasks,
            ...extra,
        });
    }

    /**
     * Answer a shipping query for digital goods delivery.
     */
    async answerShippingQuery(
        ok: boolean,
        extra?: { shipping_options?: any[]; error_message?: string }
    ): Promise<boolean> {
        if (!this.update.shipping_query)
            throw new Error('Cannot answer shipping query: Not a shipping_query update');
        return this.client.callApi('answerShippingQuery', {
            shipping_query_id: this.update.shipping_query.id,
            ok,
            ...extra,
        });
    }

    /**
     * Unpin all messages from the current chat.
     */
    async unpinAllChatMessages(): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot unpin all messages: Chat ID is not available');
        return this.client.callApi('unpinAllChatMessages', { chat_id: this.chat.id });
    }

    /**
     * Set the chat profile photo.
     */
    async setChatPhoto(photo: any): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot set chat photo: Chat ID is not available');
        return this.client.callApi('setChatPhoto', { chat_id: this.chat.id, photo });
    }

    /**
     * Delete the chat profile photo.
     */
    async deleteChatPhoto(): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot delete chat photo: Chat ID is not available');
        return this.client.callApi('deleteChatPhoto', { chat_id: this.chat.id });
    }

    /**
     * Set the chat title.
     */
    async setChatTitle(title: string): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot set chat title: Chat ID is not available');
        return this.client.callApi('setChatTitle', { chat_id: this.chat.id, title });
    }

    /**
     * Set the chat description.
     */
    async setChatDescription(description: string): Promise<boolean> {
        if (!this.chat) throw new Error('Cannot set chat description: Chat ID is not available');
        return this.client.callApi('setChatDescription', { chat_id: this.chat.id, description });
    }

    /**
     * Get a list of custom emoji reaction packs available for this chat.
     */
    async getEmojiReactionPacks(): Promise<any> {
        return this.client.callApi('getEmojiReactionPacks');
    }

    /**
     * Read business story reactions (Bot API 9.x).
     */
    async readBusinessStory(businessConnectionId: string, storyId: number): Promise<boolean> {
        return this.client.callApi('readBusinessStory', {
            business_connection_id: businessConnectionId,
            story_id: storyId,
        });
    }
}
