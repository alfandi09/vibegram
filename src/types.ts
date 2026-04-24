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
    can_connect_to_business?: boolean;
    has_main_web_app?: boolean;
    has_topics_enabled?: boolean;
    allows_users_to_create_topics?: boolean;
}

export interface Birthdate {
    day: number;
    month: number;
    year?: number;
}

export interface BusinessIntro {
    title?: string;
    message?: string;
    sticker?: Sticker;
}

export interface BusinessLocation {
    address: string;
    location?: Location;
}

export interface BusinessOpeningHoursInterval {
    opening_minute: number;
    closing_minute: number;
}

export interface BusinessOpeningHours {
    time_zone_name: string;
    opening_hours: BusinessOpeningHoursInterval[];
}

export interface AcceptedGiftTypes {
    unlimited_gifts?: boolean;
    limited_gifts?: boolean;
    unique_gifts?: boolean;
    premium_subscription?: boolean;
    gifts_from_channels?: boolean;
}

export interface Chat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: boolean;
    photo?: ChatPhoto;
    active_usernames?: string[];
    available_reactions?: ReactionType[];
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
    permissions?: ChatPermissions;
    slow_mode_delay?: number;
    message_auto_delete_time?: number;
    has_protected_content?: boolean;
    sticker_set_name?: string;
    can_set_sticker_set?: boolean;
    linked_chat_id?: number;
    location?: ChatLocation;
    business_intro?: BusinessIntro;
    business_location?: BusinessLocation;
    business_opening_hours?: BusinessOpeningHours;
    personal_chat?: Chat;
    birthdate?: Birthdate;
    is_direct_messages?: boolean;
    accepted_gift_types?: AcceptedGiftTypes;
    can_send_paid_media?: boolean;
}

/** Full chat metadata returned by getChat. Chat remains permissive for backward compatibility. */
export interface ChatFullInfo extends Chat {
    max_reaction_count?: number;
    first_profile_audio?: Audio;
}

export interface MessageEntity {
    type:
        | 'mention'
        | 'hashtag'
        | 'cashtag'
        | 'bot_command'
        | 'url'
        | 'email'
        | 'phone_number'
        | 'bold'
        | 'italic'
        | 'underline'
        | 'strikethrough'
        | 'spoiler'
        | 'code'
        | 'pre'
        | 'text_link'
        | 'text_mention'
        | 'custom_emoji'
        | 'blockquote'
        | 'expandable_blockquote'
        | 'date_time';
    offset: number;
    length: number;
    url?: string;
    user?: User;
    language?: string;
    custom_emoji_id?: string;
}

export interface ReactionTypeEmoji {
    type: 'emoji';
    emoji: string;
}

export interface ReactionTypeCustomEmoji {
    type: 'custom_emoji';
    custom_emoji_id: string;
}

export interface ReactionTypePaid {
    type: 'paid';
}

export type ReactionType = ReactionTypeEmoji | ReactionTypeCustomEmoji | ReactionTypePaid;

export interface ReactionCount {
    type: ReactionType;
    total_count: number;
}

export interface DirectMessagesTopic {
    topic_id: number;
    user?: User;
}

export interface WriteAccessAllowed {
    web_app_name?: string;
    from_request?: boolean;
    from_attachment_menu?: boolean;
}

export interface MessageOrigin {
    type: string;
    date: number;
    sender_user?: User;
    sender_user_name?: string;
    sender_chat?: Chat;
    author_signature?: string;
    chat?: Chat;
    message_id?: number;
}

export interface MessageOriginUser extends MessageOrigin {
    type: 'user';
    sender_user: User;
}

export interface MessageOriginHiddenUser extends MessageOrigin {
    type: 'hidden_user';
    sender_user_name: string;
}

export interface MessageOriginChat extends MessageOrigin {
    type: 'chat';
    sender_chat: Chat;
    author_signature?: string;
}

export interface MessageOriginChannel extends MessageOrigin {
    type: 'channel';
    chat: Chat;
    message_id: number;
    author_signature?: string;
}

export interface TextQuote {
    text: string;
    entities?: MessageEntity[];
    position: number;
    is_manual?: boolean;
}

export interface Story {
    chat: Chat;
    id: number;
}

export interface ExternalReplyInfo {
    origin: MessageOrigin;
    chat?: Chat;
    message_id?: number;
    link_preview_options?: LinkPreviewOptions;
    animation?: Animation;
    audio?: Audio;
    document?: Document;
    paid_media?: PaidMediaInfo;
    photo?: PhotoSize[];
    sticker?: Sticker;
    story?: Story;
    video?: Video;
    video_note?: VideoNote;
    voice?: Voice;
    has_media_spoiler?: boolean;
    contact?: Contact;
    dice?: Dice;
    game?: Game;
    giveaway?: Giveaway;
    giveaway_winners?: GiveawayWinners;
    invoice?: Invoice;
    location?: Location;
    poll?: Poll;
    venue?: Venue;
}

