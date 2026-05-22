/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) for OpenAI/ChatGPT.
 *
 * Flow:
 *   1. POST /oauth/device/code  → { device_code, user_code, verification_uri }
 *   2. User opens verification_uri in a browser & enters user_code
 *   3. Poll POST /oauth/token until authorization_pending → access_token
 *   4. Save tokens to ~/.codex/auth.json (same format as Codex CLI)
 *
 * This enables Telegram bot users to authenticate directly from the chat
 * without needing to install Codex CLI or manually copy tokens.
 */

import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import type { CodexAuthJson } from '../providers/chatgpt-token.js';

// ---------------------------------------------------------------------------
// OpenAI OAuth constants (same as Codex CLI)
// ---------------------------------------------------------------------------

const AUTH_BASE = 'https://auth.openai.com';
const DEVICE_CODE_URL = `${AUTH_BASE}/oauth/device/code`;
const TOKEN_URL = `${AUTH_BASE}/oauth/token`;

/**
 * OAuth client ID used by Codex CLI for ChatGPT subscription auth.
 * This is a public client_id (no client_secret required for device flow).
 */
const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';

/** Scopes needed for Codex backend API access */
const SCOPE = 'openid profile email offline_access';

/** Audience for the ChatGPT backend API */
const AUDIENCE = 'https://api.openai.com/v1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeviceCodeResponse {
    /** Device code used for polling the token endpoint */
    device_code: string;
    /** Human-readable code the user must enter at the verification URL */
    user_code: string;
    /** URL the user should visit to enter the code */
    verification_uri: string;
    /** Full URL with code pre-filled (may not always be available) */
    verification_uri_complete?: string;
    /** How many seconds until the device_code expires */
    expires_in: number;
    /** Minimum polling interval in seconds */
    interval: number;
}

export interface DeviceCodeTokenResult {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    token_type: string;
    expires_in?: number;
    scope?: string;
}

export type DeviceCodePollStatus =
    | { state: 'pending' }
    | { state: 'slow_down'; newInterval: number }
    | { state: 'success'; tokens: DeviceCodeTokenResult }
    | { state: 'expired' }
    | { state: 'error'; message: string };

export interface DeviceLoginCallbacks {
    /**
     * Called when the device code is obtained.
     * Show the user_code and verification_uri to the user.
     */
    onCode(info: {
        userCode: string;
        verificationUri: string;
        verificationUriComplete?: string;
        expiresIn: number;
    }): void | Promise<void>;

    /**
     * Called on each poll tick. Useful for sending "still waiting..." updates.
     * Return false to cancel the flow.
     */
    onPoll?(attempt: number, elapsed: number): boolean | Promise<boolean>;

    /** Called on successful authentication. */
    onSuccess?(tokens: DeviceCodeTokenResult): void | Promise<void>;

    /** Called on failure (timeout, error, etc.) */
    onError?(error: Error): void | Promise<void>;
}

export interface DeviceLoginOptions {
    /** Override the default auth JSON save path */
    authJsonPath?: string;
    /** Max time to wait for user to authorize (ms). @default 300000 (5 min) */
    timeoutMs?: number;
    /** Custom client ID (for testing) */
    clientId?: string;
    /** Custom scope */
    scope?: string;
    /** Custom audience */
    audience?: string;
    /** If true, don't save tokens to disk */
    skipSave?: boolean;
}

// ---------------------------------------------------------------------------
// Step 1: Request device code
// ---------------------------------------------------------------------------

export async function requestDeviceCode(
    opts: Pick<DeviceLoginOptions, 'clientId' | 'scope' | 'audience'> = {}
): Promise<DeviceCodeResponse> {
    try {
        const response = await axios.post(DEVICE_CODE_URL, {
            client_id: opts.clientId ?? CLIENT_ID,
            scope: opts.scope ?? SCOPE,
            audience: opts.audience ?? AUDIENCE,
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15_000,
        });
        return response.data as DeviceCodeResponse;
    } catch (err) {
        const e = err as AxiosError;
        const data = e.response?.data as any;
        const detail = data?.error_description ?? data?.error ?? e.message;
        throw new Error(`[vibegram/codex] Device code request failed: ${detail}`);
    }
}

// ---------------------------------------------------------------------------
// Step 2: Poll token endpoint
// ---------------------------------------------------------------------------

