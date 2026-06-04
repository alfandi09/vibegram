import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { afterEach, describe, expect, it } from 'vitest';
import { createHttpTransport, HttpRequestError } from '../src/http';

let server: ReturnType<typeof createServer> | undefined;

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

async function startServer(
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
): Promise<string> {
    server = createServer((req, res) => {
        Promise.resolve(handler(req, res)).catch(error => {
            res.statusCode = 500;
            res.end(String(error));
        });
    });

    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to start test server.');
    }

    return `http://127.0.0.1:${address.port}`;
}

async function readStream(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
}

afterEach(async () => {
    if (!server) return;
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
});

describe('HTTP transport', () => {
    it('should parse JSON responses when responseType is json', async () => {
        const baseUrl = await startServer((_, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true, value: 42 }));
        });
        const transport = createHttpTransport();

        const response = await transport.request<{ ok: boolean; value: number }>({
            url: `${baseUrl}/json`,
            responseType: 'json',
        });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.data).toEqual({ ok: true, value: 42 });
    });

    it('should return raw text when responseType is text', async () => {
        const baseUrl = await startServer((_, res) => {
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('plain response');
        });
        const transport = createHttpTransport();

        await expect(
            transport.request<string>({ url: `${baseUrl}/text`, responseType: 'text' })
        ).resolves.toMatchObject({
            status: 200,
            data: 'plain response',
        });
    });

    it('should return a Buffer when responseType is buffer', async () => {
        const baseUrl = await startServer((_, res) => {
            res.writeHead(200, { 'content-type': 'application/octet-stream' });
            res.end(Buffer.from([1, 2, 3]));
        });
        const transport = createHttpTransport();

        const response = await transport.request<Buffer>({
            url: `${baseUrl}/buffer`,
            responseType: 'buffer',
        });

        expect(Buffer.isBuffer(response.data)).toBe(true);
        expect([...response.data]).toEqual([1, 2, 3]);
    });

    it('should return a Node readable stream when responseType is stream', async () => {
        const baseUrl = await startServer((_, res) => {
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.write('stream ');
            res.end('response');
        });
        const transport = createHttpTransport();

        const response = await transport.request<NodeJS.ReadableStream>({
            url: `${baseUrl}/stream`,
            responseType: 'stream',
        });

        await expect(readStream(response.data)).resolves.toBe('stream response');
    });

    it('should throw HttpRequestError with status and data for non-2xx responses', async () => {
        const baseUrl = await startServer((_, res) => {
            res.writeHead(418, {
                'content-type': 'application/json',
                'x-request-id': 'request-123',
            });
            res.end(JSON.stringify({ error: 'teapot' }));
        });
        const transport = createHttpTransport();

        await expect(
            transport.request({ url: `${baseUrl}/error`, responseType: 'json' })
        ).rejects.toMatchObject({
            name: 'HttpRequestError',
            status: 418,
            responseData: { error: 'teapot' },
            responseHeaders: expect.objectContaining({ 'x-request-id': 'request-123' }),
        });
    });

    it('should abort when timeoutMs is exceeded', async () => {
        const baseUrl = await startServer(async (_, res) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            res.end('late');
        });
        const transport = createHttpTransport();

        await expect(
            transport.request({ url: `${baseUrl}/slow`, timeoutMs: 10, responseType: 'text' })
        ).rejects.toBeInstanceOf(HttpRequestError);
    });

    it('should abort when the caller signal is aborted', async () => {
        const baseUrl = await startServer(async (_, res) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            res.end('late');
        });
        const transport = createHttpTransport();
        const controller = new AbortController();
        const request = transport.request({
            url: `${baseUrl}/abort`,
            signal: controller.signal,
            responseType: 'text',
        });

        controller.abort(new Error('caller aborted'));

        await expect(request).rejects.toBeInstanceOf(HttpRequestError);
    });

    it('should send JSON bodies through postJson', async () => {
        let capturedBody = '';
        let capturedContentType: string | undefined;
        const baseUrl = await startServer(async (req, res) => {
            capturedContentType = req.headers['content-type'];
            capturedBody = await readRequestBody(req);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        });
        const transport = createHttpTransport();

        const response = await transport.postJson<{ ok: boolean }>(`${baseUrl}/json`, {
            hello: 'world',
        });

        expect(response.data).toEqual({ ok: true });
        expect(capturedContentType).toContain('application/json');
        expect(JSON.parse(capturedBody)).toEqual({ hello: 'world' });
    });
});