export interface LinkPreviewOptions {
    is_disabled?: boolean;
    url?: string;
    prefer_small_media?: boolean;
    prefer_large_media?: boolean;
    show_above_text?: boolean;
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
    qualities?: VideoQuality[];
}

export interface VideoQuality {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
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
    premium_animation?: File;
    mask_position?: MaskPosition;
    custom_emoji_id?: string;
    needs_repainting?: boolean;
    file_size?: number;
}

export interface StickerSet {
    name: string;
    title: string;
    sticker_type: 'regular' | 'mask' | 'custom_emoji';
    stickers: Sticker[];
    thumbnail?: PhotoSize;
}

export interface VideoNote {
    file_id: string;
    file_unique_id: string;
    length: number;
    duration: number;
    thumbnail?: PhotoSize;
    file_size?: number;
}

export interface File {
    file_id: string;
    file_unique_id?: string;
    file_size?: number;
    file_path?: string;
}

export interface UserProfilePhotos {
    total_count: number;
    photos: PhotoSize[][];
}

export interface UserProfileAudios {
    total_count: number;
    audios: Audio[];
}

export interface MaskPosition {
    point: 'forehead' | 'eyes' | 'mouth' | 'chin';
    x_shift: number;
    y_shift: number;
    scale: number;
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
    persistent_id?: string;
    added_by_user?: User;
    added_by_chat?: Chat;
    addition_date?: number;
}

export interface InputPollOption {
    text: string;
    text_parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    text_entities?: MessageEntity[];
}

