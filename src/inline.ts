/**
 * Inline Query result builder — simplifies constructing InlineQueryResult arrays.
 */

function assertNonEmptyString(name: string, value: unknown): asserts value is string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new TypeError(`Inline option "${name}" must be a non-empty string.`);
    }
}

function assertHttpUrl(name: string, value: unknown): void {
    assertNonEmptyString(name, value);

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new TypeError(`Inline option "${name}" must be a valid HTTP or HTTPS URL.`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new TypeError(`Inline option "${name}" must be a valid HTTP or HTTPS URL.`);
    }
}

function assertOptionalHttpUrl(name: string, value: unknown): void {
    if (value !== undefined) {
        assertHttpUrl(name, value);
    }
}

function assertOptionalNonNegativeNumber(name: string, value: unknown): void {
    if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    ) {
        throw new TypeError(`Inline option "${name}" must be a non-negative number.`);
    }
}

function assertReplyMarkup(value: unknown): void {
    if (
        value !== undefined &&
        (typeof value !== 'object' || value === null || Array.isArray(value))
    ) {
        throw new TypeError('Inline option "reply_markup" must be an object.');
    }
}

function assertLocation(latitude: unknown, longitude: unknown): void {
    if (
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new TypeError('Inline option "latitude" must be between -90 and 90.');
    }

    if (
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new TypeError('Inline option "longitude" must be between -180 and 180.');
    }
}

export interface InlineArticleOptions {
    id: string;
    title: string;
    text: string;
    description?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    url?: string;
    thumbnail_url?: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
    reply_markup?: any;
}

export interface InlinePhotoOptions {
    id: string;
    url: string;
    thumbnail_url?: string;
    title?: string;
    description?: string;
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    photo_width?: number;
    photo_height?: number;
    reply_markup?: any;
}

export interface InlineDocumentOptions {
    id: string;
    title: string;
    document_url: string;
    mime_type: string;
    description?: string;
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    thumbnail_url?: string;
    reply_markup?: any;
}

export interface InlineVideoOptions {
    id: string;
    title: string;
    video_url: string;
    mime_type: string;
    thumbnail_url: string;
    description?: string;
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    video_width?: number;
    video_height?: number;
    video_duration?: number;
    reply_markup?: any;
}

export interface InlineGifOptions {
    id: string;
    gif_url: string;
    thumbnail_url?: string;
    gif_width?: number;
    gif_height?: number;
    gif_duration?: number;
    title?: string;
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: any;
}

export interface InlineVoiceOptions {
    id: string;
    title: string;
    voice_url: string;
    voice_duration?: number;
    caption?: string;
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_markup?: any;
}

export interface InlineLocationOptions {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    thumbnail_url?: string;
    thumbnail_width?: number;
    thumbnail_height?: number;
    reply_markup?: any;
}

export interface InlineVenueOptions extends InlineLocationOptions {
    address: string;
    foursquare_id?: string;
    foursquare_type?: string;
    google_place_id?: string;
    google_place_type?: string;
}

export interface InlineContactOptions {
    id: string;
    phone_number: string;
    first_name: string;
    last_name?: string;
    vcard?: string;
    thumbnail_url?: string;
    reply_markup?: any;
}

/**
 * Builder class for constructing inline query results.
 *
 * Usage:
 * ```typescript
 * const results = InlineResults.builder()
 *     .article({ id: '1', title: 'Hello', text: 'Hello World!' })
 *     .photo({ id: '2', url: 'https://example.com/photo.jpg' })
 *     .build();
 *
 * await ctx.answerInlineQuery(results);
 * ```
 */
export class InlineResults {
    private results: any[] = [];

    private constructor() {}

    /** Create a new builder instance */
    static builder(): InlineResults {
        return new InlineResults();
    }