export async function pollDeviceToken(
    deviceCode: string,
    opts: Pick<DeviceLoginOptions, 'clientId'> = {}
): Promise<DeviceCodePollStatus> {
    try {
        const response = await axios.post(TOKEN_URL, {
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            device_code: deviceCode,
            client_id: opts.clientId ?? CLIENT_ID,
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15_000,
        });
        return {
            state: 'success',
            tokens: response.data as DeviceCodeTokenResult,
        };
    } catch (err) {
        const e = err as AxiosError;
        const data = e.response?.data as any;
        const errorCode = data?.error;

        switch (errorCode) {
            case 'authorization_pending':
                return { state: 'pending' };
            case 'slow_down':
                return {
                    state: 'slow_down',
                    newInterval: (data?.interval ?? 10),
                };
            case 'expired_token':
            case 'access_denied':
                return { state: 'expired' };
            default: {
                const detail = data?.error_description ?? data?.error ?? e.message;
                return { state: 'error', message: detail };
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Step 3: Save tokens to auth.json (Codex CLI compatible)
// ---------------------------------------------------------------------------

function defaultAuthJsonPath(): string {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? '~';
    return path.join(home, '.codex', 'auth.json');
}

export function saveDeviceTokens(
    tokens: DeviceCodeTokenResult,
    savePath?: string
): string {
    const filePath = savePath ?? defaultAuthJsonPath();
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const authJson: CodexAuthJson = {
        auth_mode: 'chatgpt',
        tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            id_token: tokens.id_token,
        },
        last_refresh: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(authJson, null, 2), 'utf-8');
    return filePath;
}

// ---------------------------------------------------------------------------
// Full device login flow (convenience function)
// ---------------------------------------------------------------------------

/**
 * Runs the full OAuth Device Code flow:
 *   1. Requests a device code from OpenAI
 *   2. Calls onCode callback so the caller can show the code to the user
 *   3. Polls until user authorizes, timeout, or error
 *   4. Saves tokens to auth.json
 *   5. Returns the token result
 *
 * @example
 * ```ts
 * const tokens = await deviceLogin({
 *   onCode({ userCode, verificationUri }) {
 *     ctx.reply(`🔐 Open ${verificationUri} and enter code: ${userCode}`);
 *   },
 *   onSuccess() {
 *     ctx.reply('✅ Login successful!');
 *   },
 * });
 * ```
 */
export async function deviceLogin(
    callbacks: DeviceLoginCallbacks,
    opts: DeviceLoginOptions = {}
): Promise<DeviceCodeTokenResult> {
    const timeoutMs = opts.timeoutMs ?? 300_000; // 5 minutes

    // Step 1: Request device code
    const codeResponse = await requestDeviceCode(opts);

    // Step 2: Notify caller with the code
    await callbacks.onCode({
        userCode: codeResponse.user_code,
        verificationUri: codeResponse.verification_uri,
        verificationUriComplete: codeResponse.verification_uri_complete,
        expiresIn: codeResponse.expires_in,
    });

    // Step 3: Poll for authorization
    let interval = (codeResponse.interval ?? 5) * 1000; // ms
    const deadline = Date.now() + Math.min(
        codeResponse.expires_in * 1000,
        timeoutMs
    );
    let attempt = 0;
    const startTime = Date.now();

    while (Date.now() < deadline) {
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, interval));

        attempt++;

        // Optional poll callback
        if (callbacks.onPoll) {
            const shouldContinue = await callbacks.onPoll(attempt, Date.now() - startTime);
            if (shouldContinue === false) {
                const cancelErr = new Error('[vibegram/codex] Login cancelled by user.');
                await callbacks.onError?.(cancelErr);
                throw cancelErr;
            }
        }

        const result = await pollDeviceToken(codeResponse.device_code, opts);

        switch (result.state) {
            case 'success': {
                // Step 4: Save tokens
                if (!opts.skipSave) {
                    try {
                        saveDeviceTokens(result.tokens, opts.authJsonPath);
                    } catch (saveErr) {
                        console.warn(
                            `[vibegram/codex] Could not save auth.json: ${(saveErr as Error).message}`
                        );
                    }
                }

                await callbacks.onSuccess?.(result.tokens);
                return result.tokens;
            }

            case 'pending':
                // Keep polling
                break;

            case 'slow_down':
                interval = result.newInterval * 1000;
                break;

            case 'expired': {
                const expErr = new Error(
                    '[vibegram/codex] Device code expired or access denied. Please try again.'
                );
                await callbacks.onError?.(expErr);
                throw expErr;
            }

            case 'error': {
                const err = new Error(`[vibegram/codex] Auth error: ${result.message}`);
                await callbacks.onError?.(err);
                throw err;
            }
        }
    }

    const timeoutErr = new Error(
        '[vibegram/codex] Login timed out. User did not authorize within the allowed time.'
    );
    await callbacks.onError?.(timeoutErr);
    throw timeoutErr;
}