export interface Poll {
    id: string;
    question: string;
    question_entities?: MessageEntity[];
    description?: string;
    description_entities?: MessageEntity[];
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

export interface PollAnswer {
    poll_id: string;
    voter_chat?: Chat;
    user?: User;
    option_ids: number[];
    option_persistent_ids?: string[];
}

export interface ChecklistTask {
    id: number;
    text: string;
    text_entities?: MessageEntity[];
    completed_by_user?: User;
    completed_by_chat?: Chat;
    completion_date?: number;
}

export interface Checklist {
    title: string;
    title_entities?: MessageEntity[];
    tasks: ChecklistTask[];
    others_can_add_tasks?: true;
    others_can_mark_tasks_as_done?: true;
}

export interface InputChecklistTask {
    text: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    text_entities?: MessageEntity[];
}

export interface InputChecklist {
    title: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    title_entities?: MessageEntity[];
    tasks: InputChecklistTask[];
    others_can_add_tasks?: boolean;
    others_can_mark_tasks_as_done?: boolean;
}

export interface ChecklistTasksDone {
    checklist_message?: Message;
    marked_as_done_task_ids?: number[];
    marked_as_not_done_task_ids?: number[];
}

export interface ChecklistTasksAdded {
    checklist_message?: Message;
    tasks: ChecklistTask[];
}

export interface BusinessBotRights {
    can_reply?: true;
    can_read_messages?: true;
    can_delete_sent_messages?: true;
    can_delete_all_messages?: true;
    can_edit_name?: true;
    can_edit_bio?: true;
    can_edit_profile_photo?: true;
    can_edit_username?: true;
    can_change_gift_settings?: true;
    can_view_gifts_and_stars?: true;
    can_convert_gifts_to_stars?: true;
    can_transfer_and_upgrade_gifts?: true;
    can_transfer_stars?: true;
    can_manage_stories?: true;
}

export interface BusinessConnection {
    id: string;
    user: User;
    user_chat_id: number;
    date: number;
    rights?: BusinessBotRights;
    is_enabled: boolean;
}

export interface BusinessMessagesDeleted {
    business_connection_id: string;
    chat: Chat;
    message_ids: number[];
}

export interface MessageReactionUpdated {
    chat: Chat;
    message_id: number;
    user?: User;
    actor_chat?: Chat;
    date: number;
    old_reaction: ReactionType[];
    new_reaction: ReactionType[];
}

export interface MessageReactionCountUpdated {
    chat: Chat;
    message_id: number;
    date: number;
    reactions: ReactionCount[];
}

export interface PaidMediaPreview {
    type: 'preview';
    width?: number;
    height?: number;
    duration?: number;
}

export interface PaidMediaPhoto {
    type: 'photo';
    photo: PhotoSize[];
}

export interface PaidMediaVideo {
    type: 'video';
    video: Video;
}

export type PaidMedia = PaidMediaPreview | PaidMediaPhoto | PaidMediaVideo;

export interface PaidMediaInfo {
    star_count: number;
    paid_media: PaidMedia[];
}

export interface PaidMediaPurchased {
    from: User;
    paid_media_payload: string;
}

export interface ChosenInlineResult {
    result_id: string;
    from: User;
    location?: Location;
    inline_message_id?: string;
    query: string;
}

export interface SuggestedPostPrice {
    currency: string;
    amount: number;
}

export interface SuggestedPostInfo {
    state: 'pending' | 'approved' | 'declined' | string;
    price?: SuggestedPostPrice;
    send_date?: number;
}

export interface SuggestedPostParameters {
    price?: SuggestedPostPrice;
    send_date?: number;
}

export interface SuggestedPostApproved {
    suggested_post_message?: Message;
    price?: SuggestedPostPrice;
    send_date: number;
}

export interface SuggestedPostApprovalFailed {
    suggested_post_message?: Message;
    price: SuggestedPostPrice;
}

export interface SuggestedPostDeclined {
    suggested_post_message?: Message;
    comment?: string;
}

export interface SuggestedPostPaid {
    suggested_post_message?: Message;
    currency: 'XTR' | 'TON' | string;
    amount?: number;
    star_amount?: StarAmount;
}

export interface SuggestedPostRefunded {
    suggested_post_message?: Message;
    reason: 'post_deleted' | 'payment_refunded' | string;
}

export interface GiftBackground {
    background: string;
}

export interface UniqueGiftColors {
    model_custom_emoji_id: string;
    symbol_custom_emoji_id: string;
    light_theme_main_color: number;
    light_theme_other_colors: number[];
    dark_theme_main_color: number;
    dark_theme_other_colors: number[];
}

export interface Gift {
    gift_id: string;
    name?: string;
    sticker?: Sticker;
    star_count?: number;
    upgrade_star_count?: number;
    total_count?: number;
    remaining_count?: number;
    publisher_chat?: Chat;
    is_limited?: boolean;
    is_sold_out?: boolean;
    is_premium?: boolean;
    personal_total_count?: number;
    personal_remaining_count?: number;
    has_colors?: boolean;
    unique_gift_variant_count?: number;
}

export interface UniqueGift {
    gift_id: string;
    base_name: string;
    name: string;
    number: number;
    model: Record<string, unknown>;
    symbol: Record<string, unknown>;
    backdrop: Record<string, unknown>;
    is_premium?: boolean;
    is_burned?: boolean;
    is_from_blockchain?: boolean;
    colors?: UniqueGiftColors;
    publisher_chat?: Chat;
}

export interface GiftInfo {
    gift: Gift;
    owned_gift_id?: string;
    convert_star_count?: number;
    prepaid_upgrade_star_count?: number;
    can_be_upgraded?: boolean;
    text?: string;
    entities?: MessageEntity[];
    is_private?: boolean;
    is_saved?: boolean;
    sell_star_count?: number;
    transfer_star_count?: number;
    next_transfer_date?: number;
    was_refunded?: boolean;
    convert_star_count_before_upgrade?: number;
    prepaid_upgrade_star_count_before_upgrade?: number;
    is_upgrade_separate?: boolean;
    unique_gift_number?: number;
}

export interface UniqueGiftInfo {
    gift: UniqueGift;
    owned_gift_id?: string;
    transfer_star_count?: number;
    next_transfer_date?: number;
    last_resale_star_count?: number;
    last_resale_date?: number;
    last_resale_currency?: string;
    last_resale_amount?: number;
    owner_name?: string;
    is_saved?: boolean;
    can_be_transferred?: boolean;
    origin?: 'upgrade' | 'transfer' | 'gifted_upgrade' | 'offer' | string;
}

export interface OwnedGiftRegular extends GiftInfo {
    type: 'regular';
}

export interface OwnedGiftUnique extends UniqueGiftInfo {
    type: 'unique';
}

export type OwnedGift = OwnedGiftRegular | OwnedGiftUnique;

export interface OwnedGifts {
    total_count: number;
    gifts: OwnedGift[];
    next_offset?: string;
}

export interface Gifts {
    gifts: Gift[];
}

export interface PaidMessagePriceChanged {
    paid_message_star_count: number;
}

export interface DirectMessagePriceChanged {
    paid_message_star_count: number;
}

export interface PollOptionAdded {
    poll_message?: MaybeInaccessibleMessage;
    option: PollOption;
}

export interface PollOptionDeleted {
    poll_message?: MaybeInaccessibleMessage;
    option_persistent_id: string;
    option_text: string;
    option_text_entities?: MessageEntity[];
}

export type ChatOwnerLeft = Record<string, never>;

export interface ChatOwnerChanged {
    old_owner: User;
    new_owner: User;
}

export interface StarAmount {
    amount: number;
    nanostar_amount?: number;
}

export interface AffiliateInfo {
    affiliate_user?: User;
    affiliate_chat?: Chat;
    commission_per_mille: number;
    amount: number;
    nanostar_amount?: number;
}

export interface RevenueWithdrawalStatePending {
    type: 'pending';
}

export interface RevenueWithdrawalStateSucceeded {
    type: 'succeeded';
    date: number;
    url: string;
}

export interface RevenueWithdrawalStateFailed {
    type: 'failed';
}

export type RevenueWithdrawalState =
    | RevenueWithdrawalStatePending
    | RevenueWithdrawalStateSucceeded
    | RevenueWithdrawalStateFailed;

export interface TransactionPartnerUser {
    type: 'user';
    transaction_type?:
        | 'invoice_payment'
        | 'paid_media_payment'
        | 'gift_purchase'
        | 'premium_purchase'
        | 'business_account_transfer'
        | string;
    user: User;
    affiliate?: AffiliateInfo;
    invoice_payload?: string;
    subscription_period?: number;
    paid_media?: PaidMedia[];
    paid_media_payload?: string;
    gift?: Gift;
    premium_subscription_duration?: number;
}

export interface TransactionPartnerChat {
    type: 'chat';
    chat: Chat;
    gift?: Gift;
}

export interface TransactionPartnerAffiliateProgram {
    type: 'affiliate_program';
    sponsor_user?: User;
    commission_per_mille: number;
}

export interface TransactionPartnerFragment {
    type: 'fragment';
    withdrawal_state?: RevenueWithdrawalState;
}

export interface TransactionPartnerTelegramAds {
    type: 'telegram_ads';
}

export interface TransactionPartnerTelegramApi {
    type: 'telegram_api';
}

export interface TransactionPartnerOther {
    type: 'other';
}

export type TransactionPartner =
    | TransactionPartnerUser
    | TransactionPartnerChat
    | TransactionPartnerAffiliateProgram
    | TransactionPartnerFragment
    | TransactionPartnerTelegramAds
    | TransactionPartnerTelegramApi
    | TransactionPartnerOther;

export interface StarTransaction {
    id: string;
    amount: StarAmount;
    date: number;
    source?: TransactionPartner;
    receiver?: TransactionPartner;
}

export interface StarTransactions {
    transactions: StarTransaction[];
}

export interface ManagedBotCreated {
    bot: User;
}

export interface ManagedBotUpdated {
    user: User;
    bot: User;
}

export interface Game {
    title: string;
    description: string;
    photo: PhotoSize[];
    text?: string;
    text_entities?: MessageEntity[];
    animation?: Animation;
}

export interface LabeledPrice {
    label: string;
    amount: number;
}

export interface InlineQueryResult {
    type: string;
    id: string;
    [key: string]: unknown;
}

export interface SentWebAppMessage {
    inline_message_id?: string;
}

export interface GameHighScore {
    position: number;
    user: User;
    score: number;
}

export interface Invoice {
    title: string;
    description: string;
    start_parameter: string;
    currency: string;
    total_amount: number;
}

export interface SuccessfulPayment {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    subscription_expiration_date?: number;
    is_recurring?: true;
    is_first_recurring?: true;
    shipping_option_id?: string;
    order_info?: OrderInfo;
    telegram_payment_charge_id: string;
    provider_payment_charge_id: string;
}

export interface RefundedPayment {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    telegram_payment_charge_id: string;
    provider_payment_charge_id?: string;
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
    login_url?: LoginUrl;
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    switch_inline_query_chosen_chat?: SwitchInlineQueryChosenChat;
    callback_game?: CallbackGame;
    pay?: boolean;
    icon_custom_emoji_id?: string;
    style?: string;
}

export interface LoginUrl {
    url: string;
    forward_text?: string;
    bot_username?: string;
    request_write_access?: boolean;
}

export interface SwitchInlineQueryChosenChat {
    query?: string;
    allow_user_chats?: boolean;
    allow_bot_chats?: boolean;
    allow_group_chats?: boolean;
    allow_channel_chats?: boolean;
}

export type CallbackGame = Record<string, never>;

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

export interface ChatInviteLink {
    invite_link: string;
    creator: User;
    creates_join_request: boolean;
    is_primary: boolean;
    is_revoked: boolean;
    name?: string;
    expire_date?: number;
    member_limit?: number;
    pending_join_request_count?: number;
    subscription_period?: number;
    subscription_price?: number;
}

export interface WebhookInfo {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    ip_address?: string;
    last_error_date?: number;
    last_error_message?: string;
    last_synchronization_error_date?: number;
    max_connections?: number;
    allowed_updates?: string[];
}

export interface BotCommand {
    command: string;
    description: string;
}

export interface BotCommandScope {
    type:
        | 'default'
        | 'all_private_chats'
        | 'all_group_chats'
        | 'all_chat_administrators'
        | 'chat'
        | 'chat_administrators'
        | 'chat_member';
    chat_id?: number | string;
    user_id?: number;
}

export interface BotCommandOptions {
    scope?: BotCommandScope;
    language_code?: string;
}

export interface BotName {
    name: string;
}

export interface BotDescription {
    description: string;
}

export interface BotShortDescription {
    short_description: string;
}

export interface MenuButton {
    type: 'commands' | 'web_app' | 'default' | string;
    text?: string;
    web_app?: { url: string };
}

export interface SetWebhookOptions {
    certificate?: InputFile;
    ip_address?: string;
    max_connections?: number;
    allowed_updates?: string[];
    drop_pending_updates?: boolean;
    secret_token?: string;
}

export interface ChatMember {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
    user: User;
    is_anonymous?: boolean;
    custom_title?: string;
    can_be_edited?: boolean;
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
    can_manage_direct_messages?: boolean;
    can_manage_tags?: boolean;
    until_date?: number;
    is_member?: boolean;
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
    tag?: string;
}

export interface ChatAdministratorRights {
    is_anonymous: boolean;
    can_manage_chat: boolean;
    can_delete_messages: boolean;
    can_manage_video_chats: boolean;
    can_restrict_members: boolean;
    can_promote_members: boolean;
    can_change_info: boolean;
    can_invite_users: boolean;
    can_post_stories: boolean;
    can_edit_stories: boolean;
    can_delete_stories: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    can_manage_direct_messages?: boolean;
    can_manage_tags?: boolean;
}

export interface ChatMemberUpdated {
    chat: Chat;
    from: User;
    date: number;
    old_chat_member: ChatMember;
    new_chat_member: ChatMember;
    invite_link?: ChatInviteLink;
    via_join_request?: boolean;
    via_chat_folder_invite_link?: boolean;
}

export interface ChatJoinRequest {
    chat: Chat;
    from: User;
    user_chat_id: number;
    date: number;
    bio?: string;
    invite_link?: ChatInviteLink;
}

export interface ShippingQuery {
    id: string;
    from: User;
    invoice_payload: string;
    shipping_address: ShippingAddress;
}

export interface PreCheckoutQuery {
    id: string;
    from: User;
    currency: string;
    total_amount: number;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: OrderInfo;
}

export interface ChatBoostUpdated {
    chat: Chat;
    boost: ChatBoost;
}

export interface ChatBoostRemoved {
    chat: Chat;
    boost_id: string;
    remove_date: number;
    source: ChatBoostSource;
}

export interface ChatBoost {
    boost_id: string;
    add_date: number;
    expiration_date: number;
    source: ChatBoostSource;
}

export interface ChatBoostSourcePremium {
    source: 'premium';
    user: User;
}

export interface ChatBoostSourceGiftCode {
    source: 'gift_code';
    user: User;
}

export interface ChatBoostSourceGiveaway {
    source: 'giveaway';
    giveaway_message_id?: number;
    user?: User;
    prize_star_count?: number;
    is_unclaimed?: true;
}

export type ChatBoostSource =
    | ChatBoostSourcePremium
    | ChatBoostSourceGiftCode
    | ChatBoostSourceGiveaway;

export interface ProximityAlertTriggered {
    traveler: User;
    watcher: User;
    distance: number;
}

export interface ChatBoostAdded {
    boost_count: number;
}

export interface MessageAutoDeleteTimerChanged {
    message_auto_delete_time: number;
}

export interface ForumTopicCreated {
    name: string;
    icon_color: number;
    icon_custom_emoji_id?: string;
    is_name_implicit?: true;
}

export interface ForumTopicEdited {
    name?: string;
    icon_custom_emoji_id?: string;
    is_name_implicit?: true;
}

export type ForumTopicClosed = Record<string, never>;

export type ForumTopicReopened = Record<string, never>;

export type GeneralForumTopicHidden = Record<string, never>;

export type GeneralForumTopicUnhidden = Record<string, never>;

export interface SharedUser {
    user_id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo?: PhotoSize[];
}

export interface UsersShared {
    request_id: number;
    users: SharedUser[];
}

export interface ChatShared {
    request_id: number;
    chat_id: number;
    title?: string;
    username?: string;
    photo?: PhotoSize[];
}

export interface VideoChatScheduled {
    start_date: number;
}

export type VideoChatStarted = Record<string, never>;

export interface VideoChatEnded {
    duration: number;
}

export interface VideoChatParticipantsInvited {
    users: User[];
}

export interface GiveawayCreated {
    prize_star_count?: number;
}

export interface Giveaway {
    chats: Chat[];
    winners_selection_date: number;
    winner_count: number;
    only_new_members?: true;
    has_public_winners?: true;
    prize_description?: string;
    country_codes?: string[];
    prize_star_count?: number;
    premium_subscription_month_count?: number;
}

export interface GiveawayWinners {
    chat: Chat;
    giveaway_message_id: number;
    winners_selection_date: number;
    winner_count: number;
    winners: User[];
    additional_chat_count?: number;
    prize_star_count?: number;
    premium_subscription_month_count?: number;
    unclaimed_prize_count?: number;
    only_new_members?: true;
    was_refunded?: true;
    prize_description?: string;
}

export interface GiveawayCompleted {
    winner_count: number;
    unclaimed_prize_count?: number;
    giveaway_message?: Message;
    is_star_giveaway?: true;
}

export interface ChatBackground {
    type?: string;
    [key: string]: unknown;
}

export interface Contact {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
    vcard?: string;
}

export interface ShippingAddress {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
}

export interface OrderInfo {
    name?: string;
    phone_number?: string;
    email?: string;
    shipping_address?: ShippingAddress;
}

export interface ChatPhoto {
    small_file_id: string;
    small_file_unique_id: string;
    big_file_id: string;
    big_file_unique_id: string;
}

export interface ChatLocation {
    location: Location;
    address: string;
}

export interface Location {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
    live_period?: number;
    heading?: number;
    proximity_alert_radius?: number;
}

export interface MaybeInaccessibleMessage {
    chat: Chat;
    message_id: number;
    date?: number;
    is_inaccessible?: boolean;
}

export interface InaccessibleMessage extends MaybeInaccessibleMessage {
    date: 0;
    is_inaccessible: true;
}

export interface Message {
    message_id: number;
    message_thread_id?: number;
    direct_messages_topic?: DirectMessagesTopic;
    from?: User;
    sender_chat?: Chat;
    sender_boost_count?: number;
    sender_business_bot?: User;
    date: number;
    business_connection_id?: string;
    chat: Chat;
    forward_origin?: MessageOrigin;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_from?: User;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_from_chat?: Chat;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_from_message_id?: number;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_signature?: string;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_sender_name?: string;
    /** @deprecated Bot API 7.0 replaced this with forward_origin. */
    forward_date?: number;
    is_topic_message?: boolean;
    is_automatic_forward?: boolean;
    reply_to_message?: Message;
    external_reply?: ExternalReplyInfo;
    quote?: TextQuote;
    reply_to_story?: Story;
    reply_to_checklist_task_id?: number;
    reply_to_poll_option_id?: string;
    via_bot?: User;
    edit_date?: number;
    has_protected_content?: boolean;
    is_from_offline?: boolean;
    is_paid_post?: boolean;
    media_group_id?: string;
    author_signature?: string;
    paid_star_count?: number;
    effect_id?: string;
    suggested_post_info?: SuggestedPostInfo;

