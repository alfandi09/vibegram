import { describe, expect, it, vi } from 'vitest';
import { TelegramClient } from '../src/client';
import {
    hasUploadValue,
    prepareRequestPayload,
    validateRequestPayload,
} from '../src/multipart';

type MockHttpCall = { body: unknown; headers: Record<string, string> };

async function readMultipartBody(body: unknown): Promise<string> {
    if (
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { getBuffer?: unknown }).getBuffer === 'function'
    ) {
        return (body as { getBuffer(): Buffer }).getBuffer().toString('utf8');
    }

    if (
        typeof body === 'object' &&
        body !== null &&
        Symbol.asyncIterator in body
    ) {
        const chunks: Buffer[] = [];
        for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    throw new TypeError('Unsupported multipart body in test.');
}

function getHttpCall(http: { request: ReturnType<typeof vi.fn> }): MockHttpCall {
    const [request] = http.request.mock.calls[0];
    return {
        body: request.body,
        headers: request.headers,
    };
}

describe('Telegram multipart serialization', () => {
    it('should detect nested upload values', () => {
        expect(
            hasUploadValue({
                media: [
                    {
                        type: 'photo',
                        media: Buffer.from('photo-a'),
                    },
                ],
            })
        ).toBe(true);
        expect(hasUploadValue({ chat_id: 99, text: 'hello' })).toBe(false);
    });

    it('should preserve JSON payloads for non-upload requests', () => {
        const payload = { chat_id: 99, text: 'hello' };

        const prepared = prepareRequestPayload(payload);

        expect(prepared).toEqual({
            body: payload,
            headers: { 'content-type': 'application/json' },
            isMultipart: false,
        });
    });

    it('should reject unsupported payloads before sending', () => {
        expect(() => validateRequestPayload(new URLSearchParams(), 100)).toThrow('plain object');
        expect(() => validateRequestPayload({ chat_id: 99, value: 1n }, 100)).toThrow(
            'unsupported value'
        );
        expect(() =>
            validateRequestPayload({ text: 'x'.repeat(100) }, 20)
        ).toThrow('exceeds maximum size');
    });

    it('should serialize nested media group uploads with streaming multipart body', async () => {
        const prepared = prepareRequestPayload({
            chat_id: 99,
            media: [
                {
                    type: 'photo',
                    media: Buffer.from('photo-a'),
                    caption: 'First',
                },
                {
                    type: 'video',
                    media: Buffer.from('video-b'),
                    thumbnail: Buffer.from('thumb-b'),
                },
            ],
        });

        const payload = await readMultipartBody(prepared.body);

        expect(prepared.isMultipart).toBe(true);
        expect(prepared.headers).toEqual(
            expect.objectContaining({ 'content-type': expect.stringContaining('multipart/form-data') })
        );
        expect(payload).toContain('"media":"attach://media_0_media"');
        expect(payload).toContain('"media":"attach://media_1_media"');
        expect(payload).toContain('"thumbnail":"attach://media_1_thumbnail"');
        expect(payload).toContain('name="media_0_media"');
        expect(payload).toContain('name="media_1_media"');
        expect(payload).toContain('name="media_1_thumbnail"');
    });

    it('should serialize nested media group uploads with attach references', async () => {
        const client = new TelegramClient('test-token');
        const http = {
            request: vi.fn().mockResolvedValue({
                data: { ok: true, result: [] },
                headers: {},
                status: 200,
            }),
        };
        (client as any).http = http;

        await client.callApi('sendMediaGroup', {
            chat_id: 99,
            media: [
                {
                    type: 'photo',
                    media: Buffer.from('photo-a'),
                    caption: 'First',
                },
                {
                    type: 'video',
                    media: Buffer.from('video-b'),
                    thumbnail: Buffer.from('thumb-b'),
                },
            ],
        });

        const call = getHttpCall(http);
        const payload = await readMultipartBody(call.body);

        expect(call.headers).toEqual(
            expect.objectContaining({ 'content-type': expect.any(String) })
        );
        expect(payload).toContain('"media":"attach://media_0_media"');
        expect(payload).toContain('"media":"attach://media_1_media"');
        expect(payload).toContain('"thumbnail":"attach://media_1_thumbnail"');
        expect(payload).toContain('name="media_0_media"');
        expect(payload).toContain('name="media_1_media"');
        expect(payload).toContain('name="media_1_thumbnail"');
    });
});
