const API_URL = 'http://127.0.0.1:7860/api/v1/run/b94852ad-02f3-4fb5-80e8-9fc1135c0768';

export const chatService = {
  async sendMessage(message) {
    try {
      console.log('Sending message:', message);
      
      const response = await fetch(${API_URL}?stream=false, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input_value: message,
          output_type: "chat",
          input_type: "chat",
          tweaks: {
            "ChatInput-S3Deq": {},
            "ParseData-kP5c4": {},
            "Prompt-VT6Nv": {},
            "SplitText-kNt85": {},
            "OpenAIModel-740Ss": {},
            "ChatOutput-g5pi2": {},
            "AstraDB-z1BBB": {},
            "OpenAIEmbeddings-u5CQO": {},
            "AstraDB-kGxZC": {},
            "OpenAIEmbeddings-7xdHf": {},
            "File-AUfXq": {}
          }
        })
      });

      if (!response.ok) {
        console.error('API Error:', await response.text());
        throw new Error(HTTP error! status: ${response.status});
      }

      const data = await response.json();
      console.log('Raw API Response:', data);
      
      // Extract message from the nested structure
      if (data.outputs && 
          data.outputs[0] && 
          data.outputs[0].outputs && 
          data.outputs[0].outputs[0] && 
          data.outputs[0].outputs[0].results && 
          data.outputs[0].outputs[0].results.message && 
          data.outputs[0].outputs[0].results.message.text) {
        return data.outputs[0].outputs[0].results.message.text;
      }
      
      // Fallback for messages array
      if (data.outputs && 
          data.outputs[0] && 
          data.outputs[0].messages && 
          data.outputs[0].messages[0] && 
          data.outputs[0].messages[0].message) {
        return data.outputs[0].messages[0].message;
      }

      console.error('Could not find message in response:', data);
      throw new Error('Invalid response structure from API');
    } catch (error) {
      console.error('Error in chatService:', error);
      throw error;
    }
  }
};