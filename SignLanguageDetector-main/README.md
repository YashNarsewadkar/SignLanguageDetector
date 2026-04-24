🧠 Sign Language Detector

A web-based application that detects and translates sign language gestures into speech in real time.

🔧 Tech Stack:

MediaPipe Hands (CDN): Hand landmark detection

TensorFlow.js: Machine learning for gesture recognition

Fingerpose: Gesture analysis

Web Speech API: Converts recognized text to speech

Vanilla JavaScript: UI and app logic

http-server (npm): Local development server

⚙️ How It Works:
The app captures live video using the webcam, detects hand landmarks via MediaPipe, and recognizes gestures with a TensorFlow.js model. Detected gestures are mapped to text, which is then converted to speech using the Web Speech API. The user interface allows recording, training, and real-time translation of custom gestures.