    // Text & Entities
    text?: string;
    entities?: MessageEntity[];
    animation?: Animation;
    audio?: Audio;
    document?: Document;
    paid_media?: PaidMediaInfo;
    photo?: PhotoSize[];
    sticker?: Sticker;
    story?: Story;
    video?: Video;
    video_note?: VideoNote;
    voice?: Voice;
    caption?: string;
    caption_entities?: MessageEntity[];
    show_caption_above_media?: true;
    has_media_spoiler?: boolean;
    checklist?: Checklist;

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
    message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
    migrate_to_chat_id?: number;
    migrate_from_chat_id?: number;
    pinned_message?: Message;
    invoice?: Invoice;
    successful_payment?: SuccessfulPayment;
    refunded_payment?: RefundedPayment;
    user_shared?: SharedUser;
    users_shared?: UsersShared;
    chat_shared?: ChatShared;
    connected_website?: string;
    write_access_allowed?: WriteAccessAllowed;
    passport_data?: any;
    proximity_alert_triggered?: ProximityAlertTriggered;
    boost_added?: ChatBoostAdded;
    chat_background_set?: ChatBackground;
    forum_topic_created?: ForumTopicCreated;
    forum_topic_edited?: ForumTopicEdited;
    forum_topic_closed?: ForumTopicClosed;
    forum_topic_reopened?: ForumTopicReopened;
    general_forum_topic_hidden?: GeneralForumTopicHidden;
    general_forum_topic_unhidden?: GeneralForumTopicUnhidden;
    giveaway_created?: GiveawayCreated;
    giveaway?: Giveaway;
    giveaway_winners?: GiveawayWinners;
    giveaway_completed?: GiveawayCompleted;
    managed_bot_created?: ManagedBotCreated;
    checklist_tasks_done?: ChecklistTasksDone;
    checklist_tasks_added?: ChecklistTasksAdded;
    direct_message_price_changed?: DirectMessagePriceChanged;
    paid_message_price_changed?: PaidMessagePriceChanged;
    poll_option_added?: PollOptionAdded;
    poll_option_deleted?: PollOptionDeleted;
    chat_owner_left?: ChatOwnerLeft;
    chat_owner_changed?: ChatOwnerChanged;
    gift?: GiftInfo;
    unique_gift?: UniqueGiftInfo;
    gift_upgrade_sent?: GiftInfo;
    suggested_post_approved?: SuggestedPostApproved;
    suggested_post_approval_failed?: SuggestedPostApprovalFailed;
    suggested_post_declined?: SuggestedPostDeclined;
    suggested_post_paid?: SuggestedPostPaid;
    suggested_post_refunded?: SuggestedPostRefunded;
    video_chat_scheduled?: VideoChatScheduled;
    video_chat_started?: VideoChatStarted;
    video_chat_ended?: VideoChatEnded;
    video_chat_participants_invited?: VideoChatParticipantsInvited;
    web_app_data?: WebAppData;
    reply_markup?: InlineKeyboardMarkup;
    sender_tag?: string;
    link_preview_options?: LinkPreviewOptions;
}

export interface CallbackQuery {
    id: string;
    from: User;
    message?: Message | MaybeInaccessibleMessage;
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
    chosen_inline_result?: ChosenInlineResult;
    callback_query?: CallbackQuery;
    shipping_query?: ShippingQuery;
    pre_checkout_query?: PreCheckoutQuery;
    poll?: Poll;
    poll_answer?: PollAnswer;
    my_chat_member?: ChatMemberUpdated;
    chat_member?: ChatMemberUpdated;
    chat_join_request?: ChatJoinRequest;
    chat_boost?: ChatBoostUpdated;
    removed_chat_boost?: ChatBoostRemoved;

