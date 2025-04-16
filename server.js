const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/files");
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// --- Configuration ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not defined in .env file.");
    process.exit(1);
}
if (!GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("Warning: GOOGLE_APPLICATION_CREDENTIALS is not set. TTS and STT will not function.");
    // Consider if the app should exit(1) here depending on requirements
} else if (!fs.existsSync(GOOGLE_APPLICATION_CREDENTIALS)) {
    console.error(`Error: Google credentials file not found at ${GOOGLE_APPLICATION_CREDENTIALS}`);
    process.exit(1);
}

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Parse JSON bodies

// Configure Multer for file uploads (audio)
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

// --- AI Clients Initialization ---
let genAI, fileManager, model, chat, ttsClient, speechClient;

try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use the latest flash model
    chat = model.startChat({
        // Optional: Add initial history or system instructions here
        // history: [ { role: "user", parts: [{ text: "Initial prompt" }] } ],
        // generationConfig: { maxOutputTokens: 100 },
    });
    console.log("Gemini AI initialized successfully.");
} catch (error) {
    console.error("Failed to initialize Gemini AI:", error);
    process.exit(1);
}

// Initialize Google Cloud clients only if credentials are set
if (GOOGLE_APPLICATION_CREDENTIALS) {
    try {
        ttsClient = new textToSpeech.TextToSpeechClient();
        console.log("Google Text-to-Speech client initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Google Text-to-Speech client:", error);
        // Continue running, but TTS will fail
    }
    try {
        speechClient = new speech.SpeechClient();
        console.log("Google Speech-to-Text client initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize Google Speech-to-Text client:", error);
        // Continue running, but STT will fail
    }
}

// --- Global State (Consider alternatives for production) ---
// let isVoiceModeEnabled = false; // Initially disabled -> REMOVED

// --- API Endpoints ---

// POST /chat - Handles text messages from the user
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;

    if (!userMessage) {
        return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`Received message: ${userMessage}`);

    try {
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();
        console.log(`Sending reply: ${text}`);
        res.json({ reply: text });
    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ error: 'Failed to get response from AI', details: error.message });
    }
});

// POST /transcribe - Handles audio uploads for transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    if (!speechClient) {
        return res.status(503).json({ error: 'Speech-to-Text service is not available. Check credentials.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    console.log(`Received audio file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    const audioBytes = req.file.buffer.toString('base64');

    const audio = {
        content: audioBytes,
    };
    const config = {
        encoding: 'WEBM_OPUS', // Common format from MediaRecorder
        sampleRateHertz: 48000,  // Default for many browsers, but can vary
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        // model: 'default' // Or specify a model like 'telephony' or 'medical_dictation' if applicable
    };
    const request = {
        audio: audio,
        config: config,
    };

    try {
        console.log("Sending audio to Google Speech-to-Text API...");
        const [response] = await speechClient.recognize(request);
        console.log("Received response from Google Speech-to-Text API.");

        if (!response.results || response.results.length === 0 || !response.results[0].alternatives || response.results[0].alternatives.length === 0) {
            console.log("Transcription returned no results.");
            return res.json({ text: '' }); // Return empty if no transcription
        }

        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        console.log(`Transcription: ${transcription}`);
        res.json({ text: transcription });
    } catch (error) {
        console.error('Google Speech-to-Text API error:', error);
        res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
    }
});

// POST /tts - Converts text to speech
app.post('/tts', async (req, res) => {
    if (!ttsClient) {
        return res.status(503).json({ error: 'Text-to-Speech service is not available. Check credentials.' });
    }

    const text = req.body.text;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`Received text for TTS: ${text}`);

    const request = {
        input: { text: text },
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' }, // Adjust voice as needed
        // Example voices: en-US-Wavenet-D (male), en-US-Wavenet-F (female)
        // voice: { name: 'en-US-Wavenet-D', languageCode: 'en-US' },
        audioConfig: { audioEncoding: 'MP3' }, // MP3 is widely supported
    };

    try {
        console.log("Sending text to Google Text-to-Speech API...");
        const [response] = await ttsClient.synthesizeSpeech(request);
        console.log("Received audio content from Google Text-to-Speech API.");

        // Set appropriate headers for audio playback in the browser
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline'); // Suggests browser play it directly
        res.send(response.audioContent);

    } catch (error) {
        console.error('Google Text-to-Speech API error:', error);
        res.status(500).json({ error: 'Failed to synthesize speech', details: error.message });
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
