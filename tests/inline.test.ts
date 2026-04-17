import { describe, expect, it } from 'vitest';
import { InlineResults } from '../src/inline';

describe('InlineResults', () => {
    it('builds all supported inline result types with fluent chaining', () => {
        const replyMarkup = { inline_keyboard: [[{ text: 'Open', callback_data: 'open' }]] };
        const results = InlineResults.builder()
            .article({
                id: 'a1',
                title: 'Article',
                text: 'Hello',
                description: 'Article body',
                parse_mode: 'HTML',
                url: 'https://example.com',
                thumbnail_url: 'https://example.com/thumb.jpg',
                thumbnail_width: 90,
                thumbnail_height: 90,
                reply_markup: replyMarkup,
            })
            .photo({
                id: 'p1',
                url: 'https://example.com/photo.jpg',
                title: 'Photo',
                description: 'Preview',
                caption: 'Image',
                parse_mode: 'Markdown',
                photo_width: 800,
                photo_height: 600,
                reply_markup: replyMarkup,
            })
            .document({
                id: 'd1',
                title: 'Doc',
                document_url: 'https://example.com/doc.pdf',
                mime_type: 'application/pdf',
                description: 'Manual',
                caption: 'PDF',
                parse_mode: 'MarkdownV2',
                thumbnail_url: 'https://example.com/doc.jpg',
                reply_markup: replyMarkup,
            })
            .video({
                id: 'v1',
                title: 'Video',
                video_url: 'https://example.com/video.mp4',
                mime_type: 'text/html',
                thumbnail_url: 'https://example.com/video.jpg',
                description: 'Watch',
                caption: 'Clip',
                parse_mode: 'HTML',
                video_width: 1280,
                video_height: 720,
                video_duration: 45,
                reply_markup: replyMarkup,
            })
            .gif({
                id: 'g1',
                gif_url: 'https://example.com/anim.gif',
                title: 'Gif',
                caption: 'Loop',
                parse_mode: 'Markdown',
                gif_width: 320,
                gif_height: 240,
                gif_duration: 12,
                reply_markup: replyMarkup,
            })
            .voice({
                id: 'o1',
                title: 'Voice',
                voice_url: 'https://example.com/voice.ogg',
                voice_duration: 30,
                caption: 'Voice note',
                parse_mode: 'HTML',
                reply_markup: replyMarkup,
            })
            .location({
                id: 'l1',
                title: 'Office',
                latitude: -6.2,
                longitude: 106.8,
                thumbnail_url: 'https://example.com/map.jpg',
                thumbnail_width: 120,
                thumbnail_height: 120,
                reply_markup: replyMarkup,
            })
            .venue({
                id: 've1',
                title: 'Cafe',
                latitude: -6.2,
                longitude: 106.8,
                address: 'Jl. Example',
                foursquare_id: 'fs-1',
                foursquare_type: 'arts_entertainment/default',
                google_place_id: 'gp-1',
                google_place_type: 'restaurant',
                thumbnail_url: 'https://example.com/venue.jpg',
                thumbnail_width: 120,
                thumbnail_height: 120,
                reply_markup: replyMarkup,
            })
            .contact({
                id: 'c1',
                phone_number: '+62123456789',
                first_name: 'Ayu',
                last_name: 'Lestari',
                vcard: 'BEGIN:VCARD',
                thumbnail_url: 'https://example.com/contact.jpg',
                reply_markup: replyMarkup,
            })
            .build();

        expect(results).toHaveLength(9);
        expect(results[0]).toMatchObject({
            type: 'article',
            input_message_content: { message_text: 'Hello', parse_mode: 'HTML' },
        });
        expect(results[1]).toMatchObject({
            type: 'photo',
            thumbnail_url: 'https://example.com/photo.jpg',
        });
        expect(results[2]).toMatchObject({ type: 'document', mime_type: 'application/pdf' });
        expect(results[3]).toMatchObject({ type: 'video', video_duration: 45 });
        expect(results[4]).toMatchObject({ type: 'gif', gif_duration: 12 });
        expect(results[5]).toMatchObject({ type: 'voice', voice_duration: 30 });
        expect(results[6]).toMatchObject({ type: 'location', latitude: -6.2, longitude: 106.8 });
        expect(results[7]).toMatchObject({
            type: 'venue',
            address: 'Jl. Example',
            google_place_id: 'gp-1',
        });
        expect(results[8]).toMatchObject({
            type: 'contact',
            first_name: 'Ayu',
            phone_number: '+62123456789',
        });
    });

    it('tracks builder length as results are added', () => {
        const builder = InlineResults.builder();
        expect(builder.length).toBe(0);

        builder.article({ id: '1', title: 'Article', text: 'Text' });
        builder.photo({ id: '2', url: 'https://example.com/photo.jpg' });

        expect(builder.length).toBe(2);
    });

    it('throws on invalid inline builder input', () => {
        expect(() =>
            InlineResults.builder().photo({ id: 'p1', url: 'ftp://example.com/file.jpg' })
        ).toThrow('HTTP or HTTPS URL');
        expect(() =>
            InlineResults.builder().location({
                id: 'l1',
                title: 'Office',
                latitude: 91,
                longitude: 106.8,
            })
        ).toThrow('latitude');
        expect(() =>
            InlineResults.builder().contact({
                id: 'c1',
                phone_number: '+62123',
                first_name: 'Ayu',
                reply_markup: [] as any,
            })
        ).toThrow('reply_markup');
    });

    it('build() returns a copy so callers cannot mutate internal state by replacing array items', () => {
        const builder = InlineResults.builder();
        builder.article({ id: '1', title: 'Article', text: 'Text' });

        const built = builder.build();
        built.push({ type: 'article', id: '2' });

        expect(builder.length).toBe(1);
        expect(builder.build()).toHaveLength(1);
    });
});
