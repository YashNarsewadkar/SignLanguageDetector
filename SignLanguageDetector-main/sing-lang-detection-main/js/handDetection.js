// Hand detection using MediaPipe Hands
class HandDetector {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.canvas = null;
        this.canvasCtx = null;
        this.isRunning = false;
        this.onResults = null;
        this.lastDetectionTime = 0;
        this.detectionInterval = 33; // ~30 FPS
    }

    initialize() {
        // Get canvas for drawing
        this.canvas = document.getElementById('canvas');
        this.canvasCtx = this.canvas.getContext('2d');

        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Configure hands detection
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Set up results callback
        this.hands.onResults((results) => {
            this.handleResults(results);
        });

        console.log('✋ Hand detector initialized');
    }

    start(videoElement) {
        if (!this.hands) {
            this.initialize();
        }

        this.isRunning = true;

        // Start detection loop
        this.detectHands(videoElement);

        console.log('✅ Hand detection started');
    }

    stop() {
        this.isRunning = false;

        // Clear canvas
        if (this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        console.log('⏹️ Hand detection stopped');
    }

    async detectHands(videoElement) {
        if (!this.isRunning) return;

        const currentTime = performance.now();

        // Throttle detection to maintain performance
        if (currentTime - this.lastDetectionTime >= this.detectionInterval) {
            try {
                await this.hands.send({ image: videoElement });
                this.lastDetectionTime = currentTime;
            } catch (error) {
                console.error('Hand detection error:', error);
            }
        }

        // Continue detection loop
        requestAnimationFrame(() => this.detectHands(videoElement));
    }

    handleResults(results) {
        // Clear canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the video frame
        this.canvasCtx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw hand landmarks
                this.drawLandmarks(landmarks);
                this.drawConnections(landmarks);
            }
        }

        this.canvasCtx.restore();

        // Call callback with results
        if (this.onResults) {
            this.onResults(results);
        }
    }

    drawLandmarks(landmarks) {
        this.canvasCtx.fillStyle = '#FF0000';
        this.canvasCtx.strokeStyle = '#00FF00';
        this.canvasCtx.lineWidth = 2;

        for (const landmark of landmarks) {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;

            // Draw landmark point
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, 5, 0, 2 * Math.PI);
            this.canvasCtx.fill();
        }
    }

    drawConnections(landmarks) {
        const connections = [
            // Thumb
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Index finger
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Middle finger
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Ring finger
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Pinky
            [0, 17], [17, 18], [18, 19], [19, 20],
            // Palm
            [5, 9], [9, 13], [13, 17]
        ];

        this.canvasCtx.strokeStyle = '#00FF00';
        this.canvasCtx.lineWidth = 2;

        for (const connection of connections) {
            const start = landmarks[connection[0]];
            const end = landmarks[connection[1]];

            const startX = start.x * this.canvas.width;
            const startY = start.y * this.canvas.height;
            const endX = end.x * this.canvas.width;
            const endY = end.y * this.canvas.height;

            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startX, startY);
            this.canvasCtx.lineTo(endX, endY);
            this.canvasCtx.stroke();
        }
    }
}