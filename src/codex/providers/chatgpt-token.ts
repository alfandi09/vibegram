/**
 * ChatGPT Token Provider — uses a Bearer access_token from a Codex/ChatGPT auth JSON.
 *
 * EXPERIMENTAL. This provider targets the ChatGPT internal backend API
 * (`chatgpt.com/backend-api/codex/responses`), NOT the public OpenAI platform API.
 *
 * The session token from Codex auth.json is ONLY accepted by the ChatGPT
 * backend, not by api.openai.com. This provider handles that automatically.
 *
 * Auth JSON format (dari Codex / ~/.codex/auth.json):
 * {
 *   "auth_mode": "chatgpt",
 *   "tokens": {
 *     "access_token": "eyJ...",
 *     "refresh_token": "rt_...",
 *     "id_token": "eyJ..."
 *   }
 * }
 *
 * @warning Token ini berumur pendek (~10 hari). Ketika expired, provider akan
 *          melempar error yang bisa ditangkap oleh plugin dan disampaikan ke user.
 * @warning Endpoint internal ChatGPT bisa berubah tanpa pemberitahuan.
 *          Provider ini hanya untuk eksperimen pribadi.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createHttpTransport, HttpRequestError, type HttpTransport } from '../../http';
import {
    CodexProvider,
    CodexAskInput,
    CodexAskResult,
    CodexStatusResult,
    CodexModelInfo,
    CodexMessage,
} from '../types';

// ---------------------------------------------------------------------------
// Auth JSON shapes
// ---------------------------------------------------------------------------

export interface CodexAuthJson {
    auth_mode: string;
    tokens?: {
        access_token?: string;
        id_token?: string;
        refresh_token?: string;
        account_id?: string;
    };
    last_refresh?: string;
}

// ---------------------------------------------------------------------------
// Provider options
// ---------------------------------------------------------------------------

export interface CodexProviderOptions {
    /**
     * Direct Bearer access_token (from tokens.access_token in auth JSON).
     * If omitted, `authJsonPath` will be used to load it from disk.
     */
    accessToken?: string;

    /**
     * Absolute path to the Codex auth JSON file.
     * Common locations:
     *   - Windows: %USERPROFILE%\\.codex\\auth.json
     *   - Linux/Mac: ~/.codex/auth.json
     *
     * If neither `accessToken` nor `authJsonPath` is provided, defaults to
     * the Codex default location for the current OS.
     */
    authJsonPath?: string;

    /**
     * Model to request. Must be a model accessible from your ChatGPT subscription.
     * @default 'gpt-5.3-codex'
     */
    model?: string;

    /**
     * Optional reasoning effort for reasoning models on the Responses API.
     * Mirrors Codex-style model settings when using models such as `gpt-5.4`.
     */
    reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';

    /**
     * Request timeout in ms. @default 60000
     */
    timeoutMs?: number;

    /**
     * Max retry attempts for transient 5xx errors. @default 2
     */
    maxRetries?: number;

    /**
     * Enable auto-refresh of expired access tokens using the refresh_token
     * from auth.json. When enabled, the provider will automatically call
     * auth.openai.com/oauth/token to get a new access_token before it expires.
     *
     * Also updates the auth.json file on disk with the new tokens.
     *
     * @default true (if refresh_token is available)
     */
    autoRefresh?: boolean;

    /**
     * ChatGPT backend API base URL.
     *
     * Codex CLI uses `chatgpt.com/backend-api/codex` for session-token auth.
     * The public `api.openai.com` rejects session tokens — they require API keys.
     *
     * @default 'https://chatgpt.com/backend-api/codex'
     */
    baseUrl?: string;

    /**
     * Optional ChatGPT account ID sent as `Chatgpt-Account-Id`.
     *
     * If omitted, the provider tries `tokens.account_id` first, then the
     * `chatgpt_account_id` claim from the access token.
     */
    accountId?: string;

    /**
     * @deprecated Use `accountId`. Kept as an alias for early experimental code.
     */
    organizationId?: string;

    /**
     * Custom device ID for the `oai-device-id` header.
     * If omitted, a random UUID v4 is generated per provider instance.
     */
    deviceId?: string;
}

