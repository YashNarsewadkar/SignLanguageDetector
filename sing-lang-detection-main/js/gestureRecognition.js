// ML-Based Gesture Recognition using TensorFlow.js
class GestureRecognizer {
    constructor() {
        this.model = null;
        this.dataset = new Map(); // gestureName -> array of flattened landmarks
        this.gestureLabels = []; // array of gesture names for class indices
        this.isTrained = false;
        this.isTraining = false;
        this.initialize();
    }

    initialize() {
        console.log('🤖 ML Gesture recognizer initialized');
        console.log('📝 Ready to collect gesture data and train model');

        // Check if TensorFlow.js is available
        if (typeof tf === 'undefined') {
            console.error('❌ TensorFlow.js not loaded');
            return;
        }

        // Try to load saved model
        this.loadModel();
    }

    // Add gesture data (landmarks) to dataset
    addGestureData(gestureName, landmarks) {
        if (!landmarks || landmarks.length !== 21) {
            console.warn('Invalid landmarks for gesture data');
            return false;
        }

        // Flatten landmarks: [x1,y1,z1, x2,y2,z2, ...]
        const flattened = [];
        landmarks.forEach(point => {
            flattened.push(point.x, point.y, point.z || 0);
        });

        // Normalize by centering on wrist (point 0)
        const wrist = landmarks[0];
        for (let i = 0; i < flattened.length; i += 3) {
            flattened[i] -= wrist.x;     // x
            flattened[i + 1] -= wrist.y; // y
            // z remains relative
        }

        if (!this.dataset.has(gestureName)) {
            this.dataset.set(gestureName, []);
        }
        this.dataset.get(gestureName).push(flattened);

        console.log(`📊 Added sample to ${gestureName} (total: ${this.dataset.get(gestureName).length})`);
        return true;
    }

    // Remove a gesture from dataset
    removeGesture(gestureName) {
        if (this.dataset.has(gestureName)) {
            this.dataset.delete(gestureName);
            this.updateGestureLabels();
            this.isTrained = false; // Model needs retraining
            console.log(`🗑️ Removed gesture: ${gestureName}`);
            return true;
        }
        return false;
    }

    // Clear all gestures
    clearAllGestures() {
        this.dataset.clear();
        this.gestureLabels = [];
        this.isTrained = false;
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        console.log('🧹 All gestures cleared');
    }

    // List all current gestures
    listGestures() {
        return Array.from(this.dataset.keys());
    }

    // Update gesture labels array
    updateGestureLabels() {
        this.gestureLabels = Array.from(this.dataset.keys()).sort();
    }

    // Train the ML model
    async trainModel(onProgress = null) {
        if (this.dataset.size < 2) {
            throw new Error('Need at least 2 different gestures to train');
        }

        this.isTraining = true;
        this.updateGestureLabels();

        try {
            console.log('🏗️ Building training data...');

            // Prepare training data
            const allSamples = [];
            const allLabels = [];

            this.dataset.forEach((samples, gestureName) => {
                const labelIndex = this.gestureLabels.indexOf(gestureName);
                samples.forEach(sample => {
                    allSamples.push(sample);
                    allLabels.push(labelIndex);
                });
            });

            // Convert to tensors
            const xs = tf.tensor2d(allSamples);
            const ys = tf.oneHot(allLabels, this.gestureLabels.length);

            // Split into train/validation (80/20)
            const splitIndex = Math.floor(allSamples.length * 0.8);
            const trainXs = xs.slice(0, splitIndex);
            const trainYs = ys.slice(0, splitIndex);
            const valXs = xs.slice(splitIndex);
            const valYs = ys.slice(splitIndex);

            console.log(`📊 Training on ${trainXs.shape[0]} samples, validating on ${valXs.shape[0]} samples`);

            // Build model
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

            // Train model
            const history = await this.model.fit(trainXs, trainYs, {
                epochs: 50,
                batchSize: 32,
                validationData: [valXs, valYs],
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (onProgress) {
                            onProgress(epoch + 1, 50, logs.acc, logs.val_acc);
                        }
                        console.log(`Epoch ${epoch + 1}: acc=${logs.acc.toFixed(3)}, val_acc=${logs.val_acc.toFixed(3)}`);
                    }
                }
            });

            this.isTrained = true;
            console.log('✅ Model trained successfully!');

            // Save model
            await this.saveModel();

            // Cleanup tensors
            xs.dispose();
            ys.dispose();
            trainXs.dispose();
            trainYs.dispose();
            valXs.dispose();
            valYs.dispose();

            return history;

        } catch (error) {
            console.error('❌ Training failed:', error);
            throw error;
        } finally {
            this.isTraining = false;
        }
    }

    // Recognize gesture using ML model
    recognizeGesture(landmarks) {
        if (!this.isTrained || !this.model || !landmarks || landmarks.length !== 21) {
            return { name: 'no_model_trained', confidence: 0.0 };
        }

        try {
            // Flatten and normalize landmarks
            const flattened = [];
            landmarks.forEach(point => {
                flattened.push(point.x, point.y, point.z || 0);
            });

            const wrist = landmarks[0];
            for (let i = 0; i < flattened.length; i += 3) {
                flattened[i] -= wrist.x;
                flattened[i + 1] -= wrist.y;
            }

            // Predict
            const input = tf.tensor2d([flattened]);
            const prediction = this.model.predict(input);
            const probabilities = prediction.dataSync();
            const predictedIndex = prediction.argMax(1).dataSync()[0];
            const confidence = probabilities[predictedIndex];

            // Cleanup
            input.dispose();
            prediction.dispose();

            const gestureName = this.gestureLabels[predictedIndex];

            return {
                name: gestureName,
                confidence: confidence
            };

        } catch (error) {
            console.error('Prediction error:', error);
            return { name: 'prediction_error', confidence: 0.0 };
        }
    }

    // Save model to localStorage
    async saveModel() {
        if (!this.model) return;

        try {
            await this.model.save('localstorage://gesture-model');
            console.log('💾 Model saved to localStorage');
        } catch (error) {
            console.error('Failed to save model:', error);
        }
    }

    // Load model from localStorage
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('localstorage://gesture-model');
            this.isTrained = true;
            console.log('📂 Model loaded from localStorage');
        } catch (error) {
            console.log('No saved model found, starting fresh');
        }
    }

    // Get dataset statistics
    getDatasetStats() {
        const stats = {};
        this.dataset.forEach((samples, name) => {
            stats[name] = samples.length;
        });
        return stats;
    }

    // Export dataset to JSON
    exportDataset() {
        const exportData = {
            labels: this.gestureLabels,
            dataset: Object.fromEntries(this.dataset)
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import dataset from JSON
    importDataset(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            this.dataset = new Map(Object.entries(importData.dataset));
            this.gestureLabels = importData.labels || [];
            this.isTrained = false; // Need to retrain
            console.log('📥 Dataset imported successfully');
        } catch (error) {
            console.error('Failed to import dataset:', error);
        }
    }
}
