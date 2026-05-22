import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    FileSizeLimitError,
    TelegramDownloadableFile,
    files,
    sanitizeFileName,
} from '../src/index';

const tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.map(dir => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
});

describe('@vibegram/files', () => {
    it('should resolve file ids from photos, documents, videos, audios, and voices', async () => {
        const cases = [
            [{ photo: [{ file_id: 'p-small', file_unique_id: 'up1', width: 10, height: 10 }, { file_id: 'p-large', file_unique_id: 'up2', width: 100, height: 100 }] }, 'p-large', 'photo'],
            [{ document: { file_id: 'doc', file_unique_id: 'ud', file_name: 'report.pdf' } }, 'doc', 'document'],
            [{ video: { file_id: 'vid', file_unique_id: 'uv', width: 1, height: 1, duration: 1 } }, 'vid', 'video'],
            [{ audio: { file_id: 'aud', file_unique_id: 'ua', duration: 1 } }, 'aud', 'audio'],
            [{ voice: { file_id: 'voi', file_unique_id: 'uo', duration: 1 } }, 'voi', 'voice'],
        ] as const;

        for (const [media, expectedFileId, expectedKind] of cases) {
            const { ctx, calls } = createContext(media);
            await runFiles(ctx);

            const file = await ctx.file();

            expect(file).toBeInstanceOf(TelegramDownloadableFile);
            expect(file.fileId).toBe(expectedFileId);
            expect(file.kind).toBe(expectedKind);
            expect(calls).toContainEqual(['getFile', { file_id: expectedFileId }]);
        }
    });

    it('should call getFile and expose a Telegram download URL', async () => {
        const { ctx } = createContext({
            document: {
                file_id: 'doc',
                file_unique_id: 'unique-doc',
                file_name: 'report.pdf',
                mime_type: 'application/pdf',
            },
        });
        await runFiles(ctx);

        const file = await ctx.file();

        expect(file.uniqueId).toBe('unique-doc');
        expect(file.fileName).toBe('report.pdf');
        expect(file.mimeType).toBe('application/pdf');
        expect(file.getUrl()).toBe('https://api.telegram.org/file/bot123:ABC/docs/report.pdf');
    });

    it('should download files as buffers and streams', async () => {
        const fetch = vi.fn(async () => createResponse('hello file'));
        const { ctx } = createContext({ voice: { file_id: 'voice', file_unique_id: 'uv', duration: 1 } });
        await runFiles(ctx, { fetch });

        const file = await ctx.file();
        const buffer = await file.toBuffer();
        const stream = await file.toStream();

        expect(buffer.toString('utf8')).toBe('hello file');
        await expect(readStream(stream)).resolves.toBe('hello file');
        expect(fetch).toHaveBeenCalledWith(
            'https://api.telegram.org/file/bot123:ABC/docs/voice.ogg'
        );
    });

    it('should save files to a local path and cleanly sanitize generated filenames', async () => {
        const fetch = vi.fn(async () => createResponse('pdf-data'));
        const temp = await mkdtemp(join(tmpdir(), 'vibegram-files-'));
        tempDirs.push(temp);
        const { ctx } = createContext({
            document: {
                file_id: 'doc',
                file_unique_id: 'unique-doc',
                file_name: '../bad:name?.pdf',
                mime_type: 'application/pdf',
            },
        });
        await runFiles(ctx, { fetch });

        const file = await ctx.file();
        const savedPath = await file.saveToDir(temp);

        expect(file.safeFileName()).toBe('bad_name_.pdf');
        expect(savedPath).toBe(join(temp, 'bad_name_.pdf'));
        await expect(readFile(savedPath, 'utf8')).resolves.toBe('pdf-data');
        expect(sanitizeFileName('CON')).toBe('file');
    });

    it('should reject files that exceed configured size limits', async () => {
        const { ctx } = createContext({
            document: {
                file_id: 'doc',
                file_unique_id: 'unique-doc',
                file_size: 4096,
            },
        });
        await runFiles(ctx, { maxBytes: 1024 });

        await expect(ctx.file()).rejects.toBeInstanceOf(FileSizeLimitError);
    });

    it('should reject downloads that exceed content-length size limits', async () => {
        const fetch = vi.fn(async () => createResponse('too large', { contentLength: 4096 }));
        const { ctx } = createContext({ voice: { file_id: 'voice', file_unique_id: 'uv', duration: 1 } });
        await runFiles(ctx, { fetch, maxBytes: 1024 });

        const file = await ctx.file();

        await expect(file.toBuffer()).rejects.toBeInstanceOf(FileSizeLimitError);
    });

    it('should reject disallowed MIME types', async () => {
        const { ctx } = createContext({
            document: {
                file_id: 'doc',
                file_unique_id: 'unique-doc',
                mime_type: 'application/x-msdownload',
            },
        });
        await runFiles(ctx, { allowedMimeTypes: ['application/pdf'] });

        await expect(ctx.file()).rejects.toThrow('MIME type');
    });
});

async function runFiles(ctx: TestContext, options: Record<string, unknown> = {}) {
    const middleware = files(options);
    await middleware(ctx, async () => {});
}

function createContext(media: Record<string, unknown>) {
    const calls: Array<[string, unknown]> = [];
    const filesById = new Map<string, Record<string, unknown>>([
        ['p-large', { file_id: 'p-large', file_unique_id: 'up2', file_size: 128, file_path: 'photos/large.jpg' }],
        ['doc', { file_id: 'doc', file_unique_id: 'unique-doc', file_size: 512, file_path: 'docs/report.pdf' }],
        ['vid', { file_id: 'vid', file_unique_id: 'uv', file_size: 512, file_path: 'video/movie.mp4' }],
        ['aud', { file_id: 'aud', file_unique_id: 'ua', file_size: 512, file_path: 'audio/song.mp3' }],
        ['voice', { file_id: 'voice', file_unique_id: 'uv', file_size: 512, file_path: 'docs/voice.ogg' }],
        ['voi', { file_id: 'voi', file_unique_id: 'uo', file_size: 512, file_path: 'voice/note.ogg' }],
    ]);
    const ctx = {
        message: {
            message_id: 1,
            chat: { id: 1, type: 'private' },
            date: 0,
            ...media,
        },
        client: {
            token: '123:ABC',
            callApi: vi.fn(async (method: string, data?: { file_id?: string }) => {
                calls.push([method, data]);
                return filesById.get(data?.file_id ?? '') ?? {
                    file_id: data?.file_id,
                    file_size: 512,
                    file_path: `docs/${data?.file_id}.bin`,
                };
            }),
        },
    } as TestContext;

    return { ctx, calls };
}

function createResponse(body: string, options: { contentLength?: number } = {}) {
    const data = Buffer.from(body);

    return {
        ok: true,
        status: 200,
        headers: {
            get(name: string) {
                return name.toLowerCase() === 'content-length'
                    ? String(options.contentLength ?? data.length)
                    : null;
            },
        },
        async arrayBuffer() {
            return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        },
        body: Readable.from([data]),
    };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

interface TestContext {
    message?: Record<string, unknown>;
    client: {
        token: string;
        callApi: (method: string, data?: { file_id?: string }) => Promise<unknown>;
    };
    file: () => Promise<TelegramDownloadableFile>;
}
