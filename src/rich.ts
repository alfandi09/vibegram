import type {
    InputMediaAnimation,
    InputMediaAudio,
    InputMediaDocument,
    InputMediaPhoto,
    InputMediaVideo,
    InputMediaVoiceNote,
    InputRichBlock,
    InputRichBlockListItem,
    InputRichMessage,
    Location,
    RichBlockCaption,
    RichBlockTableCell,
    RichMessageButton,
    RichText,
    RichTextBold,
    RichTextButton,
    RichTextCode,
    RichTextCustomEmoji,
    RichTextItalic,
    RichTextMention,
    RichTextSpoiler,
    RichTextStrikethrough,
    RichTextUnderline,
    RichTextUrl,
    User,
} from './types';

/**
 * Fluent builder for block-based rich messages (Bot API 10.2+), plus inline
 * text helpers. Produces a plain `InputRichMessage` for `sendRichMessage()` /
 * `ctx.replyWithRichMessage()`.
 *
 * ```typescript
 * import { Rich } from 'vibegram';
 *
 * await ctx.replyWithRichMessage(
 *     Rich.message()
 *         .heading('Release 3.0', 1)
 *         .paragraph(['Now with ', Rich.bold('rich'), ' messages. ', Rich.link('Docs', url)])
 *         .list(['Faster', 'Smaller', 'Typed'])
 *         .table([['Plan', 'Price'], ['Pro', '$5']], { header: true, compact: true })
 *         .buttons([{ text: 'Open', url }])
 *         .build()
 * );
 * ```
 */

type ListItemInput = RichText | InputRichBlock[];

export interface RichTableOptions {
    /** Treat the first row as header cells. */
    header?: boolean;
    bordered?: boolean;
    striped?: boolean;
    compact?: boolean;
    caption?: RichText;
}

function isBlockArray(value: ListItemInput): value is InputRichBlock[] {
    return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(
            item =>
                typeof item === 'object' &&
                item !== null &&
                !Array.isArray(item) &&
                'type' in item &&
                BLOCK_TYPES.has((item as { type: string }).type)
        )
    );
}

const BLOCK_TYPES = new Set<string>([
    'paragraph',
    'heading',
    'pre',
    'footer',
    'divider',
    'mathematical_expression',
    'anchor',
    'list',
    'blockquote',
    'expandable_blockquote',
    'pullquote',
    'collage',
    'slideshow',
    'table',
    'details',
    'map',
    'buttons',
    'animation',
    'audio',
    'document',
    'photo',
    'video',
    'voice_note',
    'thinking',
]);

function toListItem(
    item: ListItemInput,
    extra?: Partial<InputRichBlockListItem>
): InputRichBlockListItem {
    return {
        blocks: isBlockArray(item) ? item : [{ type: 'paragraph', text: item }],
        ...extra,
    };
}

function caption(text?: RichText, credit?: RichText): RichBlockCaption | undefined {
    if (text === undefined) return undefined;
    return credit === undefined ? { text } : { text, credit };
}

/** Builder for one rich message. Each method appends a block and returns the builder. */
export class RichMessageBuilder {
    private readonly blocks: InputRichBlock[] = [];
    private rtl = false;
    private skipDetection = false;

    /** Append any block directly. */
    block(block: InputRichBlock): this {
        this.blocks.push(block);
        return this;
    }

    paragraph(text: RichText): this {
        return this.block({ type: 'paragraph', text });
    }

    /** Section heading; size 1 is the largest, 6 the smallest. */
    heading(text: RichText, size: 1 | 2 | 3 | 4 | 5 | 6 = 2): this {
        return this.block({ type: 'heading', text, size });
    }

    /** Preformatted code block. */
    code(text: string, language?: string): this {
        return this.block(language ? { type: 'pre', text, language } : { type: 'pre', text });
    }

    footer(text: RichText): this {
        return this.block({ type: 'footer', text });
    }

    divider(): this {
        return this.block({ type: 'divider' });
    }

    /** LaTeX expression block. */
    math(expression: string): this {
        return this.block({ type: 'mathematical_expression', expression });
    }

    anchor(name: string): this {
        return this.block({ type: 'anchor', name });
    }

    /** Bulleted list. Items are rich text or arrays of blocks. */
    list(items: ListItemInput[]): this {
        return this.block({ type: 'list', items: items.map(item => toListItem(item)) });
    }

    /** Numbered list. */
    orderedList(items: ListItemInput[], style: 'a' | 'A' | 'i' | 'I' | '1' = '1'): this {
        return this.block({
            type: 'list',
            items: items.map((item, index) => toListItem(item, { value: index + 1, type: style })),
        });
    }

    /** Checklist; each item is `[text, checked]`. */
    checklist(items: Array<[RichText, boolean]>): this {
        return this.block({
            type: 'list',
            items: items.map(([text, checked]) =>
                toListItem(
                    text,
                    checked ? { has_checkbox: true, is_checked: true } : { has_checkbox: true }
                )
            ),
        });
    }

    quote(content: RichText | InputRichBlock[], credit?: RichText): this {
        const blocks = isBlockArray(content as ListItemInput)
            ? (content as InputRichBlock[])
            : [{ type: 'paragraph' as const, text: content as RichText }];
        return this.block(
            credit === undefined
                ? { type: 'blockquote', blocks }
                : { type: 'blockquote', blocks, credit }
        );
    }

    /** Quote that can be expanded or collapsed (Bot API 10.3). */
    expandableQuote(text: RichText, credit?: RichText): this {
        return this.block(
            credit === undefined
                ? { type: 'expandable_blockquote', text }
                : { type: 'expandable_blockquote', text, credit }
        );
    }

