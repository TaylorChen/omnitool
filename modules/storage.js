/**
 * OmniTool - Storage Module
 * Chrome Storage API wrapper for data persistence
 */

const STORAGE_KEYS = {
    PASSWORD_OPTIONS: 'passwordOptions',
    ACCOUNTS: 'totpAccounts',
    SETTINGS: 'appSettings'
};

/**
 * Get data from Chrome storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {Promise<*>} Stored value
 */
export async function get(key, defaultValue = null) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
        });
    });
}

/**
 * Set data in Chrome storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {Promise<void>}
 */
export async function set(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
    });
}

/**
 * Remove data from Chrome storage
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function remove(key) {
    return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
    });
}

// ===============================
// Password Options
// ===============================

/**
 * Get saved password generation options
 * @returns {Promise<Object>} Password options
 */
export async function getPasswordOptions() {
    return get(STORAGE_KEYS.PASSWORD_OPTIONS, {
        length: 12,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
    });
}

/**
 * Save password generation options
 * @param {Object} options - Password options
 * @returns {Promise<void>}
 */
export async function savePasswordOptions(options) {
    return set(STORAGE_KEYS.PASSWORD_OPTIONS, options);
}

// ===============================
// TOTP Accounts
// ===============================

/**
 * Get all TOTP accounts
 * @returns {Promise<Array>} Array of accounts
 */
export async function getAccounts() {
    return get(STORAGE_KEYS.ACCOUNTS, []);
}

/**
 * Save all TOTP accounts
 * @param {Array} accounts - Array of accounts
 * @returns {Promise<void>}
 */
export async function saveAccounts(accounts) {
    return set(STORAGE_KEYS.ACCOUNTS, accounts);
}

/**
 * Add a new TOTP account
 * @param {Object} account - Account data
 * @returns {Promise<void>}
 */
export async function addAccount(account) {
    const accounts = await getAccounts();
    accounts.push({
        ...account,
        createdAt: Date.now(),
        order: accounts.length
    });
    return saveAccounts(accounts);
}

/**
 * Update an existing account
 * @param {string} id - Account ID
 * @param {Object} updates - Updated fields
 * @returns {Promise<void>}
 */
export async function updateAccount(id, updates) {
    const accounts = await getAccounts();
    const index = accounts.findIndex(acc => acc.id === id);

    if (index !== -1) {
        accounts[index] = { ...accounts[index], ...updates };
        return saveAccounts(accounts);
    }
}

/**
 * Delete an account
 * @param {string} id - Account ID
 * @returns {Promise<void>}
 */
export async function deleteAccount(id) {
    const accounts = await getAccounts();
    const filtered = accounts.filter(acc => acc.id !== id);
    return saveAccounts(filtered);
}

// ===============================
// Export / Import
// ===============================

/**
 * Export all data as JSON
 * @returns {Promise<Object>} All stored data
 */
export async function exportData() {
    const accounts = await getAccounts();
    const settings = await get(STORAGE_KEYS.SETTINGS, {});

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        accounts,
        settings
    };
}

/**
 * Import data from JSON
 * @param {Object} data - Imported data
 * @returns {Promise<Object>} Import result
 */
export async function importData(data) {
    try {
        if (!data.version || !data.accounts) {
            throw new Error('Invalid data format');
        }

        const existingAccounts = await getAccounts();
        const newAccounts = data.accounts.filter(
            acc => !existingAccounts.some(existing => existing.id === acc.id)
        );

        if (newAccounts.length > 0) {
            await saveAccounts([...existingAccounts, ...newAccounts]);
        }

        return {
            success: true,
            imported: newAccounts.length,
            skipped: data.accounts.length - newAccounts.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
