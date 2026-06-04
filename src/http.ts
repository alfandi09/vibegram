import { Readable } from 'stream';

export type HttpResponseType = 'json' | 'text' | 'buffer' | 'stream';

export interface HttpRequestOptions {
    method?: 'GET' | 'POST';
    url: string;
    headers?: Record<string, string>;
    body?: BodyInit | AsyncIterable<Uint8Array>;
    timeoutMs?: number;
    signal?: AbortSignal;
    responseType?: HttpResponseType;
}

export interface HttpResponse<T = unknown> {
    status: number;
    headers: Record<string, string>;
    data: T;
}

export class HttpRequestError extends Error {
    constructor(
        message: string,
        public readonly requestUrl: string,
        public readonly status?: number,
        public readonly responseData?: unknown,
        public readonly responseHeaders?: Record<string, string>,
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = 'HttpRequestError';
    }
}

export interface HttpTransport {
    request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>>;
    postJson<T = unknown>(
        url: string,
        body: unknown,
        options?: Omit<HttpRequestOptions, 'method' | 'url' | 'body' | 'responseType'>
    ): Promise<HttpResponse<T>>;
}

interface CompositeSignal {
    signal?: AbortSignal;
    cleanup(): void;
}

interface NodeRequestInit {
    method?: string;
    headers?: HeadersInit;
    signal?: AbortSignal;
    duplex?: 'half';
    body?: RequestInit['body'] | AsyncIterable<Uint8Array>;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown request failure';
}

function isAsyncIterableBody(body: unknown): body is AsyncIterable<Uint8Array> {
    return (
        typeof body === 'object' &&
        body !== null &&
        Symbol.asyncIterator in body &&
        typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function'
    );
}

function normalizeHeaders(headers: Headers): Record<string, string> {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
        normalized[key.toLowerCase()] = value;
    });
    return normalized;
}

function composeAbortSignal(timeoutMs?: number, signal?: AbortSignal): CompositeSignal {
    if (!timeoutMs && !signal) {
        return { cleanup: () => undefined };
    }

    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let removeAbortListener: (() => void) | undefined;

    const abort = (reason?: unknown) => {
        if (!controller.signal.aborted) {
            controller.abort(reason);
        }
    };

    if (timeoutMs && timeoutMs > 0) {
        timeout = setTimeout(
            () => abort(new Error(`Request timed out after ${timeoutMs}ms.`)),
            timeoutMs
        );
        timeout.unref?.();
    }

    if (signal) {
        if (signal.aborted) {
            abort(signal.reason);
        } else {
            const onAbort = () => abort(signal.reason);
            signal.addEventListener('abort', onAbort, { once: true });
            removeAbortListener = () => signal.removeEventListener('abort', onAbort);
        }
    }

    return {
        signal: controller.signal,
        cleanup() {
            if (timeout) clearTimeout(timeout);
            removeAbortListener?.();
        },
    };
}

async function parseJsonBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) return undefined;
    return JSON.parse(text);
}

async function parseResponseBody(
    response: Response,
    responseType: HttpResponseType
): Promise<unknown> {
    if (responseType === 'text') {
        return response.text();
    }

    if (responseType === 'buffer') {
        return Buffer.from(await response.arrayBuffer());
    }

    if (responseType === 'stream') {
        if (!response.body) {
            throw new Error('HTTP response does not contain a readable body.');
        }

        return Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    }

    return parseJsonBody(response);
}

async function parseErrorResponseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (text.length === 0) return undefined;

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    return text;
}

export function createHttpTransport(): HttpTransport {
    if (typeof globalThis.fetch !== 'function') {
        throw new Error('global fetch is not available in this Node.js runtime.');
    }

    async function request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
        const responseType = options.responseType ?? 'json';
        const method = options.method ?? (options.body === undefined ? 'GET' : 'POST');
        const compositeSignal = composeAbortSignal(options.timeoutMs, options.signal);
        const init: NodeRequestInit = {
            method,
            headers: options.headers,
            body: options.body,
            signal: compositeSignal.signal,
        };

        if (isAsyncIterableBody(options.body)) {
            init.duplex = 'half';
        }

        let response: Response;
        try {
            response = await globalThis.fetch(options.url, init as RequestInit);
        } catch (error) {
            throw new HttpRequestError(
                `Network Error: ${getErrorMessage(error)}`,
                options.url,
                undefined,
                undefined,
                undefined,
                error
            );
        } finally {
            compositeSignal.cleanup();
        }

        const headers = normalizeHeaders(response.headers);

        if (!response.ok) {
            const responseData = await parseErrorResponseBody(response);
            throw new HttpRequestError(
                `HTTP Error: ${response.status} ${response.statusText}`,
                options.url,
                response.status,
                responseData,
                headers
            );
        }

        try {
            const data = await parseResponseBody(response, responseType);
            return {
                status: response.status,
                headers,
                data: data as T,
            };
        } catch (error) {
            throw new HttpRequestError(
                `Failed to parse response body: ${getErrorMessage(error)}`,
                options.url,
                response.status,
                undefined,
                headers,
                error
            );
        }
    }

    return {
        request,
        postJson<T = unknown>(
            url: string,
            body: unknown,
            options?: Omit<HttpRequestOptions, 'method' | 'url' | 'body' | 'responseType'>
        ): Promise<HttpResponse<T>> {
            return request<T>({
                ...options,
                method: 'POST',
                url,
                headers: {
                    'content-type': 'application/json',
                    ...options?.headers,
                },
                body: JSON.stringify(body),
                responseType: 'json',
            });
        },
    };
}
