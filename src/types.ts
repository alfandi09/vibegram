/**
 * =========================================================================
 * VIBEGRAM: COMPREHENSIVE TELEGRAM BOT API TYPE DEFINITIONS (v9.x)
 * =========================================================================
 * All definitions here are "Zero-Bloat" — TypeScript interfaces are erased
 * entirely at `tsc` compile time, adding zero runtime overhead.
 * They exist purely to improve Developer Experience (DX) in your IDE.
 */

export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: boolean;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
    can_manage_bots?: boolean; // API 9.6 Managed Bots Flag
}

export interface Chat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: boolean;
    photo?: any;
    active_usernames?: string[];
    available_reactions?: any[];
    accent_color_id?: number;
    background_custom_emoji_id?: string;
    profile_accent_color_id?: number;
    profile_background_custom_emoji_id?: string;
    emoji_status_custom_emoji_id?: string;
    emoji_status_expiration_date?: number;
    has_target_custom_emoji?: boolean;
    has_hidden_members?: boolean;
    has_aggressive_anti_spam_enabled?: boolean;
    has_restricted_voice_and_video_messages?: boolean;
    join_to_send_messages?: boolean;
    join_by_request?: boolean;
    description?: string;
    invite_link?: string;
    pinned_message?: Message;
    permissions?: any;
    slow_mode_delay?: number;
    message_auto_delete_time?: number;
    has_protected_content?: boolean;
    sticker_set_name?: string;
    can_set_sticker_set?: boolean;
    linked_chat_id?: number;
    location?: any;
}

export interface MessageEntity {
    type: 'mention' | 'hashtag' | 'cashtag' | 'bot_command' | 'url' | 'email' | 'phone_number' | 'bold' | 'italic' | 'underline' | 'strikethrough' | 'spoiler' | 'code' | 'pre' | 'text_link' | 'text_mention' | 'custom_emoji' | 'blockquote' | 'expandable_blockquote' | 'date_time';
    offset: number;
    length: number;
    url?: string;
    user?: User;
    language?: string;
    custom_emoji_id?: string;
}

export interface PhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}

export interface Audio {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    thumbnail?: PhotoSize;
}

export interface Document {
    file_id: string;
    file_unique_id: string;
    thumbnail?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

export interface Video {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    thumbnail?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

export interface Voice {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
}

export interface Animation {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    thumbnail?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

export interface Sticker {
    file_id: string;
    file_unique_id: string;
    type: 'regular' | 'mask' | 'custom_emoji';
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    thumbnail?: PhotoSize;
    emoji?: string;
    set_name?: string;
    premium_animation?: any;
    mask_position?: any;
    custom_emoji_id?: string;
    needs_repainting?: boolean;
    file_size?: number;
}

export interface VideoNote {
    file_id: string;
    file_unique_id: string;
    length: number;
    duration: number;
    thumbnail?: PhotoSize;
    file_size?: number;
}

export interface Dice {
    emoji: string;
    value: number;
}

export interface Venue {
    location: Location;
    title: string;
    address: string;
    foursquare_id?: string;
    foursquare_type?: string;
    google_place_id?: string;
    google_place_type?: string;
}

export interface PollOption {
    text: string;
    text_entities?: MessageEntity[];
    voter_count: number;
}

export interface Poll {
    id: string;
    question: string;
    question_entities?: MessageEntity[];
    options: PollOption[];
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: 'regular' | 'quiz';
    allows_multiple_answers: boolean;
    correct_option_ids?: number[];
    explanation?: string;
    explanation_entities?: MessageEntity[];
    open_period?: number;
    close_date?: number;
    allows_revoting?: boolean;
}

export interface Game {
    title: string;
    description: string;
    photo: PhotoSize[];
    text?: string;
    text_entities?: MessageEntity[];
    animation?: Animation;
}

export interface WebAppData {
    data: string;
    button_text: string;
}

export interface InlineKeyboardButton {
    text: string;
    url?: string;
    callback_data?: string;
    web_app?: { url: string };
    login_url?: any;
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    switch_inline_query_chosen_chat?: any;
    callback_game?: any;
    pay?: boolean;
    icon_custom_emoji_id?: string;
    style?: string;
}

export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
}

export interface ChatPermissions {
    can_send_messages?: boolean;
    can_send_audios?: boolean;
    can_send_documents?: boolean;
    can_send_photos?: boolean;
    can_send_videos?: boolean;
    can_send_video_notes?: boolean;
    can_send_voice_notes?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    can_edit_tag?: boolean;
}

export interface ChatMemberUpdated {
    chat: Chat;
    from: User;
    date: number;
    old_chat_member: any;
    new_chat_member: any;
    invite_link?: any;
    via_join_request?: boolean;
    via_chat_folder_invite_link?: boolean;
}

export interface ChatJoinRequest {
    chat: Chat;
    from: User;
    user_chat_id: number;
    date: number;
    bio?: string;
    invite_link?: any;
}

export interface ShippingQuery {
    id: string;
    from: User;
    invoice_payload: string;
    shipping_address: any;
}

export interface PreCheckoutQuery {
    id: string;
    from: User;
    currency: string;
    total_amount: number;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: any;
}

export interface ChatBoostUpdated {
    chat: Chat;
    boost: any;
}

export interface ChatBoostRemoved {
    chat: Chat;
    boost_id: string;
    remove_date: number;
    source: any;
}

export interface Contact {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
    vcard?: string;
}

export interface Location {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
    live_period?: number;
    heading?: number;
    proximity_alert_radius?: number;
}

export interface Message {
    message_id: number;
    message_thread_id?: number;
    from?: User;
    sender_chat?: Chat;
    date: number;
    chat: Chat;
    forward_from?: User;
    forward_from_chat?: Chat;
    forward_from_message_id?: number;
    forward_signature?: string;
    forward_sender_name?: string;
    forward_date?: number;
    is_topic_message?: boolean;
    is_automatic_forward?: boolean;
    reply_to_message?: Message;
    via_bot?: User;
    edit_date?: number;
    has_protected_content?: boolean;
    media_group_id?: string;
    author_signature?: string;
    
