import React, { useState } from 'react';
import { Box, VStack, Input, Button, Text } from '@chakra-ui/react';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: 'user' }]);
      // Mock response (in a real app, this would come from your backend)
      setTimeout(() => {
        setMessages(prev => [...prev, { text: "I'm a mock chatbot. In a real application, I would use a RAG system to provide accurate information about SZABIST.", sender: 'bot' }]);
      }, 1000);
      setInput('');
    }
  };

  return (
    <Box border="1px" borderColor="gray.200" borderRadius="md" p={4} h="400px" display="flex" flexDirection="column">
      <VStack flex={1} overflowY="auto" spacing={4} align="stretch" mb={4}>
        {messages.map((message, index) => (
          <Box key={index} alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}>
            <Text bg={message.sender === 'user' ? 'blue.100' : 'gray.100'} p={2} borderRadius="md">
              {message.text}
            </Text>
          </Box>
        ))}
      </VStack>
      <Box>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          mr={2}
        />
        <Button onClick={handleSend} colorScheme="blue" mt={2}>Send</Button>
      </Box>
    </Box>
  );
}

export default Chatbot;