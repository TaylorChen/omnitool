/**
 * OmniTool - Main Popup Controller
 * Handles UI interactions and coordinates between modules
 */

import { generatePassword, evaluateStrength, DEFAULT_OPTIONS } from '../modules/password-generator.js';
import { generateTOTP, getRemainingSeconds, formatOtp, generateId, parseOtpAuthUri } from '../modules/totp.js';
import * as storage from '../modules/storage.js';
import { QRScanner } from '../modules/qr-scanner.js';

// ===============================
// DOM Elements
// ===============================

const elements = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Password Generator
    passwordOutput: document.getElementById('password-output'),
    refreshBtn: document.getElementById('refresh-btn'),
    copyBtn: document.getElementById('copy-btn'),
    strengthFill: document.getElementById('strength-fill'),
    strengthLabel: document.getElementById('strength-label'),
    lengthSlider: document.getElementById('password-length'),
    lengthValue: document.getElementById('length-value'),
    uppercase: document.getElementById('uppercase'),
    lowercase: document.getElementById('lowercase'),
    numbers: document.getElementById('numbers'),
    symbols: document.getElementById('symbols'),

    // Authenticator
    searchInput: document.getElementById('search-input'),
    accountsList: document.getElementById('accounts-list'),
    emptyState: document.getElementById('empty-state'),
    addAccountBtn: document.getElementById('add-account-btn'),
    addModal: document.getElementById('add-modal'),
    closeModal: document.getElementById('close-modal'),
    cancelAdd: document.getElementById('cancel-add'),
    confirmAdd: document.getElementById('confirm-add'),
    accountIssuer: document.getElementById('account-issuer'),
    accountName: document.getElementById('account-name'),
    accountSecret: document.getElementById('account-secret'),
    accountDigits: document.getElementById('account-digits'),
    accountPeriod: document.getElementById('account-period'),

    // QR Scanner
    methodTabs: document.querySelectorAll('.method-tab'),
    methodContents: document.querySelectorAll('.add-method-content'),
    manualForm: document.getElementById('manual-form'),
    qrCameraForm: document.getElementById('qr-camera-form'),
    qrImageForm: document.getElementById('qr-image-form'),
    qrVideo: document.getElementById('qr-video'),
    qrCanvas: document.getElementById('qr-canvas'),
    cameraStatus: document.getElementById('camera-status'),
    startCameraBtn: document.getElementById('start-camera'),
    qrUploadArea: document.getElementById('qr-upload-area'),
    qrImageInput: document.getElementById('qr-image-input'),
    qrImagePreview: document.getElementById('qr-image-preview'),
    previewImage: document.getElementById('preview-image'),
    qrScanResult: document.getElementById('qr-scan-result'),
    switchToImageBtn: document.getElementById('switch-to-image'),

    // Settings
    exportData: document.getElementById('export-data'),
    importData: document.getElementById('import-data'),
    importFile: document.getElementById('import-file')
};

// State
let currentOptions = { ...DEFAULT_OPTIONS };
let accounts = [];
let totpUpdateInterval = null;
let qrScanner = null;
let scannedAccountData = null;

// ===============================
// Initialization
// ===============================

async function init() {
    // Load saved options
    currentOptions = await storage.getPasswordOptions();
    applyOptionsToUI();

    // Generate initial password
    updatePassword();

    // Load accounts
    accounts = await storage.getAccounts();
    renderAccounts();

    // Bind events
    bindNavigationEvents();
    bindPasswordEvents();
    bindAuthenticatorEvents();
    bindQRScannerEvents();
    bindSettingsEvents();

    // Start TOTP update loop
    startTotpUpdates();
}

// ===============================
// Navigation
// ===============================

function bindNavigationEvents() {
    elements.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Update nav tabs
    elements.navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update tab contents
    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });

    // Start/stop TOTP updates based on active tab
    if (tabId === 'authenticator') {
        startTotpUpdates();
    } else {
        stopTotpUpdates();
    }
}

// ===============================
// Password Generator
// ===============================

function bindPasswordEvents() {
    elements.refreshBtn.addEventListener('click', updatePassword);
    elements.copyBtn.addEventListener('click', copyPassword);

    elements.lengthSlider.addEventListener('input', (e) => {
        currentOptions.length = parseInt(e.target.value, 10);
        elements.lengthValue.textContent = currentOptions.length;
        updatePassword();
        saveOptions();
    });

    ['uppercase', 'lowercase', 'numbers', 'symbols'].forEach(type => {
        elements[type].addEventListener('change', (e) => {
            currentOptions[type] = e.target.checked;

            // Ensure at least one type is selected
            const anySelected = currentOptions.uppercase || currentOptions.lowercase ||
                currentOptions.numbers || currentOptions.symbols;
            if (!anySelected) {
                currentOptions[type] = true;
                e.target.checked = true;
            }

            updatePassword();
            saveOptions();
        });
    });
}

