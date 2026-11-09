import { pathBasename, randomHex, utf8ByteLength } from './runtime';

const textEncoder = new TextEncoder();

/** Binary upload data: a Node.js Buffer, any Uint8Array, or a readable stream. */
export type UploadSource = Buffer | Uint8Array | NodeJS.ReadableStream;

/** An upload with explicit file metadata, e.g. `{ source: buffer, filename: 'report.pdf' }`. */
export interface UploadDescriptor {
    source: UploadSource;
    filename?: string;
    contentType?: string;
}

export type UploadValue = UploadSource | UploadDescriptor;

interface MultipartAttachment {
    name: string;
    value: UploadValue;
}

const DEFAULT_UPLOAD_CONTENT_TYPE = 'application/octet-stream';

interface MultipartField {
    name: string;
    value: string;
}

export interface PreparedRequestPayload {
    body: unknown;
    headers: Record<string, string>;
    isMultipart: boolean;
}

function isUploadSource(value: unknown): value is UploadSource {
    return (
        value instanceof Uint8Array ||
        (typeof value === 'object' &&
            value !== null &&
            typeof (value as NodeJS.ReadableStream).pipe === 'function')
    );
}

function isUploadDescriptor(value: unknown): value is UploadDescriptor {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const descriptor = value as Partial<UploadDescriptor>;
    return (
        isUploadSource(descriptor.source) &&
        (descriptor.filename === undefined || typeof descriptor.filename === 'string') &&
        (descriptor.contentType === undefined || typeof descriptor.contentType === 'string')
    );
}

export function isUploadValue(value: unknown): value is UploadValue {
    return isUploadSource(value) || isUploadDescriptor(value);
}

/**
 * True when the payload contains a stream upload. Streams can only be read
 * once, so such requests must not be replayed by retry logic.
 */
export function hasStreamUpload(value: unknown, visited: WeakSet<object> = new WeakSet()): boolean {
    if (isUploadValue(value)) {
        const source = isUploadDescriptor(value) ? value.source : value;
        return !(source instanceof Uint8Array);
    }
    if (typeof value !== 'object' || value === null) return false;
    if (visited.has(value)) return false;

    visited.add(value);
    const items = Array.isArray(value) ? value : Object.values(value);
    return items.some(item => hasStreamUpload(item, visited));
}

function getUploadSource(value: UploadValue): UploadSource {
    return isUploadDescriptor(value) ? value.source : value;
}

function getUploadFilename(value: UploadValue, fallback: string): string {
    if (isUploadDescriptor(value) && value.filename) {
        return value.filename;
    }

    // fs.createReadStream() exposes the source path; reuse its basename.
    const streamPath = (getUploadSource(value) as { path?: unknown }).path;
    if (typeof streamPath === 'string' && streamPath !== '') {
        return pathBasename(streamPath);
    }

    return fallback;
}

function getUploadContentType(value: UploadValue): string {
    return (
        (isUploadDescriptor(value) && value.contentType?.replace(/[\x00-\x1f\x7f]/g, '')) ||
        DEFAULT_UPLOAD_CONTENT_TYPE
    );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function hasUploadValue(value: unknown, visited: WeakSet<object> = new WeakSet()): boolean {
    if (isUploadValue(value)) return true;
    if (typeof value !== 'object' || value === null) return false;
    if (visited.has(value)) return false;

    visited.add(value);

    if (Array.isArray(value)) {
        return value.some(item => hasUploadValue(item, visited));
    }

    return Object.values(value).some(item => hasUploadValue(item, visited));
}

function validatePayloadValue(
    value: unknown,
    path: string,
    visited: WeakSet<object> = new WeakSet()
): void {
    if (
        value === undefined ||
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return;
    }

    if (isUploadValue(value)) return;

    if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
        throw new TypeError(`Telegram API payload contains unsupported value at ${path}.`);
    }

    if (typeof value !== 'object') return;

    if (visited.has(value)) {
        throw new TypeError('Telegram API payload contains a circular reference.');
    }

    visited.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => validatePayloadValue(item, `${path}[${index}]`, visited));
        visited.delete(value);
        return;
    }

    if (!isPlainObject(value)) {
        throw new TypeError(
            `Telegram API payload must contain only plain objects; ${path} is not plain.`
        );
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        validatePayloadValue(nestedValue, `${path}.${key}`, visited);
    }

    visited.delete(value);
}

