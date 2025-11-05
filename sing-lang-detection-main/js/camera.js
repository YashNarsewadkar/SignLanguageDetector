// Camera management for video capture
class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.videoElement = document.getElementById('video');

            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            console.log('📹 Camera manager initialized');
            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Camera initialization failed:', error);
            throw error;
        }
    }

    async start() {
        if (!this.isInitialized) {
            throw new Error('Camera not initialized');
        }

        try {
            // Request camera access
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user' // Front camera
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Set video source
            this.videoElement.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    resolve();
                };
            });

            await this.videoElement.play();

            console.log('✅ Camera started successfully');

        } catch (error) {
            console.error('❌ Failed to start camera:', error);

            // Provide user-friendly error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera access denied. Please allow camera access and try again.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please check your camera connection.');
            } else {
                throw new Error(`Camera error: ${error.message}`);
            }
        }
    }

    stop() {
        if (this.stream) {
            // Stop all tracks
            this.stream.getTracks().forEach(track => {
                track.stop();
            });

            // Clear video source
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }

            this.stream = null;
            console.log('📹 Camera stopped');
        }
    }

    isActive() {
        return this.stream !== null;
    }

    getVideoElement() {
        return this.videoElement;
    }
}