import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { afterEach, describe, expect, it } from 'vitest';
import { codexProvider } from '../src/providers/chatgpt-token.js';

type CapturedRequest = {
    method?: string;
    url?: string;
    headers: IncomingMessage['headers'];
    body: unknown;
};

let server: ReturnType<typeof createServer> | undefined;

function createJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

async function startSseServer(
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
) {
    server = createServer((req, res) => {
        handler(req, res).catch(err => {
            res.statusCode = 500;
            res.end(String(err));
        });
    });

    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('Failed to start test server.');
    }
    return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
    if (!server) return;
    await new Promise<void>(resolve => server!.close(() => resolve()));
    server = undefined;
});

describe('codexProvider', () => {
    it('should call the ChatGPT responses endpoint and parse SSE output', async () => {
        let captured: CapturedRequest | undefined;
        const baseUrl = await startSseServer(async (req, res) => {
            const rawBody = await readRequestBody(req);
            captured = {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: JSON.parse(rawBody),
            };

            res.writeHead(200, { 'content-type': 'text/event-stream' });
            res.end(
                [
                    'event: response.created',
                    'data: {"response":{"model":"gpt-5.3-codex"}}',
                    '',
                    'event: response.output_text.delta',
                    'data: {"delta":"Halo"}',
                    '',
                    'event: response.output_text.delta',
                    'data: {"delta":" dunia"}',
                    '',
                    'event: response.completed',
                    'data: {"response":{"output_text":"Halo dunia","model":"gpt-5.3-codex","usage":{"input_tokens":3,"output_tokens":2,"total_tokens":5}}}',
                    '',
                    '',
                ].join('\r\n')
            );
        });

        const accessToken = createJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            'https://api.openai.com/auth': {
                chatgpt_account_id: 'acct_from_claim',
                chatgpt_plan_type: 'plus',
            },
        });
        const provider = codexProvider({
            accessToken,
            baseUrl,
            deviceId: 'device-test',
            model: 'gpt-5.3-codex',
        });

        const result = await provider.ask({
            text: 'Halo',
            userId: 1,
            chatId: 2,
            conversationKey: 'user:1',
            messages: [{ role: 'user', content: 'Halo' }],
        });

        expect(result).toMatchObject({
            text: 'Halo dunia',
            model: 'gpt-5.3-codex',
            usage: {
                inputTokens: 3,
                outputTokens: 2,
                totalTokens: 5,
            },
        });

        expect(captured).toBeDefined();
        expect(captured?.method).toBe('POST');
        expect(captured?.url).toBe('/responses');
        expect(captured?.headers.accept).toBe('text/event-stream');
        expect(captured?.headers['oai-device-id']).toBe('device-test');
        expect(captured?.headers['chatgpt-account-id']).toBe('acct_from_claim');
        expect(captured?.body).toMatchObject({
            model: 'gpt-5.3-codex',
            input: [{ role: 'user', content: 'Halo' }],
            store: false,
            stream: true,
        });
    });
});