export function validateRequestPayload(data: unknown, maxJsonPayloadBytes: number): void {
    if (data === undefined) return;

    if (!isPlainObject(data)) {
        throw new TypeError('Telegram API payload must be a plain object when provided.');
    }

    validatePayloadValue(data, 'data');

    if (hasUploadValue(data)) return;

    const json = JSON.stringify(data);
    const byteLength = utf8ByteLength(json);
    if (byteLength > maxJsonPayloadBytes) {
        throw new RangeError(
            `Telegram API JSON payload exceeds maximum size of ${maxJsonPayloadBytes} bytes.`
        );
    }
}

function makeAttachmentName(path: Array<string | number>, usedNames: Set<string>): string {
    const baseName =
        path
            .map(segment => String(segment).replace(/[^a-zA-Z0-9_]+/g, '_'))
            .filter(Boolean)
            .join('_') || 'file';

    let candidate = baseName;
    let suffix = 1;
    while (usedNames.has(candidate)) {
        candidate = `${baseName}_${suffix}`;
        suffix++;
    }

    usedNames.add(candidate);
    return candidate;
}

function serializeMultipartValue(
    value: unknown,
    path: Array<string | number>,
    attachments: MultipartAttachment[],
    usedNames: Set<string>,
    visited: WeakSet<object> = new WeakSet()
): unknown {
    if (isUploadValue(value)) {
        const attachmentName = makeAttachmentName(path, usedNames);
        attachments.push({ name: attachmentName, value });
        return `attach://${attachmentName}`;
    }

    if (Array.isArray(value)) {
        return value.map((item, index) =>
            serializeMultipartValue(item, [...path, index], attachments, usedNames, visited)
        );
    }

    if (typeof value !== 'object' || value === null) {
        return value;
    }

    if (visited.has(value)) {
        throw new TypeError('Telegram API payload contains a circular reference.');
    }

    visited.add(value);

    const serialized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
        if (nestedValue !== undefined) {
            serialized[key] = serializeMultipartValue(
                nestedValue,
                [...path, key],
                attachments,
                usedNames,
                visited
            );
        }
    }

    visited.delete(value);
    return serialized;
}

function escapeMultipartName(value: string): string {
    // Strip CR/LF and other control characters first to prevent header
    // injection, then escape backslashes and quotes for the quoted-string.
    return value
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

async function* readUploadValue(value: UploadValue): AsyncIterable<Uint8Array> {
    const source = getUploadSource(value);
    if (source instanceof Uint8Array) {
        yield source;
        return;
    }

    for await (const chunk of source as AsyncIterable<Uint8Array | string>) {
        yield typeof chunk === 'string' ? textEncoder.encode(chunk) : chunk;
    }
}

async function* createMultipartBody(
    fields: MultipartField[],
    attachments: MultipartAttachment[],
    boundary: string
): AsyncIterable<Uint8Array> {
    for (const field of fields) {
        yield textEncoder.encode(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${escapeMultipartName(field.name)}"\r\n\r\n` +
                `${field.value}\r\n`
        );
    }

    for (const attachment of attachments) {
        const filename = getUploadFilename(attachment.value, attachment.name);
        yield textEncoder.encode(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${escapeMultipartName(attachment.name)}"; filename="${escapeMultipartName(filename)}"\r\n` +
                `Content-Type: ${getUploadContentType(attachment.value)}\r\n\r\n`
        );
        yield* readUploadValue(attachment.value);
        yield textEncoder.encode('\r\n');
    }

    yield textEncoder.encode(`--${boundary}--\r\n`);
}

export function prepareRequestPayload(data: unknown): PreparedRequestPayload {
    if (typeof data !== 'object' || data === null || !hasUploadValue(data)) {
        return {
            body: data,
            headers: { 'content-type': 'application/json' },
            isMultipart: false,
        };
    }

    const fields: MultipartField[] = [];
    const attachments: MultipartAttachment[] = [];
    const nestedAttachments: MultipartAttachment[] = [];
    const usedNames = new Set<string>();

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;

        if (isUploadValue(value)) {
            attachments.push({ name: key, value });
            continue;
        }

        if (typeof value === 'object' && value !== null) {
            const serialized = serializeMultipartValue(value, [key], nestedAttachments, usedNames);
            fields.push({ name: key, value: JSON.stringify(serialized) });
            continue;
        }

        fields.push({ name: key, value: String(value) });
    }

    const boundary = `----vibegram-${randomHex(16)}`;

    return {
        body: createMultipartBody(fields, [...attachments, ...nestedAttachments], boundary),
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        isMultipart: true,
    };
}
