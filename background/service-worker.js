/**
 * OmniTool - Background Service Worker
 * Handles background tasks and alarms
 */

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('OmniTool installed');

        // Set default storage values
        chrome.storage.local.set({
            passwordOptions: {
                length: 12,
                uppercase: true,
                lowercase: true,
                numbers: true,
                symbols: true
            },
            totpAccounts: [],
            appSettings: {}
        });
    }
});

// Keep service worker alive for TOTP updates
chrome.alarms.create('totpRefresh', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'totpRefresh') {
        // This keeps the service worker active
        // Actual TOTP updates happen in the popup
        console.log('TOTP refresh alarm triggered');
    }
});

// Message handling for future features
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'generatePassword') {
        // Could be used for context menu password generation
        sendResponse({ success: true });
    }

    if (message.action === 'downloadFile') {
        // Handle file download from popup
        const { content, filename } = message;

        // Create a simple data URL with the JSON content
        // Using encodeURIComponent to preserve the actual text content
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);

        chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            conflictAction: 'uniquify',
            saveAs: true
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, downloadId: downloadId });
            }
        });

        return true; // Keep channel open for async
    }

    return true; // Keep message channel open for async response
});
