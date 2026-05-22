import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export type FileKind =
    | 'photo'
    | 'document'
    | 'video'
    | 'audio'
    | 'voice'
    | 'video_note'
    | 'animation'
    | 'sticker';

export interface TelegramFileInfo {
    file_id: string;
    file_unique_id?: string;
    file_size?: number;
    file_path?: string;
}

export interface FileSourceInfo {
    kind: FileKind;
    fileId: string;
    uniqueId?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    raw: unknown;
}

export interface FilesClient {
    token?: string;
    callApi(method: string, data?: unknown): Promise<unknown>;
}

export interface FilesContext {
    client: FilesClient;
    message?: Record<string, unknown>;
    file?(options?: FileLookupOptions | string): Promise<TelegramDownloadableFile>;
}

export interface FileFetchResponse {
    ok: boolean;
    status: number;
    statusText?: string;
    headers?: {
        get(name: string): string | null;
    };
    arrayBuffer(): Promise<ArrayBuffer | SharedArrayBuffer>;
    body?: unknown;
}

export type FileFetch = (url: string) => Promise<FileFetchResponse>;

export interface FilesOptions {
    token?: string;
    apiRoot?: string;
    maxBytes?: number;
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
    fetch?: FileFetch;
}

export interface FileLookupOptions {
    fileId?: string;
    kind?: FileKind;
    maxBytes?: number;
    allowedMimeTypes?: string[];
    allowedExtensions?: string[];
}

export interface SaveToDirOptions {
    fileName?: string;
}

export interface FileStoragePutInput {
    file: TelegramDownloadableFile;
    stream: NodeJS.ReadableStream;
    fileName: string;
    mimeType?: string;
    size?: number;
}

export interface FileStorageResult {
    key?: string;
    url?: string;
    raw?: unknown;
}

export interface FileStorageAdapter {
    put(input: FileStoragePutInput): Promise<FileStorageResult>;
}

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_API_ROOT = 'https://api.telegram.org';
const RESERVED_WINDOWS_NAMES = new Set([
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
]);

export class FileNotFoundError extends Error {
    constructor() {
        super('[vibegram/files] No downloadable media file was found on this update.');
        this.name = 'FileNotFoundError';
    }
}

export class FileSizeLimitError extends Error {
    constructor(size: number, maxBytes: number) {
        super(`[vibegram/files] File size ${size} exceeds configured limit ${maxBytes} bytes.`);
        this.name = 'FileSizeLimitError';
    }
}

export class FileTypeNotAllowedError extends Error {
    constructor(reason: string) {
        super(`[vibegram/files] ${reason}`);
        this.name = 'FileTypeNotAllowedError';
    }
}

export class FileDownloadError extends Error {
    constructor(message: string) {
        super(`[vibegram/files] ${message}`);
        this.name = 'FileDownloadError';
    }
}

export class TelegramDownloadableFile {
    readonly fileId: string;
    readonly uniqueId?: string;
    readonly kind: FileKind;
    readonly fileName?: string;
    readonly mimeType?: string;
    readonly size?: number;
    readonly telegramFile: TelegramFileInfo;

    constructor(
        private readonly options: Required<Pick<FilesOptions, 'apiRoot' | 'maxBytes' | 'fetch'>> &
            Pick<FilesOptions, 'token'>,
        private readonly source: FileSourceInfo,
        telegramFile: TelegramFileInfo
    ) {
        this.fileId = source.fileId;
        this.uniqueId = source.uniqueId ?? telegramFile.file_unique_id;
        this.kind = source.kind;
        this.fileName = source.fileName;
        this.mimeType = source.mimeType;
        this.size = source.size ?? telegramFile.file_size;
        this.telegramFile = telegramFile;
    }

    getUrl(): string {
        const filePath = this.telegramFile.file_path;
        if (!filePath) {
            throw new FileDownloadError('Telegram getFile response did not include file_path.');
        }

        if (isAbsolute(filePath)) {
            return filePath;
        }

        const token = this.options.token;
        if (!token) {
            throw new FileDownloadError('A bot token is required to build a Telegram file URL.');
        }

        return `${this.options.apiRoot.replace(/\/+$/, '')}/file/bot${token}/${filePath}`;
    }

    async toBuffer(): Promise<Buffer> {
        this.assertKnownSize();
        const response = await this.fetchResponse();
        this.assertContentLength(response);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        this.assertSize(buffer.byteLength);
        return buffer;
    }

    async toStream(): Promise<NodeJS.ReadableStream> {
        this.assertKnownSize();
        const response = await this.fetchResponse();
        this.assertContentLength(response);
        return toNodeReadable(response.body);
    }

    async saveTo(filePath: string): Promise<string> {
        await mkdir(dirname(filePath), { recursive: true });
        const stream = await this.toStream();
        const limiter = createSizeLimitTransform(this.options.maxBytes);

        try {
            await pipeline(stream, limiter, createWriteStream(filePath));
        } catch (error) {
            await unlink(filePath).catch(() => undefined);
            throw error;
        }

        return filePath;
    }

