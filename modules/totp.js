/**
 * OmniTool - TOTP Module
 * Implementation of RFC 6238 TOTP algorithm
 */

/**
 * Base32 character set (RFC 4648)
 */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decode Base32 string to Uint8Array
 * @param {string} encoded - Base32 encoded string
 * @returns {Uint8Array} Decoded bytes
 */
export function base32Decode(encoded) {
    // Remove spaces and convert to uppercase
    encoded = encoded.replace(/\s/g, '').toUpperCase();

    // Remove padding
    encoded = encoded.replace(/=+$/, '');

    const length = encoded.length;
    const output = new Uint8Array(Math.floor(length * 5 / 8));

    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < length; i++) {
        const char = encoded[i];
        const charIndex = BASE32_CHARS.indexOf(char);

        if (charIndex === -1) {
            throw new Error(`Invalid Base32 character: ${char}`);
        }

        value = (value << 5) | charIndex;
        bits += 5;

        if (bits >= 8) {
            output[index++] = (value >>> (bits - 8)) & 0xff;
            bits -= 8;
        }
    }

    return output;
}

/**
 * Convert number to 8-byte big-endian array
 * @param {number} num - Number to convert
 * @returns {Uint8Array} 8-byte array
 */
function numberToBytes(num) {
    const bytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
        bytes[i] = num & 0xff;
        num = Math.floor(num / 256);
    }
    return bytes;
}

/**
 * Compute HMAC-SHA1
 * @param {Uint8Array} key - Secret key
 * @param {Uint8Array} message - Message to authenticate
 * @returns {Promise<Uint8Array>} HMAC result
 */
async function hmacSha1(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
}

/**
 * Generate TOTP code
 * @param {string} secret - Base32 encoded secret
 * @param {Object} options - TOTP options
 * @param {number} options.period - Time step in seconds (default: 30)
 * @param {number} options.digits - Number of digits (default: 6)
 * @param {number} options.timestamp - Unix timestamp in ms (default: now)
 * @returns {Promise<string>} TOTP code
 */
export async function generateTOTP(secret, options = {}) {
    const {
        period = 30,
        digits = 6,
        timestamp = Date.now()
    } = options;

    // Decode the secret
    const key = base32Decode(secret);

    // Calculate counter (time steps since epoch)
    const counter = Math.floor(timestamp / 1000 / period);
    const counterBytes = numberToBytes(counter);

    // Compute HMAC
    const hmac = await hmacSha1(key, counterBytes);

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

    // Generate OTP
    const otp = binary % Math.pow(10, digits);
    return otp.toString().padStart(digits, '0');
}

/**
 * Get remaining seconds in current period
 * @param {number} period - Time step in seconds
 * @returns {number} Remaining seconds
 */
export function getRemainingSeconds(period = 30) {
    const now = Math.floor(Date.now() / 1000);
    return period - (now % period);
}

/**
 * Parse otpauth:// URI
 * @param {string} uri - OTP Auth URI
 * @returns {Object} Parsed account data
 */
export function parseOtpAuthUri(uri) {
    try {
        const url = new URL(uri);

        if (url.protocol !== 'otpauth:') {
            throw new Error('Invalid protocol');
        }

        const type = url.hostname; // totp or hotp
        const path = decodeURIComponent(url.pathname.slice(1));
        const params = url.searchParams;

        // Parse issuer and account from path
        let issuer = '';
        let account = path;

        if (path.includes(':')) {
            [issuer, account] = path.split(':');
        }

        // Override issuer if specified in params
        if (params.has('issuer')) {
            issuer = params.get('issuer');
        }

        return {
            type,
            issuer: issuer || 'Unknown',
            account: account || 'Unknown',
            secret: params.get('secret') || '',
            algorithm: params.get('algorithm') || 'SHA1',
            digits: parseInt(params.get('digits') || '6', 10),
            period: parseInt(params.get('period') || '30', 10)
        };
    } catch (error) {
        throw new Error('Invalid OTP Auth URI');
    }
}

/**
 * Generate a unique ID for accounts
 * @returns {string} UUID
 */
export function generateId() {
    return crypto.randomUUID();
}

/**
 * Format OTP code with space in middle (e.g., "123 456")
 * @param {string} code - OTP code
 * @returns {string} Formatted code
 */
export function formatOtp(code) {
    const mid = Math.floor(code.length / 2);
    return `${code.slice(0, mid)} ${code.slice(mid)}`;
}
