import { randomBytes } from 'crypto';

export type UploadValue = Buffer | NodeJS.ReadableStream;

interface MultipartAttachment {
    name: string;
    value: UploadValue;
}

interface MultipartField {
    name: string;
    value: string;
}

export interface PreparedRequestPayload {
    body: unknown;
    headers: Record<string, string>;
    isMultipart: boolean;
}

export function isUploadValue(value: unknown): value is UploadValue {
    return (
        Buffer.isBuffer(value) ||
        (typeof value === 'object' &&
            value !== null &&
            typeof (value as NodeJS.ReadableStream).pipe === 'function')
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
    const byteLength = Buffer.byteLength(json, 'utf8');
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
    if (Buffer.isBuffer(value)) {
        yield value;
        return;
    }

    for await (const chunk of value as AsyncIterable<Buffer | Uint8Array | string>) {
        if (Buffer.isBuffer(chunk)) {
            yield chunk;
        } else if (typeof chunk === 'string') {
            yield Buffer.from(chunk);
        } else {
            yield Buffer.from(chunk);
        }
    }
}

async function* createMultipartBody(
    fields: MultipartField[],
    attachments: MultipartAttachment[],
    boundary: string
): AsyncIterable<Uint8Array> {
    for (const field of fields) {
        yield Buffer.from(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${escapeMultipartName(field.name)}"\r\n\r\n` +
                `${field.value}\r\n`
        );
    }

    for (const attachment of attachments) {
        yield Buffer.from(
            `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${escapeMultipartName(attachment.name)}"; filename="${escapeMultipartName(attachment.name)}"\r\n` +
                'Content-Type: application/octet-stream\r\n\r\n'
        );
        yield* readUploadValue(attachment.value);
        yield Buffer.from('\r\n');
    }

    yield Buffer.from(`--${boundary}--\r\n`);
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

    const boundary = `----vibegram-${randomBytes(16).toString('hex')}`;

    return {
        body: createMultipartBody(fields, [...attachments, ...nestedAttachments], boundary),
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        isMultipart: true,
    };
}
