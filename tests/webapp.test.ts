import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { WebAppUtils } from '../src/webapp';
import { WebAppValidationError } from '../src/errors';

const TOKEN = 'bot_test_token_12345';

// Helper to generate a valid initData string for testing
function generateInitData(
    data: Record<string, string>,
    token: string,
    overwrite?: Partial<{ hash: string; auth_date: number }>
): string {
    const authDate = overwrite?.auth_date ?? Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({ ...data, auth_date: String(authDate) });

    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const hash =
        overwrite?.hash ??
        crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    params.set('hash', hash);
    return params.toString();
}

// ---------------------------------------------------------------------------
// WebAppUtils.validate()
// ---------------------------------------------------------------------------
describe('WebAppUtils.validate()', () => {
    it('validates correct initData successfully', () => {
        const initData = generateInitData(
            { user: JSON.stringify({ id: 1, first_name: 'Test' }) },
            TOKEN
        );
        const result = WebAppUtils.validate(TOKEN, initData);
        expect(result).toBeDefined();
        expect(result.user).toEqual({ id: 1, first_name: 'Test' });
    });

    it('throws when hash is missing', () => {
        const params = new URLSearchParams({ user: 'test', auth_date: String(Date.now()) });
        expect(() => WebAppUtils.validate(TOKEN, params.toString())).toThrow(WebAppValidationError);
        expect(() => WebAppUtils.validate(TOKEN, params.toString())).toThrow(
            'Hash signature not found'
        );
    });

    it('throws on hash mismatch (tampered data)', () => {
        const initData = generateInitData({ user: 'original_data' }, TOKEN);
        // Tamper with data by modifying the user field manually
        const tampered = initData.replace('user=original_data', 'user=tampered_data');
        expect(() => WebAppUtils.validate(TOKEN, tampered)).toThrow(WebAppValidationError);
        expect(() => WebAppUtils.validate(TOKEN, tampered)).toThrow('Hash mismatch');
    });

    it('throws when auth_date is expired', () => {
        const expiredDate = Math.floor(Date.now() / 1000) - 200000; // ~2 days ago
        const initData = generateInitData({ user: 'data' }, TOKEN, { auth_date: expiredDate });
        expect(() => WebAppUtils.validate(TOKEN, initData, { maxAgeSeconds: 86400 })).toThrow(
            'expired'
        );
    });

    it('throws when auth_date is missing', () => {
        const params = new URLSearchParams({ user: 'test' });
        const keys = Array.from(params.keys()).sort();
        const dataCheckString = keys.map(k => `${k}=${params.get(k)}`).join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest();
        const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        params.set('hash', hash);

        expect(() => WebAppUtils.validate(TOKEN, params.toString())).toThrow(
            'auth_date is required'
        );
    });

    it('throws when auth_date is in the future', () => {
        const futureDate = Math.floor(Date.now() / 1000) + 120;
        const initData = generateInitData({ user: 'data' }, TOKEN, { auth_date: futureDate });
        expect(() => WebAppUtils.validate(TOKEN, initData)).toThrow('auth_date is in the future');
    });

    it('does NOT throw when auth_date is within maxAgeSeconds', () => {
        const recentDate = Math.floor(Date.now() / 1000) - 100;
        const initData = generateInitData({ user: 'data' }, TOKEN, { auth_date: recentDate });
        expect(() => WebAppUtils.validate(TOKEN, initData, { maxAgeSeconds: 3600 })).not.toThrow();
    });

    it('throws when wrong bot token is used for verification', () => {
        const initData = generateInitData({ user: 'data' }, TOKEN);
        expect(() => WebAppUtils.validate('wrong:token', initData)).toThrow('Hash mismatch');
    });

    it('auto-parses nested JSON fields (user object)', () => {
        const user = { id: 99, first_name: 'Alice', username: 'alice' };
        const initData = generateInitData({ user: JSON.stringify(user) }, TOKEN);
        const result = WebAppUtils.validate(TOKEN, initData);
        expect(result.user).toEqual(user);
    });
});