    /** Add an article result */
    article(opts: InlineArticleOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertNonEmptyString('text', opts.text);
        assertOptionalHttpUrl('url', opts.url);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('thumbnail_width', opts.thumbnail_width);
        assertOptionalNonNegativeNumber('thumbnail_height', opts.thumbnail_height);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'article',
            id: opts.id,
            title: opts.title,
            description: opts.description,
            url: opts.url,
            thumbnail_url: opts.thumbnail_url,
            thumbnail_width: opts.thumbnail_width,
            thumbnail_height: opts.thumbnail_height,
            reply_markup: opts.reply_markup,
            input_message_content: {
                message_text: opts.text,
                parse_mode: opts.parse_mode,
            },
        });
        return this;
    }

    /** Add a photo result */
    photo(opts: InlinePhotoOptions): this {
        assertNonEmptyString('id', opts.id);
        assertHttpUrl('url', opts.url);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('photo_width', opts.photo_width);
        assertOptionalNonNegativeNumber('photo_height', opts.photo_height);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'photo',
            id: opts.id,
            photo_url: opts.url,
            thumbnail_url: opts.thumbnail_url || opts.url,
            photo_width: opts.photo_width,
            photo_height: opts.photo_height,
            title: opts.title,
            description: opts.description,
            caption: opts.caption,
            parse_mode: opts.parse_mode,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a document result */
    document(opts: InlineDocumentOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertHttpUrl('document_url', opts.document_url);
        assertNonEmptyString('mime_type', opts.mime_type);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'document',
            id: opts.id,
            title: opts.title,
            document_url: opts.document_url,
            mime_type: opts.mime_type,
            description: opts.description,
            caption: opts.caption,
            parse_mode: opts.parse_mode,
            thumbnail_url: opts.thumbnail_url,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a video result */
    video(opts: InlineVideoOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertHttpUrl('video_url', opts.video_url);
        assertNonEmptyString('mime_type', opts.mime_type);
        assertHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('video_width', opts.video_width);
        assertOptionalNonNegativeNumber('video_height', opts.video_height);
        assertOptionalNonNegativeNumber('video_duration', opts.video_duration);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'video',
            id: opts.id,
            title: opts.title,
            video_url: opts.video_url,
            mime_type: opts.mime_type,
            thumbnail_url: opts.thumbnail_url,
            description: opts.description,
            caption: opts.caption,
            parse_mode: opts.parse_mode,
            video_width: opts.video_width,
            video_height: opts.video_height,
            video_duration: opts.video_duration,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a GIF result */
    gif(opts: InlineGifOptions): this {
        assertNonEmptyString('id', opts.id);
        assertHttpUrl('gif_url', opts.gif_url);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('gif_width', opts.gif_width);
        assertOptionalNonNegativeNumber('gif_height', opts.gif_height);
        assertOptionalNonNegativeNumber('gif_duration', opts.gif_duration);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'gif',
            id: opts.id,
            gif_url: opts.gif_url,
            thumbnail_url: opts.thumbnail_url || opts.gif_url,
            gif_width: opts.gif_width,
            gif_height: opts.gif_height,
            gif_duration: opts.gif_duration,
            title: opts.title,
            caption: opts.caption,
            parse_mode: opts.parse_mode,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a voice result */
    voice(opts: InlineVoiceOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertHttpUrl('voice_url', opts.voice_url);
        assertOptionalNonNegativeNumber('voice_duration', opts.voice_duration);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'voice',
            id: opts.id,
            title: opts.title,
            voice_url: opts.voice_url,
            voice_duration: opts.voice_duration,
            caption: opts.caption,
            parse_mode: opts.parse_mode,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a location result */
    location(opts: InlineLocationOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertLocation(opts.latitude, opts.longitude);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('thumbnail_width', opts.thumbnail_width);
        assertOptionalNonNegativeNumber('thumbnail_height', opts.thumbnail_height);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'location',
            id: opts.id,
            title: opts.title,
            latitude: opts.latitude,
            longitude: opts.longitude,
            thumbnail_url: opts.thumbnail_url,
            thumbnail_width: opts.thumbnail_width,
            thumbnail_height: opts.thumbnail_height,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a venue result */
    venue(opts: InlineVenueOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('title', opts.title);
        assertNonEmptyString('address', opts.address);
        assertLocation(opts.latitude, opts.longitude);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertOptionalNonNegativeNumber('thumbnail_width', opts.thumbnail_width);
        assertOptionalNonNegativeNumber('thumbnail_height', opts.thumbnail_height);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'venue',
            id: opts.id,
            title: opts.title,
            latitude: opts.latitude,
            longitude: opts.longitude,
            address: opts.address,
            foursquare_id: opts.foursquare_id,
            foursquare_type: opts.foursquare_type,
            google_place_id: opts.google_place_id,
            google_place_type: opts.google_place_type,
            thumbnail_url: opts.thumbnail_url,
            thumbnail_width: opts.thumbnail_width,
            thumbnail_height: opts.thumbnail_height,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Add a contact result */
    contact(opts: InlineContactOptions): this {
        assertNonEmptyString('id', opts.id);
        assertNonEmptyString('phone_number', opts.phone_number);
        assertNonEmptyString('first_name', opts.first_name);
        assertOptionalHttpUrl('thumbnail_url', opts.thumbnail_url);
        assertReplyMarkup(opts.reply_markup);

        this.results.push({
            type: 'contact',
            id: opts.id,
            phone_number: opts.phone_number,
            first_name: opts.first_name,
            last_name: opts.last_name,
            vcard: opts.vcard,
            thumbnail_url: opts.thumbnail_url,
            reply_markup: opts.reply_markup,
        });
        return this;
    }

    /** Build and return the results array for answerInlineQuery */
    build(): any[] {
        return [...this.results];
    }

    /** Get the number of results added */
    get length(): number {
        return this.results.length;
    }
}