// ---------------------------------------------------------------------------
// JWT helper — decode claims without verifying signature
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return {};
        const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
        return JSON.parse(payload);
    } catch {
        return {};
    }
}

function isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    const exp = payload['exp'] as number | undefined;
    if (!exp) return false; // can't determine — assume valid
    return Date.now() / 1000 > exp - 60; // 60s grace window
}

function getTokenExpiresAt(token: string): string | undefined {
    const payload = decodeJwtPayload(token);
    const exp = payload['exp'] as number | undefined;
    if (!exp) return undefined;
    return new Date(exp * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Codex auth JSON loader
// ---------------------------------------------------------------------------

function defaultAuthJsonPath(): string {
    const home =
        process.env.USERPROFILE ||   // Windows
        process.env.HOME ||          // Unix
        '~';
    return path.join(home, '.codex', 'auth.json');
}

function loadAuthJson(filePath: string): CodexAuthJson {
    if (!fs.existsSync(filePath)) {
        throw new Error(
            `[vibegram/codex] codexProvider: auth JSON not found at "${filePath}". ` +
            'Please provide accessToken directly or run `codex` to authenticate.'
        );
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as CodexAuthJson;
    } catch {
        throw new Error(
            `[vibegram/codex] codexProvider: Failed to parse auth JSON at "${filePath}".`
        );
    }
}

// ---------------------------------------------------------------------------
// Token refresh via OAuth2 (auth.openai.com)
// ---------------------------------------------------------------------------

/** OpenAI's OAuth token endpoint (same as Codex CLI uses) */
const AUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token';

/** ChatGPT OAuth client ID extracted from Codex CLI / ChatGPT web app */
const CHATGPT_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';

interface RefreshResult {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    token_type: string;
    expires_in?: number;
}

interface SseUsage {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function joinUrl(baseUrl: string, endpoint: string): string {
    return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

function getHttpStatus(error: unknown): number | undefined {
    return error instanceof HttpRequestError ? error.status : undefined;
}

function getHttpResponseData(error: unknown): unknown {
    return error instanceof HttpRequestError ? error.responseData : undefined;
}

function getHttpResponseHeaders(error: unknown): Record<string, string> | undefined {
    return error instanceof HttpRequestError ? error.responseHeaders : undefined;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown request failure';
}

function readErrorDetail(data: unknown, fallback: string): string {
    if (isRecord(data)) {
        const record = data;
        const nestedError = record.error;

        if (typeof record.error_description === 'string') return record.error_description;
        if (typeof record.detail === 'string') return record.detail;
        if (typeof record.message === 'string') return record.message;
        if (typeof nestedError === 'string') return nestedError;

        if (isRecord(nestedError)) {
            const nested = nestedError;
            if (typeof nested.message === 'string') return nested.message;
        }
    }

    return fallback;
}

function parseUsage(value: unknown): SseUsage | undefined {
    if (!isRecord(value)) return undefined;

    return {
        input_tokens: typeof value.input_tokens === 'number' ? value.input_tokens : undefined,
        output_tokens: typeof value.output_tokens === 'number' ? value.output_tokens : undefined,
        total_tokens: typeof value.total_tokens === 'number' ? value.total_tokens : undefined,
    };
}

function extractOutputText(output: unknown): string {
    if (!Array.isArray(output)) return '';

    const chunks: string[] = [];
    for (const item of output) {
        if (!isRecord(item) || !Array.isArray(item.content)) continue;

        for (const content of item.content) {
            if (isRecord(content) && typeof content.text === 'string') {
                chunks.push(content.text);
            }
        }
    }

    return chunks.join('\n').trim();
}

async function refreshAccessToken(
    refreshToken: string,
    transport: HttpTransport
): Promise<RefreshResult> {
    try {
        const response = await transport.postJson<RefreshResult>(
            AUTH_TOKEN_URL,
            {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: CHATGPT_CLIENT_ID,
            },
            {
                timeoutMs: 15_000,
            }
        );
        return response.data as RefreshResult;
    } catch (err) {
        const status = getHttpStatus(err);
        const detail = readErrorDetail(getHttpResponseData(err), getErrorMessage(err));
        throw new Error(
            `[vibegram/codex] Token refresh failed (${status ?? 'network'}): ${detail}. ` +
            'Try running `codex login` to re-authenticate.'
        );
    }
}

function saveAuthJson(filePath: string, authJson: CodexAuthJson): void {
    try {
        fs.writeFileSync(filePath, JSON.stringify(authJson, null, 2), 'utf-8');
    } catch {
        // Non-fatal — token refresh still works, just won't persist
        console.warn('[vibegram/codex] Warning: Could not update auth.json on disk after token refresh.');
    }
}

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

/**
 * ChatGPT backend base URL used by Codex CLI when authenticated via
 * `codex login` (ChatGPT subscription mode).
 */
const CHATGPT_BACKEND_BASE_URL = 'https://chatgpt.com/backend-api/codex';

export function codexProvider(opts: CodexProviderOptions = {}): CodexProvider {
    const model = opts.model ?? 'gpt-5.3-codex';
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const maxRetries = opts.maxRetries ?? 2;
    const baseUrl = opts.baseUrl ?? CHATGPT_BACKEND_BASE_URL;
    const authJsonPath = opts.authJsonPath ?? defaultAuthJsonPath();
    const transport = createHttpTransport();

    // Generate a stable device ID per provider instance (mimics Codex CLI behavior)
    const deviceId = opts.deviceId ?? crypto.randomUUID();

    // Resolve access token — inline > auth JSON file > default path
    let resolvedToken: string;
    let resolvedRefreshToken: string | undefined;
    let resolvedAccountId: string | undefined;

    if (opts.accessToken) {
        resolvedToken = opts.accessToken;
    } else {
        const authJson = loadAuthJson(authJsonPath);

        if (!authJson.tokens?.access_token) {
            throw new Error(
                `[vibegram/codex] codexProvider: No access_token found in "${authJsonPath}". ` +
                'Make sure auth_mode is "chatgpt" and tokens.access_token is present.'
            );
        }

        resolvedToken = authJson.tokens.access_token;
        resolvedRefreshToken = authJson.tokens.refresh_token;
        resolvedAccountId = authJson.tokens.account_id;
    }

    // Auto-refresh enabled if refresh_token is available (unless explicitly disabled)
    const autoRefresh = (opts.autoRefresh ?? true) && !!resolvedRefreshToken;
    let isRefreshing = false; // Prevent concurrent refresh attempts

    // Extract ChatGPT account metadata from JWT if not manually provided.
    let jwtPayload = decodeJwtPayload(resolvedToken);
    let authClaims = jwtPayload['https://api.openai.com/auth'] as Record<string, unknown> | undefined;
    const accountId =
        opts.accountId ??
        opts.organizationId ??
        resolvedAccountId ??
        (authClaims?.chatgpt_account_id as string | undefined);

    function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${resolvedToken}`,
            'Content-Type': 'application/json',
            'oai-device-id': deviceId,
            'oai-language': 'en',
            'User-Agent': 'vibegram-codex/0.1.0',
            ...extra,
        };

        if (accountId) {
            headers['Chatgpt-Account-Id'] = accountId;
        }

        return headers;
    }

    // -------------------------------------------------------------------------
    // Auto-refresh logic
    // -------------------------------------------------------------------------

    async function tryRefreshToken(): Promise<boolean> {
        if (!autoRefresh || !resolvedRefreshToken || isRefreshing) return false;

        isRefreshing = true;
        try {
            console.log('[vibegram/codex] Access token expired, attempting auto-refresh...');
            const result = await refreshAccessToken(resolvedRefreshToken, transport);

            // Update in-memory token
            resolvedToken = result.access_token;
            if (result.refresh_token) {
                resolvedRefreshToken = result.refresh_token;
            }

            // Update JWT claims from new token
            jwtPayload = decodeJwtPayload(resolvedToken);
            authClaims = jwtPayload['https://api.openai.com/auth'] as Record<string, unknown> | undefined;

            // Persist to auth.json on disk
            try {
                const currentAuth = loadAuthJson(authJsonPath);
                if (currentAuth.tokens) {
                    currentAuth.tokens.access_token = resolvedToken;
                    if (result.refresh_token) {
                        currentAuth.tokens.refresh_token = result.refresh_token;
                    }
                    if (result.id_token) {
                        currentAuth.tokens.id_token = result.id_token;
                    }
                }
                currentAuth.last_refresh = new Date().toISOString();
                saveAuthJson(authJsonPath, currentAuth);
            } catch {
                // Non-fatal: in-memory token is already updated
            }

            const newExpiry = getTokenExpiresAt(resolvedToken);
            console.log(`[vibegram/codex] Token refreshed successfully. New expiry: ${newExpiry ?? 'unknown'}`);
            return true;
        } catch (err) {
            console.error(`[vibegram/codex] Auto-refresh failed: ${(err as Error).message}`);
            return false;
        } finally {
            isRefreshing = false;
        }
    }

    // -------------------------------------------------------------------------
    // Error normalization
    // -------------------------------------------------------------------------

    function normalizeError(err: unknown, input: CodexAskInput): Error {
        const status = getHttpStatus(err);

        if (status === 401) {
            if (!isTokenExpired(resolvedToken)) {
                const expiresAt = getTokenExpiresAt(resolvedToken);
                return new Error(
                    '[vibegram/codex] ChatGPT backend returned 401. Token expires ' +
                    (expiresAt ?? 'unknown') + '. ' +
                    'The backend may require additional security tokens (sentinel/proof-of-work) ' +
                    'that this experimental provider cannot reproduce. ' +
                    'Try refreshing your Codex auth: `codex login`.'
                );
            }
            return new Error(
                '[vibegram/codex] ChatGPT access_token has expired. ' +
                'Please re-authenticate: run `codex login` or update your auth.json.'
            );
        }

        if (status === 403) {
            return new Error(
                `[vibegram/codex] ChatGPT: Access denied (403). ` +
                `Your subscription may not have access to model "${input.model ?? model}". ` +
                'Or the backend detected non-standard client behavior.'
            );
        }

        if (status === 429) {
            return new Error(
                '[vibegram/codex] ChatGPT: Rate limited (429). ' +
                'You may have exceeded your subscription usage limits. Please wait and try again.'
            );
        }

        // Cloudflare blocks (503 with challenge)
        if (status === 503) {
            const body = String(getHttpResponseData(err) ?? '').toLowerCase();
            if (body.includes('cloudflare') || body.includes('challenge')) {
                return new Error(
                    '[vibegram/codex] ChatGPT backend is behind Cloudflare protection. ' +
                    'Automated access was blocked. This is a known limitation of the experimental provider.'
                );
            }
        }

        const message = readErrorDetail(getHttpResponseData(err), getErrorMessage(err));
        const requestId = getHttpResponseHeaders(err)?.['x-request-id'];
        const suffix = requestId ? ` request=${requestId}` : '';
        return new Error(
            `[vibegram/codex] ChatGPT backend error (${status ?? 'network'}): ${message}${suffix}`
        );
    }

    // -------------------------------------------------------------------------
    // Request with retry (streaming — ChatGPT backend requires stream:true)
    // -------------------------------------------------------------------------

    async function postStreamWithRetry(
        endpoint: string,
        payload: Record<string, unknown>,
        input: CodexAskInput,
        attempt = 0
    ): Promise<string> {
        try {
            const response = await transport.request<string>({
                method: 'POST',
                url: joinUrl(baseUrl, endpoint),
                signal: input.signal,
                timeoutMs,
                responseType: 'text',
                headers: buildHeaders({
                    'Accept': 'text/event-stream',
                }),
                body: JSON.stringify(payload),
            });
            return response.data as string;
        } catch (err) {
            const status = getHttpStatus(err);

            // Retry on network errors and 5xx (except 503 cloudflare)
            if (
                !input.signal?.aborted &&
                attempt < maxRetries &&
                (!status || (status >= 500 && status !== 503))
            ) {
                await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
                return postStreamWithRetry(endpoint, payload, input, attempt + 1);
            }

            throw normalizeError(err, input);
        }
    }

    // -------------------------------------------------------------------------
    // SSE parser — extract events from Server-Sent Events text
    // -------------------------------------------------------------------------

    function parseSseEvents(raw: string): Array<{ event?: string; data: string }> {
        const events: Array<{ event?: string; data: string }> = [];
        const normalized = raw.replace(/\r\n/g, '\n');
        const blocks = normalized.split('\n\n');

        for (const block of blocks) {
            const lines = block.split('\n');
            let eventType: string | undefined;
            const dataLines: string[] = [];

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    eventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    dataLines.push(line.slice(5).trim());
                }
            }

            if (dataLines.length > 0) {
                events.push({ event: eventType, data: dataLines.join('\n') });
            }
        }

        return events;
    }

    // -------------------------------------------------------------------------
    // Responses API helpers
    // -------------------------------------------------------------------------

    function getSystemPrompt(messages: CodexAskInput['messages']): string | undefined {
        return messages.find((m: CodexMessage) => m.role === 'system')?.content;
    }

    function getResponsesInput(messages: CodexAskInput['messages']) {
        return messages
            .filter((m: CodexMessage) => m.role !== 'system')
            .map((m: CodexMessage) => ({
                role: m.role,
                content: m.content,
            }));
    }

    // -------------------------------------------------------------------------
    // Core ask function — Responses API format (streaming SSE)
    // -------------------------------------------------------------------------

    async function askResponses(input: CodexAskInput): Promise<CodexAskResult> {
        const payload: Record<string, unknown> = {
            model: input.model ?? model,
            instructions: input.systemPrompt ?? getSystemPrompt(input.messages),
            input: getResponsesInput(input.messages),
            store: false,    // Required by ChatGPT backend
            stream: true,    // Required by ChatGPT backend — only streaming supported
        };

        if (opts.reasoningEffort) {
            payload.reasoning = { effort: opts.reasoningEffort };
        }

        const rawSse = await postStreamWithRetry('/responses', payload, input);

        // Parse SSE events and extract the final result
        const events = parseSseEvents(rawSse);

        let resultText = '';
        let resultModel: string | undefined;
        let usage: SseUsage | undefined;

        // Collect text from SSE events
        for (const evt of events) {
            if (evt.data === '[DONE]') continue;

            let parsed: unknown;
            try {
                parsed = JSON.parse(evt.data);
            } catch {
                continue; // skip non-JSON lines
            }

            if (!isRecord(parsed)) continue;

            // response.completed — final event with full response
            if (evt.event === 'response.completed' && isRecord(parsed.response)) {
                const resp = parsed.response;
                resultModel = typeof resp.model === 'string' ? resp.model : undefined;
                usage = parseUsage(resp.usage);

                // Extract text from output
                if (typeof resp.output_text === 'string') {
                    resultText = resp.output_text;
                } else {
                    resultText = extractOutputText(resp.output);
                }
                break; // response.completed is the final event
            }

            // response.output_text.delta — incremental text chunks
            if (evt.event === 'response.output_text.delta' && typeof parsed.delta === 'string') {
                resultText += parsed.delta;
            }

            // Track model from response.created
            if (evt.event === 'response.created' && isRecord(parsed.response)) {
                const createdModel = parsed.response.model;
                if (typeof createdModel === 'string') {
                    resultModel = createdModel;
                }
            }
        }

        if (!resultText) {
            // Fallback: try to find any text in the raw events
            for (const evt of events) {
                if (evt.data === '[DONE]') continue;
                try {
                    const parsed = JSON.parse(evt.data);
                    if (!isRecord(parsed)) continue;
                    if (typeof parsed.text === 'string') { resultText = parsed.text; break; }
                    if (typeof parsed.content === 'string') { resultText = parsed.content; break; }
                } catch { /* skip */ }
            }
        }

        if (!resultText) {
            throw new Error(
                '[vibegram/codex] ChatGPT backend returned empty response. ' +
                `Received ${events.length} SSE events but no text output.`
            );
        }

        return {
            text: resultText,
            model: resultModel ?? input.model ?? model,
            usage: usage
                ? {
                      inputTokens: usage.input_tokens,
                      outputTokens: usage.output_tokens,
                      totalTokens: usage.total_tokens,
                  }
                : undefined,
            raw: { events: events.length },
        };
    }

    // -------------------------------------------------------------------------
    // Public provider object
    // -------------------------------------------------------------------------

    return {
        name: 'codex',

        ask: async (input) => {
            // Auto-refresh if token is expired and refresh_token is available
            if (isTokenExpired(resolvedToken)) {
                if (autoRefresh && resolvedRefreshToken) {
                    const refreshed = await tryRefreshToken();
                    if (!refreshed) {
                        throw new Error(
                            '[vibegram/codex] Access token has expired and auto-refresh failed. ' +
                            'Please re-authenticate (run `codex login` or update your auth JSON).'
                        );
                    }
                } else {
                    throw new Error(
                        '[vibegram/codex] Access token has expired. ' +
                        (resolvedRefreshToken
                            ? 'Auto-refresh is disabled. Enable it or '
                            : 'No refresh_token available. ') +
                        'Please re-authenticate (run `codex login` or update your auth JSON).'
                    );
                }
            }
            return askResponses(input);
        },

        async status(): Promise<CodexStatusResult> {
            const expired = isTokenExpired(resolvedToken);

            return {
                connected: !expired,
                provider: 'codex',
                model,
                extra: {
                    expired,
                    expiresAt: getTokenExpiresAt(resolvedToken),
                    endpoint: baseUrl,
                    deviceId,
                    autoRefresh,
                    planType: (authClaims?.chatgpt_plan_type as string) ?? undefined,
                    userId: (authClaims?.chatgpt_user_id as string) ?? undefined,
                    accountId,
                    ...(resolvedRefreshToken
                        ? { hasRefreshToken: true }
                        : {}),
                },
            };
        },

        async listModels(): Promise<CodexModelInfo[]> {
            // GPT-5 Codex series models (April 2026)
            return [
                { id: 'gpt-5.3-codex', displayName: 'GPT-5.3 Codex (agentic, default)' },
                { id: 'gpt-5.3-codex-spark', displayName: 'GPT-5.3 Codex Spark (low-latency)' },
                { id: 'gpt-5.5', displayName: 'GPT-5.5 (flagship)' },
                { id: 'gpt-5.4', displayName: 'GPT-5.4 Thinking' },
                { id: 'gpt-5.4-mini', displayName: 'GPT-5.4 mini' },
                { id: 'gpt-5.3', displayName: 'GPT-5.3 Instant' },
            ];
        },
    };
}

/**
 * Convenience: load provider directly from a Codex auth JSON object.
 *
 * @example
 * ```ts
 * import authData from '/path/to/auth.json';
 * const provider = codexProviderFromJson(authData);
 * ```
 */
export function codexProviderFromJson(
    authJson: CodexAuthJson,
    opts?: Omit<CodexProviderOptions, 'accessToken' | 'authJsonPath'>
): CodexProvider {
    const accessToken = authJson.tokens?.access_token;
    if (!accessToken) {
        throw new Error('[vibegram/codex] codexProviderFromJson: No access_token in provided JSON.');
    }
    return codexProvider({ ...opts, accessToken });
}
