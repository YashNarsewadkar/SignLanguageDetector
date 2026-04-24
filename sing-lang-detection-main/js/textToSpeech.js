// Text-to-speech using Web Speech API
class TextToSpeechManager {
    constructor() {
        this.synth = null;
        this.voices = [];
        this.currentVoice = null;
        this.rate = 1.0;
        this.pitch = 1.0;
        this.volume = 1.0;
        this.isSupported = false;

        this.initialize();
    }

    initialize() {
        // Check if speech synthesis is supported
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.isSupported = true;

            // Load voices
            this.loadVoices();

            // Setup voice change event
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => {
                    this.loadVoices();
                };
            }

            console.log('🔊 Text-to-speech initialized');
        } else {
            console.warn('⚠️ Speech synthesis not supported');
            this.showUnsupportedMessage();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();

        // Filter English voices and sort by quality
        this.voices = this.voices
            .filter(voice => voice.lang.startsWith('en'))
            .sort((a, b) => {
                // Prefer premium/high-quality voices
                if (a.name.includes('Premium') && !b.name.includes('Premium')) return -1;
                if (!a.name.includes('Premium') && b.name.includes('Premium')) return 1;
                return a.name.localeCompare(b.name);
            });

        // Set default voice
        if (this.voices.length > 0 && !this.currentVoice) {
            this.currentVoice = this.voices[0];
        }

        // Update voice selector
        this.updateVoiceSelector();

        console.log(`Loaded ${this.voices.length} voices`);
    }

    updateVoiceSelector() {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;

        // Clear existing options
        voiceSelect.innerHTML = '';

        // Add voice options
        this.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;

            if (voice === this.currentVoice) {
                option.selected = true;
            }

            voiceSelect.appendChild(option);
        });

        // Setup voice change handler
        voiceSelect.addEventListener('change', (e) => {
            this.currentVoice = this.voices[parseInt(e.target.value)];
            console.log('Voice changed to:', this.currentVoice.name);
        });
    }

    speak(text, options = {}) {
        if (!this.isSupported) {
            this.showUnsupportedMessage();
            return;
        }

        if (!text.trim()) {
            console.warn('No text to speak');
            return;
        }

        try {
            // Stop any current speech
            this.stop();

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);

            // Set voice and properties
            utterance.voice = options.voice || this.currentVoice;
            utterance.rate = options.rate || this.getRate();
            utterance.pitch = options.pitch || this.pitch;
            utterance.volume = options.volume || this.volume;

            // Set up event handlers
            utterance.onstart = () => {
                console.log('🔊 Speech started');
                this.updateSpeakButton('🔇 Stop', true);
            };

            utterance.onend = () => {
                console.log('✅ Speech finished');
                this.updateSpeakButton('🔊 Speak Text', false);
            };

            utterance.onerror = (event) => {
                console.error('❌ Speech error:', event.error);
                this.updateSpeakButton('🔊 Speak Text', false);
            };

            // Speak the text
            this.synth.speak(utterance);

        } catch (error) {
            console.error('Speech synthesis error:', error);
            this.updateSpeakButton('🔊 Speak Text', false);
        }
    }

    stop() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
            this.updateSpeakButton('🔊 Speak Text', false);
            console.log('⏹️ Speech stopped');
        }
    }

    pause() {
        if (this.synth && this.synth.speaking) {
            this.synth.pause();
            console.log('⏸️ Speech paused');
        }
    }

    resume() {
        if (this.synth && this.synth.paused) {
            this.synth.resume();
            console.log('▶️ Speech resumed');
        }
    }

    getRate() {
        const rateControl = document.getElementById('rate-control');
        return rateControl ? parseFloat(rateControl.value) : 1.0;
    }

    setRate(rate) {
        this.rate = Math.max(0.1, Math.min(2.0, rate));
        const rateControl = document.getElementById('rate-control');
        const rateValue = document.getElementById('rate-value');

        if (rateControl) {
            rateControl.value = this.rate;
        }
        if (rateValue) {
            rateValue.textContent = this.rate.toFixed(1);
        }
    }

    updateSpeakButton(text, isActive) {
        const speakBtn = document.getElementById('speak-btn');
        if (speakBtn) {
            speakBtn.textContent = text;
            speakBtn.classList.toggle('speaking', isActive);

            // Update click handler for stop functionality
            if (isActive) {
                speakBtn.onclick = () => this.stop();
            } else {
                speakBtn.onclick = () => {
                    const detectedText = document.getElementById('detected-text').textContent;
                    if (detectedText.trim()) {
                        this.speak(detectedText);
                    }
                };
            }
        }
    }

    showUnsupportedMessage() {
        const speakBtn = document.getElementById('speak-btn');
        if (speakBtn) {
            speakBtn.textContent = '❌ Not Supported';
            speakBtn.disabled = true;
            speakBtn.title = 'Speech synthesis is not supported in this browser';
        }
    }

    // Utility method to test speech
    test() {
        this.speak('Hello! This is a test of the text to speech system.');
    }

    // Get available voice information
    getVoiceInfo() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            gender: voice.name.toLowerCase().includes('female') ? 'female' : 
                   voice.name.toLowerCase().includes('male') ? 'male' : 'unknown'
        }));
    }
}