// ML-Based Gesture Recognition using TensorFlow.js
class GestureRecognizer {
    constructor() {
        this.model = null;
        this.dataset = new Map();
        this.gestureLabels = [];
        this.isTrained = false;
        this.isTraining = false;
        this.initialize();
    }

    initialize() {
        console.log('🤖 ML Gesture recognizer initialized');

        if (typeof tf === 'undefined') {
            console.error('❌ TensorFlow.js not loaded');
            return;
        }

        this.loadModel();
    }

    // Add gesture data
    addGestureData(gestureName, landmarks) {
        if (!landmarks || landmarks.length !== 21) {
            console.warn('Invalid landmarks');
            return false;
        }

        const flattened = [];
        landmarks.forEach(point => {
            flattened.push(point.x, point.y, point.z || 0);
        });

        const wrist = landmarks[0];
        for (let i = 0; i < flattened.length; i += 3) {
            flattened[i] -= wrist.x;
            flattened[i + 1] -= wrist.y;
        }

        if (!this.dataset.has(gestureName)) {
            this.dataset.set(gestureName, []);
        }

        this.dataset.get(gestureName).push(flattened);

        console.log(`📊 Added to ${gestureName}`);
        return true;
    }

    removeGesture(gestureName) {
        if (this.dataset.has(gestureName)) {
            this.dataset.delete(gestureName);
            this.updateGestureLabels();
            this.isTrained = false;
            return true;
        }
        return false;
    }

    clearAllGestures() {
        this.dataset.clear();
        this.gestureLabels = [];
        this.isTrained = false;

        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }

    listGestures() {
        return Array.from(this.dataset.keys());
    }

    updateGestureLabels() {
        this.gestureLabels = Array.from(this.dataset.keys()).sort();
    }

    // Train model
    async trainModel(onProgress = null) {
        if (this.dataset.size < 2) {
            throw new Error('Need at least 2 gestures');
        }

        this.isTraining = true;
        this.updateGestureLabels();

        try {
            const allSamples = [];
            const allLabels = [];

            this.dataset.forEach((samples, gestureName) => {
                const labelIndex = this.gestureLabels.indexOf(gestureName);
                samples.forEach(sample => {
                    allSamples.push(sample);
                    allLabels.push(labelIndex);
                });
            });

            const xs = tf.tensor2d(allSamples);
            const ys = tf.oneHot(allLabels, this.gestureLabels.length);

            const splitIndex = Math.floor(allSamples.length * 0.8);
            const trainXs = xs.slice(0, splitIndex);
            const trainYs = ys.slice(0, splitIndex);
            const valXs = xs.slice(splitIndex);
            const valYs = ys.slice(splitIndex);

            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ inputShape: [63], units: 128, activation: 'relu' }));
            this.model.add(tf.layers.dropout({ rate: 0.2 }));
            this.model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
            this.model.add(tf.layers.dropout({ rate: 0.2 }));
            this.model.add(tf.layers.dense({ units: this.gestureLabels.length, activation: 'softmax' }));

            this.model.compile({
                optimizer: tf.train.adam(0.001),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            await this.model.fit(trainXs, trainYs, {
                epochs: 50,
                batchSize: 32,
                validationData: [valXs, valYs],
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (onProgress) {
                            onProgress(epoch + 1, 50, logs.acc, logs.val_acc);
                        }
                    }
                }
            });

            this.isTrained = true;
            console.log('✅ Model trained');

            await this.saveModel();

            xs.dispose(); ys.dispose();
            trainXs.dispose(); trainYs.dispose();
            valXs.dispose(); valYs.dispose();

        } catch (error) {
            console.error('Training failed:', error);
        } finally {
            this.isTraining = false;
        }
    }

    // Predict
    recognizeGesture(landmarks) {
        if (!this.isTrained || !this.model || !landmarks) {
            return { name: 'no_model', confidence: 0 };
        }

        const flattened = [];
        landmarks.forEach(p => flattened.push(p.x, p.y, p.z || 0));

        const wrist = landmarks[0];
        for (let i = 0; i < flattened.length; i += 3) {
            flattened[i] -= wrist.x;
            flattened[i + 1] -= wrist.y;
        }

        const input = tf.tensor2d([flattened]);
        const prediction = this.model.predict(input);

        const probs = prediction.dataSync();
        const index = prediction.argMax(1).dataSync()[0];

        input.dispose();
        prediction.dispose();

        return {
            name: this.gestureLabels[index],
            confidence: probs[index]
        };
    }

    // 🔥 SAVE MODEL (USER BASED)
    async saveModel() {
        if (!this.model) return;

        try {
            let user = localStorage.getItem("currentUser");

            await this.model.save('localstorage://gesture-model_' + user);

            const datasetJSON = this.exportDataset();
            let key = "gesture-dataset_" + user;

            localStorage.setItem(key, datasetJSON);

            console.log('💾 Saved for user:', user);
        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    // 🔥 LOAD MODEL (USER BASED)
    async loadModel() {
        try {
            let user = localStorage.getItem("currentUser");

            this.model = await tf.loadLayersModel('localstorage://gesture-model_' + user);

            let key = "gesture-dataset_" + user;
            const savedDataset = localStorage.getItem(key);

            if (savedDataset) {
                this.importDataset(savedDataset);
                this.updateGestureLabels();
            }

            this.isTrained = true;
            console.log('✅ Loaded for user:', user);

        } catch {
            console.log('⚠️ No model found (new user)');
        }
    }

    exportDataset() {
        return JSON.stringify({
            labels: this.gestureLabels,
            dataset: Object.fromEntries(this.dataset)
        });
    }

    importDataset(jsonData) {
        const data = JSON.parse(jsonData);
        this.dataset = new Map(Object.entries(data.dataset));
        this.gestureLabels = data.labels || [];
        this.isTrained = false;
    }
}