/**
 * OmniTool - QR Code Scanner Module
 * Uses jsQR library for QR code detection
 */

// Import jsQR from external file by adding script tag dynamically
let jsQRLoaded = false;
let jsQR = null;

// Load jsQR library
function loadJsQR() {
    return new Promise((resolve, reject) => {
        if (jsQRLoaded && jsQR) {
            resolve(jsQR);
            return;
        }

        // Try to get from global scope first (in case already loaded)
        if (typeof window !== 'undefined' && window.jsQR) {
            jsQR = window.jsQR;
            jsQRLoaded = true;
            resolve(jsQR);
            return;
        }

        // Load script dynamically
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('modules/jsqr.min.js');
        script.onload = () => {
            jsQR = window.jsQR;
            jsQRLoaded = true;
            resolve(jsQR);
        };
        script.onerror = () => reject(new Error('Failed to load jsQR library'));
        document.head.appendChild(script);
    });
}

/**
 * QR Code Scanner class
 * Handles camera access and QR code detection
 */
export class QRScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.stream = null;
        this.scanning = false;
        this.onScanSuccess = null;
        this.onScanError = null;
        this.animationFrameId = null;
    }

    /**
     * Initialize the scanner with DOM elements
     */
    init(video, canvas) {
        this.video = video;
        this.canvas = canvas;
        if (canvas) {
            this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        }
    }

    /**
     * Start the camera and begin scanning
     */
    async start() {
        if (this.scanning) return;

        try {
            await loadJsQR();

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', true);
            await this.video.play();

            this.scanning = true;
            this.scan();
        } catch (error) {
            console.error('Camera access error:', error);
            if (this.onScanError) {
                this.onScanError(error);
            }
            throw error;
        }
    }

    /**
     * Stop scanning and release camera
     */
    stop() {
        this.scanning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }
    }

    /**
     * Scan loop - continuously check for QR codes
     */
    scan() {
        if (!this.scanning || !jsQR) return;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
                this.scanning = false;
                if (this.onScanSuccess) {
                    this.onScanSuccess(code.data);
                }
                return;
            }
        }

        this.animationFrameId = requestAnimationFrame(() => this.scan());
    }

    /**
     * Process an image file for QR code
     */
    async processImage(file) {
        await loadJsQR();

        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth'
                    });

                    if (code && code.data) {
                        resolve(code.data);
                    } else {
                        resolve(null);
                    }
                };

                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }
}

// Export singleton instance
export const qrScanner = new QRScanner();