function applyOptionsToUI() {
    elements.lengthSlider.value = currentOptions.length;
    elements.lengthValue.textContent = currentOptions.length;
    elements.uppercase.checked = currentOptions.uppercase;
    elements.lowercase.checked = currentOptions.lowercase;
    elements.numbers.checked = currentOptions.numbers;
    elements.symbols.checked = currentOptions.symbols;
}

function updatePassword() {
    const password = generatePassword(currentOptions);
    elements.passwordOutput.value = password;

    const strength = evaluateStrength(password, currentOptions);
    updateStrengthIndicator(strength);
}

function updateStrengthIndicator(strength) {
    elements.strengthFill.className = `strength-fill ${strength.level}`;
    elements.strengthLabel.className = `strength-label ${strength.level}`;
    elements.strengthLabel.textContent = strength.label;
}

async function copyPassword() {
    const password = elements.passwordOutput.value;

    try {
        await navigator.clipboard.writeText(password);
        elements.copyBtn.classList.add('copied');

        setTimeout(() => {
            elements.copyBtn.classList.remove('copied');
        }, 2000);
    } catch (err) {
        showToast('复制失败');
    }
}

async function saveOptions() {
    await storage.savePasswordOptions(currentOptions);
}

// ===============================
// Authenticator
// ===============================

function bindAuthenticatorEvents() {
    elements.addAccountBtn.addEventListener('click', openAddModal);
    elements.closeModal.addEventListener('click', closeAddModal);
    elements.cancelAdd.addEventListener('click', closeAddModal);
    elements.confirmAdd.addEventListener('click', addAccount);

    elements.searchInput.addEventListener('input', (e) => {
        renderAccounts(e.target.value);
    });

    // Close modal on backdrop click
    elements.addModal.addEventListener('click', (e) => {
        if (e.target === elements.addModal) {
            closeAddModal();
        }
    });

    // Method tabs
    elements.methodTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const method = tab.dataset.method;
            switchAddMethod(method);
        });
    });
}

function switchAddMethod(method) {
    // Update tabs
    elements.methodTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.method === method);
    });

    // Update content
    elements.methodContents.forEach(content => {
        content.classList.toggle('active', content.id === `${method}-form`);
    });

    // Stop camera if switching away from camera method
    if (method !== 'qr-camera' && qrScanner) {
        stopQRScanner();
    }
}

// ===============================
// QR Scanner
// ===============================

function bindQRScannerEvents() {
    // Camera scanner - only bind if elements exist
    if (elements.startCameraBtn) {
        elements.startCameraBtn.addEventListener('click', toggleQRScanner);
    }

    // Image upload - only bind if elements exist
    if (elements.qrUploadArea && elements.qrImageInput) {
        elements.qrUploadArea.addEventListener('click', () => {
            elements.qrImageInput.click();
        });

        elements.qrImageInput.addEventListener('change', handleQRImageUpload);

        // Drag and drop
        elements.qrUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.qrUploadArea.classList.add('dragover');
        });

        elements.qrUploadArea.addEventListener('dragleave', () => {
            elements.qrUploadArea.classList.remove('dragover');
        });

        elements.qrUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.qrUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                processQRImage(file);
            }
        });
    }

    // Switch to image button
    if (elements.switchToImageBtn) {
        elements.switchToImageBtn.addEventListener('click', () => {
            switchAddMethod('qr-image');
        });
    }
}

async function toggleQRScanner() {
    if (qrScanner && qrScanner.scanning) {
        stopQRScanner();
    } else {
        await startQRScanner();
    }
}

async function startQRScanner() {
    try {
        qrScanner = new QRScanner();
        qrScanner.init(elements.qrVideo, elements.qrCanvas);

        qrScanner.onScanSuccess = (data) => {
            handleQRScanResult(data);
        };

        qrScanner.onScanError = (error) => {
            showToast('无法访问摄像头');
            console.error('Camera error:', error);
        };

        await qrScanner.start();

        if (elements.cameraStatus) {
            elements.cameraStatus.classList.add('hidden');
        }
        if (elements.startCameraBtn) {
            elements.startCameraBtn.textContent = '停止扫描';
            elements.startCameraBtn.classList.add('scanning');
        }
    } catch (error) {
        showToast('无法访问摄像头');
        console.error('Camera error:', error);
    }
}