    async saveToDir(directory: string, options: SaveToDirOptions = {}): Promise<string> {
        const fileName = sanitizeFileName(options.fileName ?? this.fileName, this.defaultFileName());
        const targetPath = join(directory, fileName);
        return this.saveTo(targetPath);
    }

    async uploadTo(
        adapter: FileStorageAdapter,
        options: SaveToDirOptions = {}
    ): Promise<FileStorageResult> {
        const fileName = sanitizeFileName(options.fileName ?? this.fileName, this.defaultFileName());
        const stream = await this.toStream();
        return adapter.put({
            file: this,
            stream,
            fileName,
            mimeType: this.mimeType,
            size: this.size,
        });
    }

    safeFileName(fallback = this.defaultFileName()): string {
        return sanitizeFileName(this.fileName, fallback);
    }

    private defaultFileName(): string {
        const base = this.uniqueId ?? this.fileId;
        return `${base}${defaultExtension(this.kind, this.mimeType)}`;
    }

    private async fetchResponse(): Promise<FileFetchResponse> {
        const url = this.getUrl();
        if (isAbsolute(url)) {
            throw new FileDownloadError(
                'file_path is a local Bot API server path. Use it directly or copy it from disk.'
            );
        }

        const response = await this.options.fetch(url);
        if (!response.ok) {
            throw new FileDownloadError(`Download failed with HTTP ${response.status}.`);
        }

        return response;
    }

    private assertKnownSize(): void {
        if (this.size !== undefined) {
            this.assertSize(this.size);
        }
    }

    private assertContentLength(response: FileFetchResponse): void {
        const contentLength = response.headers?.get('content-length');
        if (!contentLength) {
            return;
        }

        const size = Number(contentLength);
        if (Number.isFinite(size)) {
            this.assertSize(size);
        }
    }

    private assertSize(size: number): void {
        if (size > this.options.maxBytes) {
            throw new FileSizeLimitError(size, this.options.maxBytes);
        }
    }
}

export function files<C extends FilesContext = FilesContext>(
    options: FilesOptions = {}
): (ctx: C, next: () => Promise<void>) => Promise<void> {
    const normalized = normalizeOptions(options);

    return async (ctx, next) => {
        ctx.file = async lookup => {
            const lookupOptions = normalizeLookup(lookup);
            const source = lookupOptions.fileId
                ? {
                      kind: lookupOptions.kind ?? 'document',
                      fileId: lookupOptions.fileId,
                      raw: { file_id: lookupOptions.fileId },
                  }
                : resolveFileSource(ctx.message);
            const mergedOptions = mergeLookupOptions(normalized, lookupOptions);

            validateSource(source, mergedOptions);
            const telegramFile = (await ctx.client.callApi('getFile', {
                file_id: source.fileId,
            })) as TelegramFileInfo;
            const finalSource: FileSourceInfo = {
                ...source,
                uniqueId: source.uniqueId ?? telegramFile.file_unique_id,
                size: source.size ?? telegramFile.file_size,
            };
            validateSource(finalSource, mergedOptions);

            return new TelegramDownloadableFile(
                {
                    apiRoot: mergedOptions.apiRoot,
                    maxBytes: mergedOptions.maxBytes,
                    fetch: mergedOptions.fetch,
                    token: mergedOptions.token || ctx.client.token,
                },
                finalSource,
                telegramFile
            );
        };

        await next();
    };
}