    // Text & Entities
    text?: string;
    entities?: MessageEntity[];
    animation?: Animation;
    audio?: Audio;
    document?: Document;
    photo?: PhotoSize[];
    sticker?: Sticker;
    video?: Video;
    video_note?: VideoNote;
    voice?: Voice;
    caption?: string;
    caption_entities?: MessageEntity[];
    has_media_spoiler?: boolean;

    // Extra Media
    contact?: Contact;
    dice?: Dice;
    game?: Game;
    poll?: Poll;
    venue?: Venue;
    location?: Location;
    
    // Chat Membership Changes
    new_chat_members?: User[];
    left_chat_member?: User;
    new_chat_title?: string;
    new_chat_photo?: PhotoSize[];
    delete_chat_photo?: boolean;
    group_chat_created?: boolean;
    supergroup_chat_created?: boolean;
    channel_chat_created?: boolean;
    message_auto_delete_timer_changed?: any;
    migrate_to_chat_id?: number;
    migrate_from_chat_id?: number;
    pinned_message?: Message;
    invoice?: any;
    successful_payment?: any;
    refunded_payment?: any;
    user_shared?: any;
    users_shared?: any;
    chat_shared?: any;
    connected_website?: string;
    write_access_allowed?: WebAppData;
    passport_data?: any;
    proximity_alert_triggered?: any;
    chat_boost_added?: any;
    chat_background?: any;
    forum_topic_created?: any;
    forum_topic_edited?: any;
    forum_topic_closed?: any;
    forum_topic_reopened?: any;
    general_forum_topic_hidden?: any;
    general_forum_topic_unhidden?: any;
    giveaway_created?: any;
    giveaway?: any;
    giveaway_winners?: any;
    giveaway_completed?: any;
    managed_bot_created?: any;
    video_chat_scheduled?: any;
    video_chat_started?: any;
    video_chat_ended?: any;
    video_chat_participants_invited?: any;
    web_app_data?: WebAppData;
    reply_markup?: InlineKeyboardMarkup;
    sender_tag?: string;
}

export interface CallbackQuery {
    id: string;
    from: User;
    message?: Message;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
    game_short_name?: string;
}

export interface InlineQuery {
    id: string;
    from: User;
    query: string;
    offset: string;
    chat_type?: string;
    location?: Location;
}

export interface Update {
    update_id: number;
    message?: Message;
    edited_message?: Message;
    channel_post?: Message;
    edited_channel_post?: Message;
    inline_query?: InlineQuery;
    chosen_inline_result?: any;
    callback_query?: CallbackQuery;
    shipping_query?: ShippingQuery;
    pre_checkout_query?: PreCheckoutQuery;
    poll?: Poll;
    poll_answer?: any;
    my_chat_member?: ChatMemberUpdated;
    chat_member?: ChatMemberUpdated;
    chat_join_request?: ChatJoinRequest;
    chat_boost?: ChatBoostUpdated;
    removed_chat_boost?: ChatBoostRemoved;
    
