const API_URL = import.meta.env.VITE_API_URL;

export const chatService = {
  async sendMessage(message) {
    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  },

  async sendMessageStreaming(message, onChunk) {
    try {
      const response = await fetch(`${API_URL}/query-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Check if the response is a stream
      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      // Create a reader to read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk and call the callback
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
      
      return true;
    } catch (error) {
      console.error('Streaming Error:', error);
      throw error;
    }
  },

  async generateSpeech(text) {
    try {
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('TTS request failed');
      
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  },

  async transcribeAudio(formData) {
    try {
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData // Send as FormData instead of JSON
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Transcription Error:', error);
      throw error;
    }
  }
};