// 🔒 LOGIN PROTECTION
let user = localStorage.getItem("currentUser");

if (!user) {
    window.location.href = "login.html";
}

// Show welcome user
document.addEventListener("DOMContentLoaded", () => {
    let el = document.getElementById("welcome-user");

    if (el && user) {
        el.innerText = "👤 " + user;
    }
});
class SignLanguageApp {
    constructor() {
        this.clearTextTimer = null;
        this.isRunning = false;
        this.detectedText = '';
        this.currentGesture = null;
        this.gestureBuffer = [];
        this.lastGestureTime = 0;
        this.gestureTimeout = 2000;
        this.fpsCounter = 0;
        this.lastFpsTime = 0;
        this.isRecordingGesture = false;
        this.recordedLandmarks = [];
        this.recordingStartTime = 0;

        // 🔥 USER-SPECIFIC GESTURE MAP
        let key = "gesture-map_" + user;
        this.customGestureMap = JSON.parse(localStorage.getItem(key)) || {};
        this.gestureMapKey = key;

        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.setupCamera();
            this.setupHandDetection();
            this.setupGestureRecognition();
            this.setupTextToSpeech();
            this.setupEventListeners();
            this.setupGestureManagement();
            this.setupUI();

            this.updateStatus('Ready - Add your first gesture!');
        } catch (error) {
            console.error(error);
            this.updateStatus('Initialization failed');
        }
    }

    setupEventListeners() {
        document.getElementById('start-btn').onclick = () => this.startDetection();
        document.getElementById('stop-btn').onclick = () => this.stopDetection();
        document.getElementById('clear-btn').onclick = () => this.clearText();
        document.getElementById('speak-btn').onclick = () => this.speakText();
    }

    setupGestureManagement() {
        document.getElementById('add-gesture-btn').onclick = () => this.showGestureCreationPanel();
        document.getElementById('list-gestures-btn').onclick = () => this.listCurrentGestures();
        document.getElementById('clear-gestures-btn').onclick = () => this.clearAllGestures();
        document.getElementById('record-gesture-btn').onclick = () => this.startGestureRecording();
        document.getElementById('save-gesture-btn').onclick = () => this.saveRecordedGesture();
        document.getElementById('cancel-gesture-btn').onclick = () => this.cancelGestureCreation();

        let trainBtn = document.getElementById('train-model-btn');
        if (trainBtn) trainBtn.onclick = () => this.trainModel();
    }

    setupUI() {
        this.updateGesturesList();
    }

    async setupCamera() {
        this.camera = new CameraManager();
        await this.camera.initialize();
    }

    setupHandDetection() {
        this.handDetector = new HandDetector();
        this.handDetector.onResults = (r) => this.handleHandDetectionResults(r);
    }

    setupGestureRecognition() {
        this.gestureRecognizer = new GestureRecognizer();
    }

    setupTextToSpeech() {
        this.textToSpeech = new TextToSpeechManager();
    }

    showGestureCreationPanel() {
        document.getElementById('gesture-creation-panel').style.display = 'block';
    }

    hideGestureCreationPanel() {
        document.getElementById('gesture-creation-panel').style.display = 'none';
        this.isRecordingGesture = false;
        this.recordedLandmarks = [];
    }

    startGestureRecording() {
    let name = document.getElementById('gesture-name-input').value.trim();

    if (!name) {
        alert("Please enter gesture name");
        return;
    }

    if (!this.isRunning) {
        alert("Please click 'Start Detection' first");
        return;
    }

    this.isRecordingGesture = true;
    this.recordedLandmarks = [];

    console.log("🎯 Recording started for:", name);
}

   recordLandmarks(landmarks) {
    if (!this.isRecordingGesture) return;

    this.recordedLandmarks.push(JSON.parse(JSON.stringify(landmarks)));

    // 🔥 SHOW SAMPLE COUNT
    let status = document.getElementById('recording-status');
    if (status) {
        status.innerText = `Recording... ${this.recordedLandmarks.length} samples`;
    }

    // 🔥 ENABLE SAVE BUTTON
    let saveBtn = document.getElementById('save-gesture-btn');
    if (saveBtn) saveBtn.disabled = false;
}

   saveRecordedGesture() {
    let name = document.getElementById('gesture-name-input').value.trim();

    if (!name || this.recordedLandmarks.length === 0) {
        alert("No data");
        return;
    }

    this.recordedLandmarks.forEach(l =>
        this.gestureRecognizer.addGestureData(name, l)
    );

    // 🔥 STOP RECORDING
    this.isRecordingGesture = false;

    // 🔥 CLEAR STATUS
    let status = document.getElementById('recording-status');
    if (status) status.innerText = "";

    // SAVE USER MAP
    this.customGestureMap[name] = name + " ";
    localStorage.setItem(this.gestureMapKey, JSON.stringify(this.customGestureMap));

    alert("Gesture saved! Train model.");

    this.updateGesturesList();
    
    this.hideGestureCreationPanel();

}

    clearAllGestures() {
        if (!confirm("Delete all?")) return;

        this.gestureRecognizer.clearAllGestures();
        this.customGestureMap = {};

        // 🔥 SAVE CLEAR STATE
        localStorage.setItem(this.gestureMapKey, JSON.stringify(this.customGestureMap));

        this.updateGesturesList();
    }

    removeGesture(name) {
        this.gestureRecognizer.removeGesture(name);
        delete this.customGestureMap[name];

        // 🔥 SAVE UPDATE
        localStorage.setItem(this.gestureMapKey, JSON.stringify(this.customGestureMap));

        this.updateGesturesList();
    }

    updateGesturesList() {
        let el = document.getElementById('gestures-list');
        let gestures = this.gestureRecognizer.listGestures();

        el.innerHTML = gestures.length === 0
            ? "No gestures"
            : gestures.map(g => `<div>${g}</div>`).join("");
    }
    listCurrentGestures() {
    let el = document.getElementById('gestures-list');

    if (!el) return;

    // Show loading first
    el.innerHTML = "⏳ Loading gestures...";

    setTimeout(() => {
        let gestures = this.gestureRecognizer.listGestures();

        if (gestures.length === 0) {
            el.innerHTML = "<p>No gestures found</p>";
        } else {
            el.innerHTML = gestures.map(g => `<div>✔ ${g}</div>`).join("");
        }

        console.log("Gestures:", gestures);
    }, 100);
}