function stopQRScanner() {
    if (qrScanner) {
        qrScanner.stop();
        qrScanner = null;
    }

    if (elements.cameraStatus) {
        elements.cameraStatus.classList.remove('hidden');
    }
    if (elements.startCameraBtn) {
        elements.startCameraBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            开始扫描
        `;
        elements.startCameraBtn.classList.remove('scanning');
    }
}

async function handleQRImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    await processQRImage(file);
    e.target.value = '';
}

async function processQRImage(file) {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        elements.qrUploadArea.style.display = 'none';
        elements.qrImagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Scan QR code
    try {
        const tempScanner = new QRScanner();
        const result = await tempScanner.processImage(file);

        if (result) {
            handleQRScanResult(result);
        } else {
            elements.qrScanResult.textContent = '未能识别二维码，请尝试其他图片';
            elements.qrScanResult.className = 'qr-scan-result error';
        }
    } catch (error) {
        elements.qrScanResult.textContent = '图片处理失败';
        elements.qrScanResult.className = 'qr-scan-result error';
    }
}

function handleQRScanResult(data) {
    stopQRScanner();

    try {
        // Parse otpauth:// URI
        if (data.startsWith('otpauth://')) {
            const accountData = parseOtpAuthUri(data);
            scannedAccountData = accountData;

            // Fill form fields
            elements.accountIssuer.value = accountData.issuer;
            elements.accountName.value = accountData.account;
            elements.accountSecret.value = accountData.secret;
            elements.accountDigits.value = accountData.digits.toString();
            elements.accountPeriod.value = accountData.period.toString();

            // Switch to manual form to show filled data
            switchAddMethod('manual');
            showToast('二维码识别成功！');

            // Update QR result display if visible
            if (elements.qrScanResult) {
                elements.qrScanResult.textContent = `识别成功: ${accountData.issuer} - ${accountData.account}`;
                elements.qrScanResult.className = 'qr-scan-result success';
            }
        } else {
            showToast('无效的二维码格式');
            if (elements.qrScanResult) {
                elements.qrScanResult.textContent = '无效的二维码格式，需要 otpauth:// 格式';
                elements.qrScanResult.className = 'qr-scan-result error';
            }
        }
    } catch (error) {
        showToast('解析二维码失败');
        console.error('QR parse error:', error);
    }
}

function openAddModal() {
    elements.addModal.classList.add('active');
    elements.accountIssuer.focus();
}

function closeAddModal() {
    elements.addModal.classList.remove('active');
    // Clear form
    elements.accountIssuer.value = '';
    elements.accountName.value = '';
    elements.accountSecret.value = '';
    elements.accountDigits.value = '6';
    elements.accountPeriod.value = '30';

    // Reset QR scanner state
    stopQRScanner();
    scannedAccountData = null;
    switchAddMethod('manual');

    // Reset image upload
    if (elements.qrUploadArea) {
        elements.qrUploadArea.style.display = '';
    }
    if (elements.qrImagePreview) {
        elements.qrImagePreview.style.display = 'none';
    }
    if (elements.qrScanResult) {
        elements.qrScanResult.textContent = '';
        elements.qrScanResult.className = 'qr-scan-result';
    }
}

async function addAccount() {
    const issuer = elements.accountIssuer.value.trim();
    const account = elements.accountName.value.trim();
    const secret = elements.accountSecret.value.trim().replace(/\s/g, '');
    const digits = parseInt(elements.accountDigits.value, 10);
    const period = parseInt(elements.accountPeriod.value, 10);

    if (!issuer || !secret) {
        showToast('请填写服务名称和密钥');
        return;
    }

    // Validate secret by trying to generate OTP
    try {
        await generateTOTP(secret, { digits, period });
    } catch (err) {
        showToast('密钥格式无效');
        return;
    }

    const newAccount = {
        id: generateId(),
        issuer,
        account: account || issuer,
        secret,
        digits,
        period,
        algorithm: 'SHA1'
    };

    await storage.addAccount(newAccount);
    accounts = await storage.getAccounts();
    renderAccounts();
    closeAddModal();
    showToast('账户已添加');
}

async function deleteAccountHandler(id) {
    if (confirm('确定要删除这个账户吗？')) {
        await storage.deleteAccount(id);
        accounts = await storage.getAccounts();
        renderAccounts();
        showToast('账户已删除');
    }
}

function renderAccounts(searchQuery = '') {
    // Filter accounts
    let filteredAccounts = accounts;
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredAccounts = accounts.filter(acc =>
            acc.issuer.toLowerCase().includes(query) ||
            acc.account.toLowerCase().includes(query)
        );
    }

    // Show/hide empty state
    elements.emptyState.style.display = filteredAccounts.length === 0 ? 'flex' : 'none';

    // Clear existing items (except empty state)
    const existingItems = elements.accountsList.querySelectorAll('.account-item');
    existingItems.forEach(item => item.remove());

    // Render accounts
    filteredAccounts.forEach(account => {
        const item = createAccountElement(account);
        elements.accountsList.appendChild(item);
    });

    // Update OTP codes immediately
    updateAllOtpCodes();
}

function createAccountElement(account) {
    const item = document.createElement('div');
    item.className = 'account-item';
    item.dataset.id = account.id;

    // Get first letter for avatar
    const initial = (account.issuer || 'U')[0].toUpperCase();

    item.innerHTML = `
    <div class="account-avatar">${initial}</div>
    <div class="account-info">
      <div class="account-issuer">${escapeHtml(account.issuer)}</div>
      <div class="account-name">${escapeHtml(account.account)}</div>
    </div>
    <div class="account-otp" data-secret="${account.secret}" data-digits="${account.digits}" data-period="${account.period}">------</div>
    <div class="account-timer">
      <svg class="timer-circle" width="28" height="28" viewBox="0 0 28 28">
        <circle class="timer-bg" cx="14" cy="14" r="12"/>
        <circle class="timer-progress" cx="14" cy="14" r="12" 
          stroke-dasharray="75.4" 
          stroke-dashoffset="0"/>
      </svg>
      <span class="timer-text">30</span>
    </div>
  `;

    // Copy on click
    item.addEventListener('click', async () => {
        const otpElement = item.querySelector('.account-otp');
        const otp = otpElement.textContent.replace(/\s/g, '');

        try {
            await navigator.clipboard.writeText(otp);
            showToast('验证码已复制');
        } catch (err) {
            showToast('复制失败');
        }
    });

    // Delete on right-click
    item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        deleteAccountHandler(account.id);
    });

    return item;
}

function startTotpUpdates() {
    if (totpUpdateInterval) return;

    updateAllOtpCodes();
    totpUpdateInterval = setInterval(updateAllOtpCodes, 1000);
}

function stopTotpUpdates() {
    if (totpUpdateInterval) {
        clearInterval(totpUpdateInterval);
        totpUpdateInterval = null;
    }
}

async function updateAllOtpCodes() {
    const items = elements.accountsList.querySelectorAll('.account-item');

    for (const item of items) {
        const otpElement = item.querySelector('.account-otp');
        const timerProgress = item.querySelector('.timer-progress');
        const timerText = item.querySelector('.timer-text');

        const secret = otpElement.dataset.secret;
        const digits = parseInt(otpElement.dataset.digits, 10) || 6;
        const period = parseInt(otpElement.dataset.period, 10) || 30;

        try {
            const otp = await generateTOTP(secret, { digits, period });
            otpElement.textContent = formatOtp(otp);

            // Update timer
            const remaining = getRemainingSeconds(period);
            timerText.textContent = remaining;

            // Update circle progress (circumference = 2 * PI * r = 75.4)
            const progress = (remaining / period) * 75.4;
            timerProgress.style.strokeDashoffset = 75.4 - progress;

            // Warning color when less than 5 seconds
            if (remaining <= 5) {
                timerProgress.style.stroke = '#ef4444';
            } else {
                timerProgress.style.stroke = '';
            }
        } catch (err) {
            otpElement.textContent = 'Error';
        }
    }
}

// ===============================
// Settings
// ===============================

function bindSettingsEvents() {
    elements.exportData.addEventListener('click', handleExport);
    elements.importData.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);
}

async function handleExport() {
    const data = await storage.exportData();
    const json = JSON.stringify(data, null, 2);

    try {
        await navigator.clipboard.writeText(json);
        showToast('数据已复制到剪贴板，请粘贴保存为 .json 文件');
    } catch (err) {
        // Fallback: show data in alert
        console.error('Clipboard write failed:', err);
        showToast('复制失败，请重试');
    }
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await storage.importData(data);

        if (result.success) {
            accounts = await storage.getAccounts();
            renderAccounts();
            showToast(`导入成功：${result.imported} 个账户`);
        } else {
            showToast(`导入失败：${result.error}`);
        }
    } catch (err) {
        showToast('文件格式错误');
    }

    // Reset file input
    e.target.value = '';
}

// ===============================
// Utilities
// ===============================

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===============================
// Start
// ===============================

document.addEventListener('DOMContentLoaded', init);