export function sanitizeFileName(value: unknown, fallback = 'file'): string {
    const original = typeof value === 'string' ? basename(value) : '';
    let sanitized = original
        .replace(/[\x00-\x1f\x80-\x9f]/g, '_')
        .replace(/[<>:"/\\|?*]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[.\s]+/, '')
        .replace(/[.\s]+$/, '');

    if (sanitized.length > 180) {
        const extension = extname(sanitized).slice(0, 32);
        const stem = sanitized.slice(0, 180 - extension.length);
        sanitized = `${stem}${extension}`;
    }

    if (!sanitized || RESERVED_WINDOWS_NAMES.has(sanitized.toUpperCase())) {
        return fallback === original ? 'file' : sanitizeFileName(fallback, 'file');
    }

    return sanitized;
}

function resolveFileSource(message: Record<string, unknown> | undefined): FileSourceInfo {
    if (!message) {
        throw new FileNotFoundError();
    }

    const photo = Array.isArray(message.photo) ? lastPhoto(message.photo) : undefined;
    if (photo) {
        return createSource('photo', photo);
    }

    for (const kind of [
        'document',
        'video',
        'audio',
        'voice',
        'video_note',
        'animation',
        'sticker',
    ] as const) {
        const value = message[kind];
        if (isRecord(value)) {
            return createSource(kind, value);
        }
    }

    throw new FileNotFoundError();
}

function createSource(kind: FileKind, raw: Record<string, unknown>): FileSourceInfo {
    const fileId = raw.file_id;
    if (typeof fileId !== 'string') {
        throw new FileNotFoundError();
    }

    const uniqueId = raw.file_unique_id;
    const fileName = raw.file_name;
    const mimeType = raw.mime_type;
    const size = raw.file_size;

    return {
        kind,
        fileId,
        uniqueId: typeof uniqueId === 'string' ? uniqueId : undefined,
        fileName: typeof fileName === 'string' ? fileName : undefined,
        mimeType: typeof mimeType === 'string' ? mimeType : undefined,
        size: typeof size === 'number' ? size : undefined,
        raw,
    };
}

function validateSource(source: FileSourceInfo, options: Required<FilesOptions>): void {
    if (source.size !== undefined && source.size > options.maxBytes) {
        throw new FileSizeLimitError(source.size, options.maxBytes);
    }

    if (
        source.mimeType &&
        options.allowedMimeTypes.length > 0 &&
        !options.allowedMimeTypes.includes(source.mimeType)
    ) {
        throw new FileTypeNotAllowedError(`MIME type "${source.mimeType}" is not allowed.`);
    }

    if (options.allowedExtensions.length > 0) {
        const extension = extname(source.fileName ?? '').toLowerCase();
        if (!extension || !options.allowedExtensions.includes(extension)) {
            throw new FileTypeNotAllowedError(`File extension "${extension || '(none)'}" is not allowed.`);
        }
    }
}

function lastPhoto(photo: unknown[]): Record<string, unknown> | undefined {
    for (let index = photo.length - 1; index >= 0; index--) {
        const item = photo[index];
        if (isRecord(item) && typeof item.file_id === 'string') {
            return item;
        }
    }

    return undefined;
}

function normalizeLookup(lookup: FileLookupOptions | string | undefined): FileLookupOptions {
    if (typeof lookup === 'string') {
        return { fileId: lookup };
    }

    return lookup ?? {};
}

function mergeLookupOptions(
    options: Required<FilesOptions>,
    lookup: FileLookupOptions
): Required<FilesOptions> {
    return {
        ...options,
        maxBytes: lookup.maxBytes ?? options.maxBytes,
        allowedMimeTypes: lookup.allowedMimeTypes ?? options.allowedMimeTypes,
        allowedExtensions: lookup.allowedExtensions ?? options.allowedExtensions,
    };
}

function normalizeOptions(options: FilesOptions): Required<FilesOptions> {
    return {
        token: options.token ?? '',
        apiRoot: options.apiRoot ?? DEFAULT_API_ROOT,
        maxBytes: positiveInteger(options.maxBytes, DEFAULT_MAX_BYTES, 'maxBytes'),
        allowedMimeTypes: options.allowedMimeTypes ?? [],
        allowedExtensions: (options.allowedExtensions ?? []).map(extension =>
            extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`
        ),
        fetch: options.fetch ?? defaultFetch,
    };
}

async function defaultFetch(url: string): Promise<FileFetchResponse> {
    const fetchFn = globalThis.fetch as unknown as FileFetch | undefined;
    if (!fetchFn) {
        throw new FileDownloadError('global fetch is not available in this Node.js runtime.');
    }

    return fetchFn(url);
}

function toNodeReadable(body: unknown): NodeJS.ReadableStream {
    if (body && typeof body === 'object' && typeof (body as NodeJS.ReadableStream).pipe === 'function') {
        return body as NodeJS.ReadableStream;
    }

    if (body && typeof body === 'object' && typeof (body as { getReader?: unknown }).getReader === 'function') {
        return Readable.fromWeb(body as never);
    }

    if (body && typeof body === 'object' && Symbol.asyncIterator in body) {
        return Readable.from(body as AsyncIterable<Uint8Array>);
    }

    throw new FileDownloadError('Download response does not include a readable body.');
}

function createSizeLimitTransform(maxBytes: number): Transform {
    let total = 0;

    return new Transform({
        transform(chunk: Buffer, _encoding, callback) {
            total += chunk.byteLength;
            if (total > maxBytes) {
                callback(new FileSizeLimitError(total, maxBytes));
                return;
            }

            callback(null, chunk);
        },
    });
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
    if (value === undefined) {
        return fallback;
    }

    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`${name} must be a positive integer.`);
    }

    return value;
}

function defaultExtension(kind: FileKind, mimeType?: string): string {
    if (mimeType) {
        const mapped = extensionFromMimeType(mimeType);
        if (mapped) {
            return mapped;
        }
    }

    switch (kind) {
        case 'photo':
            return '.jpg';
        case 'video':
        case 'animation':
            return '.mp4';
        case 'audio':
            return '.mp3';
        case 'voice':
            return '.ogg';
        case 'video_note':
            return '.mp4';
        case 'sticker':
            return '.webp';
        default:
            return '.bin';
    }
}

function extensionFromMimeType(mimeType: string): string | undefined {
    switch (mimeType.toLowerCase()) {
        case 'application/pdf':
            return '.pdf';
        case 'image/jpeg':
            return '.jpg';
        case 'image/png':
            return '.png';
        case 'image/webp':
            return '.webp';
        case 'video/mp4':
            return '.mp4';
        case 'audio/mpeg':
            return '.mp3';
        case 'audio/ogg':
        case 'audio/opus':
            return '.ogg';
        case 'text/plain':
            return '.txt';
        default:
            return undefined;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