    // Telegram modern economy & Business updates (2024-2025)
    message_reaction?: MessageReactionUpdated;
    message_reaction_count?: MessageReactionCountUpdated;
    business_connection?: BusinessConnection;
    business_message?: Message;
    edited_business_message?: Message;
    deleted_business_messages?: BusinessMessagesDeleted;
    purchased_paid_media?: PaidMediaPurchased;

    // API 9.6 Managed Bots Notifications (2026)
    managed_bot?: ManagedBotUpdated;
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
    checklist_task_id?: number;
    poll_option_id?: string;
}

/** Union of all valid reply_markup types. */
export type ReplyMarkup =
    | InlineKeyboardMarkup
    | ReplyKeyboardMarkup
    | ReplyKeyboardRemove
    | ForceReply;

export type InputFile = string | Buffer | NodeJS.ReadableStream;

export interface InputProfilePhotoStatic {
    type: 'static';
    photo: InputFile;
}

export interface InputProfilePhotoAnimated {
    type: 'animated';
    animation: InputFile;
    main_frame_timestamp?: number;
}

export type InputProfilePhoto = InputProfilePhotoStatic | InputProfilePhotoAnimated;

export interface PreparedKeyboardButton {
    text: string;
    request_user?: KeyboardButtonRequestUser;
    request_chat?: KeyboardButtonRequestChat;
    request_managed_bot?: KeyboardButtonRequestManagedBot;
}

export interface InputSticker {
    sticker: InputFile;
    emoji_list: string[];
    format: 'static' | 'animated' | 'video';
    mask_position?: MaskPosition;
    keywords?: string[];
}

export interface PassportElementError {
    source: string;
    type: string;
    message: string;
    [key: string]: unknown;
}

export interface InputMediaBase {
    type: string;
    media: InputFile;
    caption?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    caption_entities?: MessageEntity[];
    show_caption_above_media?: boolean;
    has_spoiler?: boolean;
}

export interface InputMediaPhoto extends InputMediaBase {
    type: 'photo';
}

export interface InputMediaVideo extends InputMediaBase {
    type: 'video';
    thumbnail?: InputFile;
    cover?: InputFile;
    start_timestamp?: number;
    width?: number;
    height?: number;
    duration?: number;
    supports_streaming?: boolean;
}

export interface InputMediaAnimation extends InputMediaBase {
    type: 'animation';
    thumbnail?: InputFile;
    width?: number;
    height?: number;
    duration?: number;
}

export interface InputMediaDocument extends InputMediaBase {
    type: 'document';
    thumbnail?: InputFile;
    disable_content_type_detection?: boolean;
}

export interface InputMediaAudio extends InputMediaBase {
    type: 'audio';
    thumbnail?: InputFile;
    duration?: number;
    performer?: string;
    title?: string;
}

export type InputMedia =
    | InputMediaPhoto
    | InputMediaVideo
    | InputMediaAnimation
    | InputMediaDocument
    | InputMediaAudio;

export interface ExtraVideoNote {
    business_connection_id?: string;
    message_thread_id?: number;
    direct_messages_topic_id?: number;
    duration?: number;
    length?: number;
    thumbnail?: InputFile;
    disable_notification?: boolean;
    protect_content?: boolean;
    allow_paid_broadcast?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    suggested_post_parameters?: SuggestedPostParameters;
    reply_markup?: ReplyMarkup;
}

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
    request_user?: KeyboardButtonRequestUser;
    request_chat?: KeyboardButtonRequestChat;
    request_managed_bot?: KeyboardButtonRequestManagedBot;
    icon_custom_emoji_id?: string;
    style?: string;
}