    // Telegram modern economy & Business updates (2024-2025)
    message_reaction?: any;
    message_reaction_count?: any;
    business_connection?: any;
    business_message?: Message;
    edited_business_message?: Message;
    deleted_business_messages?: any;
    purchased_paid_media?: any;
    
    // API 9.6 Managed Bots Notifications (2026)
    managed_bot_created?: any;
    managed_bot_updated?: any;
}

// ------------------------------------------------------------------------
// VIBEGRAM EXTRA OPTIONS (Typed extra parameters for outgoing API methods)
// ------------------------------------------------------------------------

/** Typed reply_parameters for threading a reply to a specific message. */
export interface ReplyParameters {
    message_id: number;
    chat_id?: number | string;
    allow_sending_without_reply?: boolean;
    quote?: string;
    quote_parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    quote_entities?: MessageEntity[];
    quote_position?: number;
}

/** Union of all valid reply_markup types. */
export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;

export interface ReplyKeyboardMarkup {
    keyboard: KeyboardButton[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
    is_persistent?: boolean;
}

export interface KeyboardButton {
    text: string;
    request_contact?: boolean;
    request_location?: boolean;
    request_poll?: { type?: 'quiz' | 'regular' };
    web_app?: { url: string };
    request_user?: any;
    request_chat?: any;
    request_managed_bot?: any;
}

export interface ReplyKeyboardRemove {
    remove_keyboard: true;
    selective?: boolean;
}

export interface ForceReply {
    force_reply: true;
    input_field_placeholder?: string;
    selective?: boolean;
}

export interface ExtraReplyMessage {
    business_connection_id?: string;
    message_thread_id?: number;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    entities?: MessageEntity[];
    link_preview_options?: { is_disabled?: boolean; url?: string; prefer_small_media?: boolean; prefer_large_media?: boolean; show_above_text?: boolean };
    disable_notification?: boolean;
    protect_content?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    reply_markup?: ReplyMarkup;
}

export interface ExtraMedia {
    business_connection_id?: string;
    message_thread_id?: number;
    caption?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    caption_entities?: MessageEntity[];
    show_caption_above_media?: boolean;
    has_spoiler?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    reply_markup?: ReplyMarkup;
}

export interface ExtraEditMessage {
    business_connection_id?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    entities?: MessageEntity[];
    link_preview_options?: { is_disabled?: boolean; url?: string };
    reply_markup?: InlineKeyboardMarkup;
}

/** Extra parameters for sendPoll / sendQuiz */
export interface ExtraPoll {
    business_connection_id?: string;
    message_thread_id?: number;
    question_parse_mode?: string;
    question_entities?: MessageEntity[];
    is_anonymous?: boolean;
    type?: 'regular' | 'quiz';
    allows_multiple_answers?: boolean;
    correct_option_id?: number;
    explanation?: string;
    explanation_parse_mode?: string;
    explanation_entities?: MessageEntity[];
    open_period?: number;
    close_date?: number;
    is_closed?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    reply_markup?: ReplyMarkup;
}

/** Extra parameters for banChatMember */
export interface ExtraBanMember {
    until_date?: number;
    revoke_messages?: boolean;
}

/** Extra parameters for restrictChatMember */
export interface ExtraRestrictMember {
    use_independent_chat_permissions?: boolean;
    until_date?: number;
}

/** Extra parameters for promoteChatMember */
export interface ExtraPromoteMember {
    is_anonymous?: boolean;
    can_manage_chat?: boolean;
    can_delete_messages?: boolean;
    can_manage_video_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
}

/** Extra parameters for createChatInviteLink / editChatInviteLink */
export interface ExtraInviteLink {
    name?: string;
    expire_date?: number;
    member_limit?: number;
    creates_join_request?: boolean;
}