async trainModel() {
    let btn = document.getElementById('train-model-btn');
    if (btn) btn.disabled = true;

    let status = document.getElementById('status');
    if (status) status.innerText = "⏳ Training...";

    await this.gestureRecognizer.trainModel();

    if (btn) btn.disabled = false;
    if (status) status.innerText = "✅ Training complete";
}

    gestureToText(name) {
        return this.customGestureMap[name] || name + " ";
    }

    // async startDetection() {
    //     this.isRunning = true;
    //     await this.camera.start();
    //     this.handDetector.start(this.camera.videoElement);
    // }

    async startDetection() {
    try {
        this.isRunning = true;

        await this.camera.start();
        this.handDetector.start(this.camera.videoElement);

        // 🔥 ENABLE STOP, DISABLE START
        document.getElementById('start-btn').disabled = true;
        document.getElementById('stop-btn').disabled = false;

        console.log("✅ Detection started");

    } catch (e) {
        console.error("Camera error:", e);
    }
}

    // stopDetection() {
    //     this.isRunning = false;
    //     this.handDetector.stop();
    //     this.camera.stop();
    // }

    stopDetection() {
    this.isRunning = false;

    this.handDetector.stop();
    this.camera.stop();

    // 🔥 ENABLE START, DISABLE STOP
    document.getElementById('start-btn').disabled = false;
    document.getElementById('stop-btn').disabled = true;

    console.log("⛔ Detection stopped");
}

   handleHandDetectionResults(results) {
    // 🔥 Check if hand exists FIRST
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {

        this.currentGesture = null;

        // Start clear timer (10 sec)
        if (!this.clearTextTimer) {
            this.clearTextTimer = setTimeout(() => {
                this.detectedText = "";
                this.updateDetectedText();
                this.clearTextTimer = null;
            }, 10000);
        }

        return;
    }

    // 🔥 Hand detected → cancel timer
    if (this.clearTextTimer) {
        clearTimeout(this.clearTextTimer);
        this.clearTextTimer = null;
    }

    let lm = results.multiHandLandmarks[0];

    // 🔥 Recording mode
    if (this.isRecordingGesture) {
        this.recordLandmarks(lm);
        return;
    }

    let g = this.gestureRecognizer.recognizeGesture(lm);

    console.log("Prediction:", g); // debug

    if (
        g &&
        g.name &&
        g.name !== "no_model" &&
        g.confidence > 0.5
    ) {
        this.addGestureToText(g.name);
    }
}
    addGestureToText(name) {
    if (this.currentGesture === name) return;

    this.currentGesture = name;

    this.detectedText = this.gestureToText(name);
    this.updateDetectedText();
} 

    updateDetectedText() {
    let el = document.getElementById('detected-text');
    let speakBtn = document.getElementById('speak-btn');

    if (el) {
        el.textContent = this.detectedText;
    }

    // 🔥 Enable / Disable Speak button
    if (speakBtn) {
        speakBtn.disabled = !this.detectedText;
    }
}

    clearText() {
        this.detectedText = '';
        this.updateDetectedText();
    }

    speakText() {
    if (!this.detectedText) {
        alert("No text to speak");
        return;
    }

    let utterance = new SpeechSynthesisUtterance(this.detectedText);
    speechSynthesis.speak(utterance);
}

    updateStatus(msg) {
        document.getElementById('status').textContent = msg;
    }
}

// INIT
document.addEventListener("DOMContentLoaded", () => {
    window.app = new SignLanguageApp();
});

// 🔒 LOGOUT
window.logout = function () {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
};