export interface KeyboardButtonRequestUser {
    request_id: number;
    user_is_bot?: boolean;
    user_is_premium?: boolean;
    request_name?: boolean;
    request_username?: boolean;
    request_photo?: boolean;
}

export interface KeyboardButtonRequestChat {
    request_id: number;
    chat_is_channel: boolean;
    chat_is_forum?: boolean;
    chat_has_username?: boolean;
    chat_is_created?: boolean;
    user_administrator_rights?: Record<string, boolean>;
    bot_administrator_rights?: Record<string, boolean>;
    bot_is_member?: boolean;
    request_title?: boolean;
    request_username?: boolean;
    request_photo?: boolean;
}

export interface KeyboardButtonRequestManagedBot {
    request_id: number;
    suggested_name?: string;
    suggested_username?: string;
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
    direct_messages_topic_id?: number;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    entities?: MessageEntity[];
    link_preview_options?: LinkPreviewOptions;
    disable_notification?: boolean;
    protect_content?: boolean;
    allow_paid_broadcast?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    suggested_post_parameters?: SuggestedPostParameters;
    reply_markup?: ReplyMarkup;
}

export interface ExtraMedia {
    business_connection_id?: string;
    message_thread_id?: number;
    direct_messages_topic_id?: number;
    caption?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    caption_entities?: MessageEntity[];
    show_caption_above_media?: boolean;
    has_spoiler?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    allow_paid_broadcast?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    suggested_post_parameters?: SuggestedPostParameters;
    reply_markup?: ReplyMarkup;
}

