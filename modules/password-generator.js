/**
 * OmniTool - Password Generator Module
 * Secure password generation using Web Crypto API
 */

const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

/**
 * Generate a cryptographically secure random password
 * @param {Object} options - Password generation options
 * @param {number} options.length - Password length (4-128)
 * @param {boolean} options.uppercase - Include uppercase letters
 * @param {boolean} options.lowercase - Include lowercase letters
 * @param {boolean} options.numbers - Include numbers
 * @param {boolean} options.symbols - Include special characters
 * @returns {string} Generated password
 */
export function generatePassword(options) {
    const { length, uppercase, lowercase, numbers, symbols } = options;

    // Build charset based on options
    let charset = '';
    if (uppercase) charset += CHARSETS.uppercase;
    if (lowercase) charset += CHARSETS.lowercase;
    if (numbers) charset += CHARSETS.numbers;
    if (symbols) charset += CHARSETS.symbols;

    // Default to lowercase if nothing selected
    if (!charset) {
        charset = CHARSETS.lowercase;
    }

    // Generate cryptographically secure random values
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    // Build password
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset[randomValues[i] % charset.length];
    }

    // Ensure at least one character from each selected type
    password = ensureCharacterTypes(password, options, charset);

    return password;
}

/**
 * Ensure password contains at least one character from each selected type
 */
function ensureCharacterTypes(password, options, charset) {
    const chars = password.split('');
    const positions = [];

    // Get random positions for replacement
    const randomPos = new Uint32Array(4);
    crypto.getRandomValues(randomPos);

    let posIndex = 0;

    if (options.uppercase && !containsAny(password, CHARSETS.uppercase)) {
        const pos = randomPos[posIndex++] % password.length;
        chars[pos] = getRandomChar(CHARSETS.uppercase);
    }

    if (options.lowercase && !containsAny(password, CHARSETS.lowercase)) {
        const pos = randomPos[posIndex++] % password.length;
        chars[pos] = getRandomChar(CHARSETS.lowercase);
    }

    if (options.numbers && !containsAny(password, CHARSETS.numbers)) {
        const pos = randomPos[posIndex++] % password.length;
        chars[pos] = getRandomChar(CHARSETS.numbers);
    }

    if (options.symbols && !containsAny(password, CHARSETS.symbols)) {
        const pos = randomPos[posIndex++] % password.length;
        chars[pos] = getRandomChar(CHARSETS.symbols);
    }

    return chars.join('');
}

/**
 * Check if string contains any character from the given set
 */
function containsAny(str, charset) {
    for (const char of charset) {
        if (str.includes(char)) return true;
    }
    return false;
}

/**
 * Get a random character from a charset
 */
function getRandomChar(charset) {
    const randomValue = new Uint32Array(1);
    crypto.getRandomValues(randomValue);
    return charset[randomValue[0] % charset.length];
}

/**
 * Evaluate password strength
 * @param {string} password - Password to evaluate
 * @param {Object} options - Character type options used
 * @returns {Object} Strength result with level and score
 */
export function evaluateStrength(password, options) {
    const length = password.length;
    let typeCount = 0;

    if (options.uppercase) typeCount++;
    if (options.lowercase) typeCount++;
    if (options.numbers) typeCount++;
    if (options.symbols) typeCount++;

    // Calculate score
    let score = 0;

    // Length scoring
    if (length >= 16) score += 40;
    else if (length >= 12) score += 30;
    else if (length >= 8) score += 20;
    else score += 10;

    // Character type scoring
    score += typeCount * 15;

    // Determine strength level
    let level;
    if (score >= 70 && length >= 12 && typeCount >= 3) {
        level = 'strong';
    } else if (score >= 50 && length >= 8 && typeCount >= 2) {
        level = 'medium';
    } else {
        level = 'weak';
    }

    return {
        level,
        score,
        label: getStrengthLabel(level)
    };
}

/**
 * Get localized strength label
 */
function getStrengthLabel(level) {
    const labels = {
        weak: '弱',
        medium: '中',
        strong: '强'
    };
    return labels[level] || '弱';
}

/**
 * Default password options
 */
export const DEFAULT_OPTIONS = {
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
};
