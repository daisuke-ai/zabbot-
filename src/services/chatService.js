const API_URL = 'https://zabbot-77cc2c8ce224.herokuapp.com/';

export const chatService = {
  async sendMessage(message) {
    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
};
