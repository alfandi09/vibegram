// Copied from vibegram core src/runtime.ts.
/**
 * Runtime-neutral helpers (internal, not part of the public barrel).
 *
 * The request path — JSON Bot API calls, update handling, and the Fetch API
 * webhook handler — must work on Node.js, Bun, Deno, Cloudflare Workers, and
 * other edge runtimes. These helpers use Web-standard APIs and only reach for
 * Node.js globals when they exist.
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface NodeBufferLike {
    byteLength(value: string, encoding: 'utf8'): number;
    isBuffer(value: unknown): boolean;
    from(value: Uint8Array): Uint8Array;
}

function getNodeBuffer(): NodeBufferLike | undefined {
    const candidate = (globalThis as { Buffer?: NodeBufferLike }).Buffer;
    return typeof candidate?.isBuffer === 'function' ? candidate : undefined;
}

/** UTF-8 byte length of a string, without requiring Node's Buffer. */
export function utf8ByteLength(value: string): number {
    const nodeBuffer = getNodeBuffer();
    return nodeBuffer ? nodeBuffer.byteLength(value, 'utf8') : textEncoder.encode(value).byteLength;
}

/** True for a Node.js Buffer. Always false on runtimes without Buffer. */
export function isNodeBuffer(value: unknown): value is Buffer {
    return getNodeBuffer()?.isBuffer(value) ?? false;
}

/** Concatenate byte chunks into one Uint8Array. */
export function concatBytes(chunks: readonly Uint8Array[], totalBytes: number): Uint8Array {
    const result = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return result;
}

/** Decode UTF-8 bytes to a string. */
export function decodeUtf8(bytes: Uint8Array): string {
    return textDecoder.decode(bytes);
}

/** Returns a Node.js Buffer view when Buffer exists, otherwise the bytes unchanged. */
export function toBufferIfAvailable(bytes: Uint8Array): Uint8Array {
    const nodeBuffer = getNodeBuffer();
    return nodeBuffer ? nodeBuffer.from(bytes) : bytes;
}

/**
 * Constant-time string comparison (for secret tokens). Only the length is
 * observable through timing, matching crypto.timingSafeEqual semantics.
 */
export function constantTimeEqual(actual: string, expected: string): boolean {
    const a = textEncoder.encode(actual);
    const b = textEncoder.encode(expected);
    if (a.byteLength !== b.byteLength) return false;

    let diff = 0;
    for (let index = 0; index < a.byteLength; index++) {
        diff |= a[index] ^ b[index];
    }
    return diff === 0;
}

function fillRandom(bytes: Uint8Array): Uint8Array {
    const webCrypto = (
        globalThis as { crypto?: { getRandomValues?(array: Uint8Array): Uint8Array } }
    ).crypto;
    if (typeof webCrypto?.getRandomValues === 'function') {
        return webCrypto.getRandomValues(bytes);
    }

    // Runtimes without the global Web Crypto object. These values are used
    // for multipart boundaries and draft ids, which need uniqueness, not secrecy.
    for (let index = 0; index < bytes.length; index++) {
        bytes[index] = Math.floor(Math.random() * 256);
    }
    return bytes;
}

/** Random lowercase hex string of `byteCount` random bytes. */
export function randomHex(byteCount: number): string {
    return Array.from(fillRandom(new Uint8Array(byteCount)), byte =>
        byte.toString(16).padStart(2, '0')
    ).join('');
}

/** Random integer in [min, max). */
export function randomInt(min: number, max: number): number {
    const [value] = new Uint32Array(fillRandom(new Uint8Array(4)).buffer);
    return min + (value % (max - min));
}

/** Last path segment of a file path, for both POSIX and Windows separators. */
export function pathBasename(filePath: string): string {
    const segments = filePath.split(/[\\/]/).filter(Boolean);
    return segments[segments.length - 1] ?? filePath;
}

/**
 * Load a Node.js built-in module on demand. The specifier is passed through a
 * variable so edge bundlers do not try to resolve it when the code path that
 * needs it (file downloads, the built-in webhook server) is never used.
 */
export async function loadNodeModule<T>(specifier: string): Promise<T> {
    const moduleId = specifier;
    const loaded = (await import(moduleId)) as T & { default?: T };
    return (loaded.default ?? loaded) as T;
}
