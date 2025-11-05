// Fixed Main Application - Debugging Gesture Recording & Text Issues
class SignLanguageApp {
    constructor() {
        this.isRunning = false;
        this.detectedText = '';
        this.currentGesture = null;
        this.gestureBuffer = [];
        this.lastGestureTime = 0;
        this.gestureTimeout = 2000; // 2 seconds
        this.fpsCounter = 0;
        this.lastFpsTime = 0;
        this.isRecordingGesture = false;
        this.recordedLandmarks = [];
        this.customGestureMap = {};
        this.recordingStartTime = 0;

        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Initialize all components
            await this.setupCamera();
            this.setupHandDetection();
            this.setupGestureRecognition();
            this.setupTextToSpeech();
            this.setupEventListeners();
            this.setupGestureManagement();
            this.setupUI();

            this.updateStatus('Ready - No gestures defined. Add your first gesture!');
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.updateStatus('Failed to initialize - Check console for details');
        }
    }

    setupEventListeners() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const clearBtn = document.getElementById('clear-btn');
        const speakBtn = document.getElementById('speak-btn');

        startBtn.addEventListener('click', () => this.startDetection());
        stopBtn.addEventListener('click', () => this.stopDetection());
        clearBtn.addEventListener('click', () => this.clearText());
        speakBtn.addEventListener('click', () => this.speakText());
    }

    setupGestureManagement() {
        const addGestureBtn = document.getElementById('add-gesture-btn');
        const listGesturesBtn = document.getElementById('list-gestures-btn');
        const clearGesturesBtn = document.getElementById('clear-gestures-btn');
        const recordGestureBtn = document.getElementById('record-gesture-btn');
        const saveGestureBtn = document.getElementById('save-gesture-btn');
        const cancelGestureBtn = document.getElementById('cancel-gesture-btn');

        addGestureBtn.addEventListener('click', () => this.showGestureCreationPanel());
        listGesturesBtn.addEventListener('click', () => this.listCurrentGestures());
        clearGesturesBtn.addEventListener('click', () => this.clearAllGestures());
        recordGestureBtn.addEventListener('click', () => this.startGestureRecording());
        saveGestureBtn.addEventListener('click', () => this.saveRecordedGesture());
        cancelGestureBtn.addEventListener('click', () => this.cancelGestureCreation());

        const trainModelBtn = document.getElementById('train-model-btn');
        if (trainModelBtn) {
            trainModelBtn.addEventListener('click', () => this.trainModel());
        }
    }

    setupUI() {
        // Set up rate control
        const rateControl = document.getElementById('rate-control');
        const rateValue = document.getElementById('rate-value');

        rateControl.addEventListener('input', (e) => {
            rateValue.textContent = parseFloat(e.target.value).toFixed(1);
        });

        // Update gesture list display
        this.updateGesturesList();
    }

    async setupCamera() {
        try {
            this.camera = new CameraManager();
            await this.camera.initialize();
            console.log('📹 Camera initialized');
        } catch (error) {
            throw new Error(`Camera setup failed: ${error.message}`);
        }
    }

    setupHandDetection() {
        this.handDetector = new HandDetector();
        this.handDetector.onResults = (results) => {
            this.handleHandDetectionResults(results);
        };
        console.log('✋ Hand detection initialized');
    }

    setupGestureRecognition() {
        this.gestureRecognizer = new GestureRecognizer();
        console.log('🤖 Clean gesture recognition initialized');
    }

    setupTextToSpeech() {
        this.textToSpeech = new TextToSpeechManager();
        console.log('🔊 Text-to-speech initialized');
    }

    // FIXED Gesture Management Methods
    showGestureCreationPanel() {
        const panel = document.getElementById('gesture-creation-panel');
        panel.style.display = 'block';
        document.getElementById('gesture-name-input').focus();
        console.log('📝 Gesture creation panel opened');
    }

    hideGestureCreationPanel() {
        const panel = document.getElementById('gesture-creation-panel');
        panel.style.display = 'none';
        this.isRecordingGesture = false;
        this.recordedLandmarks = [];
        document.getElementById('gesture-name-input').value = '';
        document.getElementById('recording-status').innerHTML = '';
        document.getElementById('record-gesture-btn').disabled = false;
        document.getElementById('save-gesture-btn').disabled = true;
        console.log('📝 Gesture creation panel closed');
    }

    startGestureRecording() {
        const gestureName = document.getElementById('gesture-name-input').value.trim();

        if (!gestureName) {
            alert('Please enter a gesture name first!');
            document.getElementById('gesture-name-input').focus();
            return;
        }

        if (!this.isRunning) {
            alert('Please start detection first!');
            return;
        }

        // Check if gesture name already exists
        const existingGestures = this.gestureRecognizer.listGestures();
        if (existingGestures.includes(gestureName)) {
            if (!confirm(`Gesture "${gestureName}" already exists. Overwrite it?`)) {
                return;
            }
            this.gestureRecognizer.removeGesture(gestureName);
        }

        // Start recording
        this.isRecordingGesture = true;
        this.recordedLandmarks = [];
        this.recordingStartTime = Date.now();

        document.getElementById('recording-status').innerHTML = `
            <div class="recording-indicator">
                🔴 <strong>RECORDING: ${gestureName}</strong><br>
                Make the gesture and hold it steady!<br>
                <div class="recording-progress">
                    Samples collected: <span id="sample-count">0</span><br>
                    Time: <span id="recording-time">0</span>s
                </div>
            </div>
        `;

        document.getElementById('record-gesture-btn').disabled = true;
        document.getElementById('save-gesture-btn').disabled = false;

        // Start recording timer
        this.recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            const timeSpan = document.getElementById('recording-time');
            if (timeSpan) {
                timeSpan.textContent = elapsed;
            }

            // Auto-save after 5 seconds if we have enough samples
            if (elapsed >= 5 && this.recordedLandmarks.length >= 50) {
                this.saveRecordedGesture();
            }
        }, 100);

        console.log(`🎯 Started recording gesture: ${gestureName}`);
    }

    // FIXED - Proper landmark recording
    recordLandmarks(landmarks) {
        if (this.isRecordingGesture && landmarks && landmarks.length >= 21) {
            // Deep copy landmarks to avoid reference issues
            const landmarksCopy = landmarks.map(point => ({
                x: point.x,
                y: point.y,
                z: point.z || 0
            }));

            this.recordedLandmarks.push(landmarksCopy);

            // Update UI
            const sampleCount = document.getElementById('sample-count');
            if (sampleCount) {
                sampleCount.textContent = this.recordedLandmarks.length;
            }

            // Debug logging every 10 samples
            if (this.recordedLandmarks.length % 10 === 0) {
                console.log(`📊 Recorded ${this.recordedLandmarks.length} landmark samples`);
            }

            // Auto-save when we have enough samples
            if (this.recordedLandmarks.length >= 100) { // ~3-4 seconds at 30fps
                console.log('✅ Auto-saving gesture (enough samples collected)');
                this.saveRecordedGesture();
            }
        }
    }

    // FIXED - Better gesture analysis
    saveRecordedGesture() {
        const gestureName = document.getElementById('gesture-name-input').value.trim();

        if (!gestureName) {
            alert('Please enter a gesture name!');
            return;
        }

        if (this.recordedLandmarks.length === 0) {
            alert('No gesture data recorded! Make sure to make the gesture while recording.');
            return;
        }

        console.log(`💾 Saving gesture "${gestureName}" with ${this.recordedLandmarks.length} samples`);

        // Stop recording timer
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }

        // Add all recorded samples to the ML dataset
        let addedCount = 0;
        this.recordedLandmarks.forEach(landmarks => {
            if (this.gestureRecognizer.addGestureData(gestureName, landmarks)) {
                addedCount++;
            }
        });

        const success = addedCount > 0;

        if (success) {
            // Add to custom gesture mapping
            this.customGestureMap[gestureName] = `${gestureName} `;

            console.log(`✅ Gesture "${gestureName}" saved successfully! Added ${addedCount} samples to dataset.`);
            alert(`✅ Gesture "${gestureName}" saved!\n${addedCount} samples added to dataset\nTrain the model to enable recognition.`);

            this.updateGesturesList();
            this.hideGestureCreationPanel();
        } else {
            console.error(`❌ Failed to save gesture "${gestureName}"`);
            alert('❌ Failed to save gesture. No valid data recorded.');
        }
    }

    // FIXED - More robust gesture analysis
    analyzeRecordedGesture(landmarkSamples) {
        console.log(`🔍 Analyzing ${landmarkSamples.length} landmark samples`);

        const definition = this.gestureRecognizer.createGestureDefinition();

        if (landmarkSamples.length === 0) {
            console.warn('No landmark samples to analyze');
            return definition;
        }

        // Analyze finger positions more robustly
        const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky tips
        const fingerPIPs = [3, 6, 10, 14, 18]; // PIP joints (better reference than MCP)
        const fingerMCPs = [2, 5, 9, 13, 17]; // MCP joints

        fingerTips.forEach((tipIndex, fingerIndex) => {
            let extendedCount = 0;
            let curlCount = 0;

            // Analyze each sample
            landmarkSamples.forEach(landmarks => {
                if (landmarks && landmarks[tipIndex] && landmarks[fingerPIPs[fingerIndex]]) {
                    const tip = landmarks[tipIndex];
                    const pip = landmarks[fingerPIPs[fingerIndex]];
                    const mcp = landmarks[fingerMCPs[fingerIndex]];

                    if (fingerIndex === 0) { 
                        // Thumb - check horizontal distance
                        const horizontalDist = Math.abs(tip.x - mcp.x);
                        const verticalDist = Math.abs(tip.y - mcp.y);

                        if (horizontalDist > verticalDist * 0.8) {
                            extendedCount++;
                        } else {
                            curlCount++;
                        }
                    } else { 
                        // Other fingers - check if tip is above PIP and MCP
                        if (tip.y < pip.y && tip.y < mcp.y) {
                            extendedCount++;
                        } else {
                            curlCount++;
                        }
                    }
                }
            });

            // Determine finger state based on majority
            const totalSamples = landmarkSamples.length;
            const extendedRatio = extendedCount / totalSamples;
            const fingerEnum = [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky][fingerIndex];

            console.log(`Finger ${fingerIndex}: ${extendedCount}/${totalSamples} extended (${(extendedRatio*100).toFixed(1)}%)`);

            if (extendedRatio > 0.75) {
                // Finger is clearly extended
                this.gestureRecognizer.addFingerState(definition, fingerEnum, fp.FingerCurl.NoCurl, null, 0.9);
            } else if (extendedRatio < 0.25) {
                // Finger is clearly curled
                this.gestureRecognizer.addFingerState(definition, fingerEnum, fp.FingerCurl.FullCurl, null, 0.9);
            } else {
                // Finger is in between (half curl)
                this.gestureRecognizer.addFingerState(definition, fingerEnum, fp.FingerCurl.HalfCurl, null, 0.7);
            }
        });

        console.log('✅ Gesture analysis complete');
        return definition;
    }

    cancelGestureCreation() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }

        this.hideGestureCreationPanel();
        console.log('❌ Gesture creation cancelled');
    }

    listCurrentGestures() {
        const gestures = this.gestureRecognizer.listGestures();
        const stats = this.gestureRecognizer.getDatasetStats();
        if (gestures.length === 0) {
            alert('No gestures defined yet. Add your first gesture!');
        } else {
            const gestureList = gestures.map(name => `• ${name} (${stats[name] || 0} samples)`).join('\n');
            const totalSamples = Object.values(stats).reduce((a, b) => a + b, 0);
            alert(`Current gestures (${gestures.length}, ${totalSamples} total samples):\n\n${gestureList}`);
        }
        console.log('📋 Listed current gestures:', gestures);
    }

    clearAllGestures() {
        if (confirm('Are you sure you want to remove ALL gestures and dataset? Model will need retraining. This cannot be undone.')) {
            this.gestureRecognizer.clearAllGestures();
            this.customGestureMap = {};
            this.updateGesturesList();
            alert('All gestures cleared!');
            console.log('🧹 All gestures cleared');
        }
    }

    updateGesturesList() {
        const gesturesList = document.getElementById('gestures-list');
        const gestures = this.gestureRecognizer.listGestures();
        const stats = this.gestureRecognizer.getDatasetStats();

        if (gestures.length === 0) {
            gesturesList.innerHTML = '<p class="no-gestures">No gestures defined. Add your first gesture!</p>';
        } else {
            gesturesList.innerHTML = `
                <div class="gesture-items">
                    ${gestures.map(name => `
                        <div class="gesture-item">
                            <span class="gesture-name">${name}</span>
                            <span class="gesture-samples">${stats[name] || 0} samples</span>
                            <span class="gesture-text">"${this.customGestureMap[name] || name + ' '}"</span>
                            <button class="btn-remove" onclick="app.removeGesture('${name}')">🗑️</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    removeGesture(gestureName) {
        if (confirm(`Remove gesture "${gestureName}" and its data?`)) {
            this.gestureRecognizer.removeGesture(gestureName);
            delete this.customGestureMap[gestureName];
            this.updateGesturesList();
            console.log(`🗑️ Removed gesture: ${gestureName}`);
        }
    }

    // Train the ML model
    async trainModel() {
        if (this.gestureRecognizer.isTraining) {
            alert('Training already in progress!');
            return;
        }

        const gestures = this.gestureRecognizer.listGestures();
        if (gestures.length < 2) {
            alert('Need at least 2 gestures with data to train the model!');
            return;
        }

        const stats = this.gestureRecognizer.getDatasetStats();
        const totalSamples = Object.values(stats).reduce((a, b) => a + b, 0);
        if (totalSamples < 20) {
            alert('Need more samples! Aim for at least 10-20 samples per gesture.');
            return;
        }

        if (!confirm(`Train model with ${gestures.length} gestures and ${totalSamples} samples? This may take a few minutes.`)) {
            return;
        }

        const trainingProgress = document.getElementById('training-progress');
        if (trainingProgress) {
            trainingProgress.textContent = 'Training model...';
        } else {
            this.updateStatus('Training model...');
        }

        try {
            await this.gestureRecognizer.trainModel((epoch, total, acc, valAcc) => {
                const progress = `Epoch ${epoch}/${total} | Acc: ${(acc*100).toFixed(1)}% | Val: ${(valAcc*100).toFixed(1)}%`;
                if (trainingProgress) {
                    trainingProgress.textContent = progress;
                } else {
                    this.updateStatus(progress);
                }
            });

            if (trainingProgress) {
                trainingProgress.textContent = 'Training complete!';
                setTimeout(() => {
                    trainingProgress.textContent = '';
                }, 3000);
            }
            this.updateStatus('✅ Model trained and ready for recognition!');
            alert('Model trained successfully! Now try recognizing gestures.');
        } catch (error) {
            console.error('Training failed:', error);
            if (trainingProgress) {
                trainingProgress.textContent = 'Training failed - Check console';
            }
            this.updateStatus('Training failed');
            alert(`Training failed: ${error.message}`);
        }
    }

    // FIXED - Text mapping
    gestureToText(gestureName) {
        // Use custom mapping or return gesture name with space
        const mappedText = this.customGestureMap[gestureName] || `${gestureName} `;
        console.log(`🔤 Mapped gesture "${gestureName}" to text: "${mappedText}"`);
        return mappedText;
    }

    // FIXED Detection methods
    async startDetection() {
        if (this.isRunning) return;

        try {
            this.isRunning = true;

            // Update UI
            document.getElementById('start-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            document.getElementById('video').classList.add('recording');

            // Start camera and detection
            await this.camera.start();
            this.handDetector.start(this.camera.videoElement);

            // Start FPS counter
            this.startFpsCounter();

            this.updateStatus('🟢 Detection active - Make gestures or record new ones');
            console.log('🚀 Detection started');

        } catch (error) {
            console.error('❌ Failed to start detection:', error);
            this.updateStatus('Failed to start detection');
            this.stopDetection();
        }
    }

    stopDetection() {
        if (!this.isRunning) return;

        this.isRunning = false;

        // Stop components
        if (this.handDetector) {
            this.handDetector.stop();
        }
        if (this.camera) {
            this.camera.stop();
        }

        // Stop any recording
        if (this.isRecordingGesture && this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }

        // Update UI
        document.getElementById('start-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('video').classList.remove('recording');

        this.updateStatus('⏹️ Detection stopped');
        this.updateCurrentGesture('Detection stopped');
        document.getElementById('fps').textContent = 'FPS: 0';

        console.log('⏹️ Detection stopped');
    }

    handleHandDetectionResults(results) {
        if (!this.isRunning) return;

        // Update FPS
        this.updateFps();

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Process the first detected hand
            const landmarks = results.multiHandLandmarks[0];

            // Record landmarks if recording (FIXED - proper data flow)
            if (this.isRecordingGesture) {
                this.recordLandmarks(landmarks);
            }

            if (!this.isRecordingGesture) {
                const gesture = this.gestureRecognizer.recognizeGesture(landmarks);

                if (gesture && gesture.name !== 'no_model_trained' && gesture.name !== 'prediction_error' && gesture.confidence > 0.5) {
                    this.processGesture(gesture);
                } else {
                    this.updateCurrentGesture('Train model first or low confidence');
                }
            } else {
                this.updateCurrentGesture('🔴 Recording in progress...');
            }
        } else {
            // No hand detected
            if (this.isRecordingGesture) {
                this.updateCurrentGesture('🔴 Recording - No hand detected');
            } else {
                this.updateCurrentGesture('No hand detected');
            }
        }
    }

    processGesture(gesture) {
        const currentTime = Date.now();

        // Update current gesture display
        this.updateCurrentGesture(gesture.name, gesture.confidence);

        // Add to gesture buffer for stability
        this.gestureBuffer.push({
            name: gesture.name,
            confidence: gesture.confidence,
            timestamp: currentTime
        });

        // Keep only recent gestures (last 1 second)
        this.gestureBuffer = this.gestureBuffer.filter(
            g => currentTime - g.timestamp < 1000
        );

        // Check if we have a stable gesture
        if (this.gestureBuffer.length >= 15) { // More samples for stability
            const stableGesture = this.getStableGesture();

            if (stableGesture && 
                stableGesture !== this.currentGesture &&
                currentTime - this.lastGestureTime > this.gestureTimeout) {

                this.addGestureToText(stableGesture);
                this.currentGesture = stableGesture;
                this.lastGestureTime = currentTime;
                this.gestureBuffer = []; // Clear buffer after adding gesture
            }
        }
    }

    getStableGesture() {
        if (this.gestureBuffer.length === 0) return null;

        // Find the most common gesture in the buffer
        const gestureCounts = {};
        this.gestureBuffer.forEach(g => {
            gestureCounts[g.name] = (gestureCounts[g.name] || 0) + 1;
        });

        let mostCommon = null;
        let maxCount = 0;

        for (const [name, count] of Object.entries(gestureCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = name;
            }
        }

        // Require at least 80% consistency for better stability
        return maxCount >= this.gestureBuffer.length * 0.8 ? mostCommon : null;
    }

    // FIXED - Text accumulation
    addGestureToText(gestureName) {
        const textToAdd = this.gestureToText(gestureName);

        if (textToAdd) {
            this.detectedText += textToAdd;
            this.updateDetectedText();
            document.getElementById('speak-btn').disabled = false;

            console.log(`➕ Added to text: "${textToAdd}" | Full text now: "${this.detectedText}"`);
        }
    }

    // FIXED - Text clearing
    clearText() {
        this.detectedText = '';
        this.updateDetectedText();
        document.getElementById('speak-btn').disabled = true;
        console.log('🗑️ Text cleared');
    }

    // FIXED - Speech functionality  
    speakText() {
        const textToSpeak = this.detectedText.trim();

        if (!textToSpeak) {
            alert('No text to speak! Detect some gestures first.');
            return;
        }

        console.log(`🔊 Speaking full text: "${textToSpeak}"`);
        this.textToSpeech.speak(textToSpeak);
    }

    updateDetectedText() {
        const textElement = document.getElementById('detected-text');
        textElement.textContent = this.detectedText;

        // Scroll to show latest text if overflowing
        textElement.scrollTop = textElement.scrollHeight;
    }

    updateCurrentGesture(name, confidence = null) {
        document.getElementById('gesture-name').textContent = name;
        if (confidence !== null) {
            document.getElementById('confidence').textContent = 
                `(${(confidence * 100).toFixed(1)}%)`;
        } else {
            document.getElementById('confidence').textContent = '';
        }
    }

    updateStatus(message) {
        document.getElementById('status').textContent = message;
    }

    startFpsCounter() {
        this.lastFpsTime = performance.now();
        this.fpsCounter = 0;
    }

    updateFps() {
        this.fpsCounter++;
        const currentTime = performance.now();

        if (currentTime - this.lastFpsTime >= 1000) { // Update every second
            const fps = Math.round(this.fpsCounter * 1000 / (currentTime - this.lastFpsTime));
            document.getElementById('fps').textContent = `FPS: ${fps}`;
            this.fpsCounter = 0;
            this.lastFpsTime = currentTime;
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SignLanguageApp(); // Global reference for button callbacks
    console.log('🚀 Fixed app ready - Better gesture recording & text handling');
});