import * as crypto from 'crypto';

export class WebAppUtils {
    /**
     * Validates the authenticity of Telegram Web App initData using HMAC-SHA256.
     * Prevents data manipulation and spoofing by verifying the hash signature against the bot token.
     *
     * @param token The Telegram Bot API token used as the secret key.
     * @param initData Raw query string from `window.Telegram.WebApp.initData`.
     * @param options Optional settings, e.g. maxAgeSeconds (default: 86400 / 24 hours).
     * @returns Parsed and verified initial data object.
     */
    static validate(token: string, initData: string, options?: { maxAgeSeconds?: number }): any {
        const urlParams = new URLSearchParams(initData);

        const hash = urlParams.get('hash');
        if (!hash) throw new Error('Validation failed: Hash signature not found in initData.');
        urlParams.delete('hash');

        // 1. Sort keys alphabetically per Telegram spec.
        const keys = Array.from(urlParams.keys()).sort();
        const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');

        // 2. Derive the WebAppData secret key via HMAC-SHA256 of the bot token.
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();

        // 3. Compute and compare the hash signature.
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        // Constant-time comparison to prevent timing attacks.
        const hashBuffer = Buffer.from(hash, 'hex');
        const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
        if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
            throw new Error('WebApp data validation failed: Hash mismatch. Data may have been tampered.');
        }

        // Parse fields, attempting JSON deserialization for nested objects (e.g. "user").
        const result: any = {};
        for (const [key, value] of urlParams.entries()) {
            try {
                result[key] = JSON.parse(value);
            } catch {
                result[key] = value;
            }
        }

        // 4. Prevent replay attacks by validating auth_date expiration.
        if (result.auth_date) {
            const authDate = parseInt(result.auth_date);
            const now = Math.floor(Date.now() / 1000);
            const maxAge = options?.maxAgeSeconds ?? 86400; // Default: 24 hours

            if (now - authDate > maxAge) {
                throw new Error('WebApp data expired: auth_date exceeds maximum allowed age (potential replay attack).');
            }
        }

        return result;
    }
}
