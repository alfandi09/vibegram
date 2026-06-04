import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    readCodexAuthSummary,
    saveCodexAuthJson,
    validateCodexAuthJson,
} from '../src/codex/auth/manual';

const tmpDirs: string[] = [];

function createJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

function createTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibegram-codex-auth-'));
    tmpDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe('manual Codex auth.json helpers', () => {
    it('should validate and save a Codex auth.json file', () => {
        const dir = createTmpDir();
        const authJsonPath = path.join(dir, 'nested', 'auth.json');
        const accessToken = createJwt({
            exp: Math.floor(Date.now() / 1000) + 3600,
            'https://api.openai.com/auth': {
                chatgpt_plan_type: 'plus',
            },
        });

        const filePath = saveCodexAuthJson(
            {
                auth_mode: 'chatgpt',
                tokens: {
                    access_token: accessToken,
                    refresh_token: 'refresh-token',
                },
            },
            authJsonPath
        );

        expect(filePath).toBe(authJsonPath);
        const saved = JSON.parse(fs.readFileSync(authJsonPath, 'utf8')) as {
            auth_mode?: string;
            tokens?: { access_token?: string; refresh_token?: string };
            last_refresh?: string;
        };
        expect(saved).toMatchObject({
            auth_mode: 'chatgpt',
            tokens: {
                access_token: accessToken,
                refresh_token: 'refresh-token',
            },
        });
        expect(saved.last_refresh).toEqual(expect.any(String));

        expect(readCodexAuthSummary(authJsonPath)).toMatchObject({
            exists: true,
            authMode: 'chatgpt',
            expired: false,
            hasRefreshToken: true,
            planType: 'plus',
        });
    });

    it('should reject invalid or expired auth.json content', () => {
        const expiredAccessToken = createJwt({
            exp: Math.floor(Date.now() / 1000) - 60,
        });

        expect(() => validateCodexAuthJson({ auth_mode: 'chatgpt', tokens: {} })).toThrow(
            'tokens.access_token'
        );
        expect(() =>
            validateCodexAuthJson({
                auth_mode: 'chatgpt',
                tokens: { access_token: expiredAccessToken },
            })
        ).toThrow('expired');
    });
});
