import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  useToast,
  Flex,
  Avatar,
  Spinner,
} from '@chakra-ui/react';

function EnhancedChatbot() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // initial welcome message
    setMessages([
      {
        text: "Hello! I'm ZABBOT, your SZABIST University AI assistant. How can I help you today?",
        sender: 'bot',
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);

    // add user's message
    setMessages((prev) => [...prev, { text: inputMessage, sender: 'user' }]);
    setInputMessage('');

    // mock delayed response (replace with chatService)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Here's a response from ZABBOT!", sender: 'bot' },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Box
      /* A smaller fixed-height container */
      width="500px"
      height="600px"
      display="flex"
      flexDirection="column"
      bg="gray.50"
      borderRadius="md"
      boxShadow="lg"
      overflow="hidden"
      mx="auto"       /* center horizontally if you like */
      mt="4"          /* some margin at the top */
    >
      {/* Scrollable messages area */}
      <Box
        ref={chatContainerRef}
        flex="1"
        overflowY="auto"
        p={4}
        css={{
          /* OPTIONAL: style the scrollbar (Chrome/Edge/Safari) */
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '8px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#555',
          },
        }}
      >
        <VStack spacing={4} align="stretch">
          {messages.map((msg, index) => (
            <Flex
              key={index}
              justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
            >
              <Box
                maxW="80%"
                bg={msg.sender === 'user' ? 'blue.500' : 'gray.200'}
                color={msg.sender === 'user' ? 'white' : 'black'}
                p={4}
                borderRadius="lg"
                boxShadow="md"
              >
                <Text fontSize="md" whiteSpace="pre-wrap">
                  {msg.text}
                </Text>
              </Box>
            </Flex>
          ))}
          {isLoading && (
            <Flex align="center" p={4}>
              <Avatar size="sm" name="ZABBOT" bg="blue.600" color="white" mr={2} />
              <Spinner size="sm" color="blue.600" />
            </Flex>
          )}
        </VStack>
      </Box>

      {/* Input bar at the bottom (not scrollable) */}
      <Box
        bg="white"
        borderTop="1px"
        borderColor="gray.200"
        p={4}
      >
        <VStack spacing={3}>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask ZABBOT anything about SZABIST..."
            size="md"
            bg="white"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <Button
            colorScheme="blue"
            onClick={sendMessage}
            isLoading={isLoading}
            loadingText="Sending..."
            w="full"
            size="md"
          >
            Send
          </Button>
        </VStack>
      </Box>
    </Box>
  );
}

export default EnhancedChatbot;