    pullQuote(text: RichText, credit?: RichText): this {
        return this.block(
            credit === undefined ? { type: 'pullquote', text } : { type: 'pullquote', text, credit }
        );
    }

    /** Collapsible details block. */
    details(summary: RichText, content: RichText | InputRichBlock[], open = false): this {
        const blocks = isBlockArray(content as ListItemInput)
            ? (content as InputRichBlock[])
            : [{ type: 'paragraph' as const, text: content as RichText }];
        return this.block(
            open
                ? { type: 'details', summary, blocks, is_open: true }
                : { type: 'details', summary, blocks }
        );
    }

    /** Table from rows of cells. */
    table(rows: Array<Array<RichText | RichBlockTableCell>>, options: RichTableOptions = {}): this {
        const cells = rows.map((row, rowIndex) =>
            row.map(cell => {
                const base: RichBlockTableCell =
                    typeof cell === 'object' &&
                    cell !== null &&
                    !Array.isArray(cell) &&
                    !('type' in cell)
                        ? (cell as RichBlockTableCell)
                        : { text: cell as RichText };
                return options.header && rowIndex === 0
                    ? { ...base, is_header: true as const }
                    : base;
            })
        );
        return this.block({
            type: 'table',
            cells,
            ...(options.bordered ? { is_bordered: true as const } : {}),
            ...(options.striped ? { is_striped: true as const } : {}),
            ...(options.compact ? { is_compact: true as const } : {}),
            ...(options.caption !== undefined ? { caption: options.caption } : {}),
        });
    }

    /** A row of 1-8 buttons (Bot API 10.3). */
    buttons(buttons: RichMessageButton[], align?: 'left' | 'center' | 'right'): this {
        if (buttons.length < 1 || buttons.length > 8) {
            throw new RangeError('A rich button row must contain 1-8 buttons.');
        }
        return this.block(
            align ? { type: 'buttons', buttons, align } : { type: 'buttons', buttons }
        );
    }

    map(
        location: Location,
        options: { zoom?: number; width?: number; height?: number; caption?: RichText } = {}
    ): this {
        const { caption: text, ...rest } = options;
        const blockCaption = caption(text);
        return this.block({
            type: 'map',
            location,
            ...rest,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    photo(photo: InputMediaPhoto | string, captionText?: RichText): this {
        const media = typeof photo === 'string' ? { type: 'photo' as const, media: photo } : photo;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'photo',
            photo: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    video(video: InputMediaVideo | string, captionText?: RichText): this {
        const media = typeof video === 'string' ? { type: 'video' as const, media: video } : video;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'video',
            video: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    animation(animation: InputMediaAnimation | string, captionText?: RichText): this {
        const media =
            typeof animation === 'string'
                ? { type: 'animation' as const, media: animation }
                : animation;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'animation',
            animation: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    audio(audio: InputMediaAudio | string, captionText?: RichText): this {
        const media = typeof audio === 'string' ? { type: 'audio' as const, media: audio } : audio;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'audio',
            audio: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    document(document: InputMediaDocument | string, captionText?: RichText): this {
        const media =
            typeof document === 'string'
                ? { type: 'document' as const, media: document }
                : document;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'document',
            document: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    voiceNote(voice: InputMediaVoiceNote | string, captionText?: RichText): this {
        const media =
            typeof voice === 'string' ? { type: 'voice_note' as const, media: voice } : voice;
        const blockCaption = caption(captionText);
        return this.block({
            type: 'voice_note',
            voice_note: media,
            ...(blockCaption ? { caption: blockCaption } : {}),
        });
    }

    /** "Thinking..." placeholder; only valid in sendRichMessageDraft. */
    thinking(text: RichText = 'Thinking...'): this {
        return this.block({ type: 'thinking', text });
    }

    /** Render right-to-left. */
    rightToLeft(enabled = true): this {
        this.rtl = enabled;
        return this;
    }

    /** Skip automatic detection of URLs, mentions, hashtags, etc. */
    skipEntityDetection(enabled = true): this {
        this.skipDetection = enabled;
        return this;
    }

    /** Number of blocks added so far. */
    get length(): number {
        return this.blocks.length;
    }

    build(): InputRichMessage {
        if (this.blocks.length === 0) {
            throw new Error('A rich message needs at least one block.');
        }
        return {
            blocks: [...this.blocks],
            ...(this.rtl ? { is_rtl: true } : {}),
            ...(this.skipDetection ? { skip_entity_detection: true } : {}),
        };
    }
}

/** Rich message builder and inline rich text helpers. */
export const Rich = {
    /** Start a new rich message. */
    message: () => new RichMessageBuilder(),
    bold: (text: RichText): RichTextBold => ({ type: 'bold', text }),
    italic: (text: RichText): RichTextItalic => ({ type: 'italic', text }),
    underline: (text: RichText): RichTextUnderline => ({ type: 'underline', text }),
    strike: (text: RichText): RichTextStrikethrough => ({ type: 'strikethrough', text }),
    spoiler: (text: RichText): RichTextSpoiler => ({ type: 'spoiler', text }),
    code: (text: RichText): RichTextCode => ({ type: 'code', text }),
    link: (text: RichText, url: string): RichTextUrl => ({ type: 'url', text, url }),
    mention: (text: RichText, username: string): RichTextMention => ({
        type: 'mention',
        text,
        username: username.replace(/^@/, ''),
    }),
    userMention: (text: RichText, user: User) => ({ type: 'text_mention' as const, text, user }),
    customEmoji: (customEmojiId: string, alternativeText: string): RichTextCustomEmoji => ({
        type: 'custom_emoji',
        custom_emoji_id: customEmojiId,
        alternative_text: alternativeText,
    }),
    button: (button: RichMessageButton): RichTextButton => ({ type: 'button', button }),
} as const;