export interface ExtraEditMessage {
    business_connection_id?: string;
    parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML' | string;
    entities?: MessageEntity[];
    link_preview_options?: LinkPreviewOptions;
    reply_markup?: InlineKeyboardMarkup;
}

/** Extra parameters for sendPoll / sendQuiz */
export interface ExtraPoll {
    business_connection_id?: string;
    message_thread_id?: number;
    direct_messages_topic_id?: number;
    question_parse_mode?: string;
    question_entities?: MessageEntity[];
    question?: string;
    is_anonymous?: boolean;
    type?: 'regular' | 'quiz';
    allows_multiple_answers?: boolean;
    /** @deprecated Use correct_option_ids instead. */
    correct_option_id?: number;
    correct_option_ids?: number[];
    explanation?: string;
    explanation_parse_mode?: string;
    explanation_entities?: MessageEntity[];
    description?: string;
    description_parse_mode?: string;
    description_entities?: MessageEntity[];
    shuffle_options?: boolean;
    allow_adding_options?: boolean;
    hide_results_until_closes?: boolean;
    /** @deprecated Use hide_results_until_closes instead. */
    hide_results_until_closed?: boolean;
    open_period?: number;
    close_date?: number;
    is_closed?: boolean;
    allows_revoting?: boolean;
    disable_notification?: boolean;
    protect_content?: boolean;
    allow_paid_broadcast?: boolean;
    message_effect_id?: string;
    reply_parameters?: ReplyParameters;
    suggested_post_parameters?: SuggestedPostParameters;
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
    can_manage_direct_messages?: boolean;
    can_manage_tags?: boolean;
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
