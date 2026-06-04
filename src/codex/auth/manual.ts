import * as fs from 'fs';
import * as path from 'path';
import type { CodexAuthJson } from '../providers/chatgpt-token';

export interface CodexAuthSummary {
    exists: boolean;
    authMode?: string;
    expiresAt?: string;
    expired?: boolean;
    hasRefreshToken?: boolean;
    planType?: string;
    sizeBytes?: number;
    updatedAt?: string;
}

type JsonObject = Record<string, unknown>;

function defaultAuthJsonPath(): string {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? '~';
    return path.join(home, '.codex', 'auth.json');
}

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeJwtPayload(token: string): JsonObject | undefined {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;

    try {
        const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed = JSON.parse(rawPayload) as unknown;
        return isJsonObject(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function getTokenExpiryMs(token: string): number | undefined {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    return typeof exp === 'number' ? exp * 1000 : undefined;
}

function getPlanType(token: string): string | undefined {
    const payload = decodeJwtPayload(token);
    const authClaims = payload?.['https://api.openai.com/auth'];
    if (!isJsonObject(authClaims)) return undefined;

    const planType = authClaims.chatgpt_plan_type;
    return typeof planType === 'string' ? planType : undefined;
}

function chmodPrivate(filePath: string): void {
    if (process.platform === 'win32') return;
    try {
        fs.chmodSync(filePath, 0o600);
    } catch {
        // Best-effort hardening. Some filesystems do not support chmod.
    }
}

export function validateCodexAuthJson(value: unknown): CodexAuthJson {
    if (!isJsonObject(value)) {
        throw new Error('[vibegram/codex] auth.json must be a JSON object.');
    }

    if (value.auth_mode !== 'chatgpt') {
        throw new Error('[vibegram/codex] auth.json auth_mode must be "chatgpt".');
    }

    if (!isJsonObject(value.tokens)) {
        throw new Error('[vibegram/codex] auth.json must include a tokens object.');
    }

    const accessToken = value.tokens.access_token;
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
        throw new Error('[vibegram/codex] auth.json must include tokens.access_token.');
    }

    const expiryMs = getTokenExpiryMs(accessToken);
    if (expiryMs !== undefined && expiryMs <= Date.now()) {
        throw new Error('[vibegram/codex] auth.json access_token is expired.');
    }

    const tokens: NonNullable<CodexAuthJson['tokens']> = {
        access_token: accessToken,
    };

    const refreshToken = value.tokens.refresh_token;
    if (typeof refreshToken === 'string') {
        tokens.refresh_token = refreshToken;
    }

    const idToken = value.tokens.id_token;
    if (typeof idToken === 'string') {
        tokens.id_token = idToken;
    }

    const accountId = value.tokens.account_id;
    if (typeof accountId === 'string') {
        tokens.account_id = accountId;
    }

    const authJson: CodexAuthJson = {
        auth_mode: 'chatgpt',
        tokens,
    };

    const lastRefresh = value.last_refresh;
    if (typeof lastRefresh === 'string') {
        authJson.last_refresh = lastRefresh;
    }

    return authJson;
}

export function saveCodexAuthJson(authJson: unknown, savePath?: string): string {
    const validated = validateCodexAuthJson(authJson);
    const filePath = savePath ?? defaultAuthJsonPath();
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
        filePath,
        JSON.stringify(
            {
                ...validated,
                last_refresh: new Date().toISOString(),
            },
            null,
            2
        ),
        'utf8'
    );
    chmodPrivate(filePath);
    return filePath;
}

export function readCodexAuthSummary(filePath?: string): CodexAuthSummary {
    const authJsonPath = filePath ?? defaultAuthJsonPath();
    if (!fs.existsSync(authJsonPath) || !fs.statSync(authJsonPath).isFile()) {
        return { exists: false };
    }

    const stat = fs.statSync(authJsonPath);
    try {
        const parsed = JSON.parse(fs.readFileSync(authJsonPath, 'utf8')) as unknown;
        if (!isJsonObject(parsed) || !isJsonObject(parsed.tokens)) {
            return {
                exists: true,
                sizeBytes: stat.size,
                updatedAt: stat.mtime.toISOString(),
            };
        }

        const accessToken =
            typeof parsed.tokens.access_token === 'string' ? parsed.tokens.access_token : undefined;
        const expiryMs = accessToken ? getTokenExpiryMs(accessToken) : undefined;

        return {
            exists: true,
            authMode: typeof parsed.auth_mode === 'string' ? parsed.auth_mode : undefined,
            expiresAt: expiryMs ? new Date(expiryMs).toISOString() : undefined,
            expired: expiryMs ? expiryMs <= Date.now() : undefined,
            hasRefreshToken: typeof parsed.tokens.refresh_token === 'string',
            planType: accessToken ? getPlanType(accessToken) : undefined,
            sizeBytes: stat.size,
            updatedAt: stat.mtime.toISOString(),
        };
    } catch {
        return {
            exists: true,
            sizeBytes: stat.size,
            updatedAt: stat.mtime.toISOString(),
        };
    }
}
