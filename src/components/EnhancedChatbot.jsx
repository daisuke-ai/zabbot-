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
import { chatService } from '../services/chatService';

function EnhancedChatbot() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

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

    // Add user's message
    setMessages((prev) => [...prev, { text: inputMessage, sender: 'user' }]);

    try {
      // Get response from chatService
      const response = await chatService.sendMessage(inputMessage);

      // Add bot's response
      setMessages((prev) => [...prev, { text: response, sender: 'bot' }]);
    } catch (error) {
      console.error('Error:', error);
      // Show error message to user
      setMessages((prev) => [...prev, {
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot'
      }]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        overflow="hidden"
        mx="auto"       /* center horizontally if you like */
        mb="4"
        ref={chatContainerRef}
        flex="1"
        overflowY="auto"
        p={4}
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
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        m={4}
        w={800}
        shadow="2xl"
        position={'fixed'}
        bottom={4}
        left="48%"
        transform="translateX(-50%)"
      >
        <Flex>
          {/* Input Field */}
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask ZABBOT anything about SZABIST..."
            size="md"
            bg="white"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
            flex="1"
            mr={2} /* Add spacing between input and button */
          />

          {/* Send Button */}
          <Button
            onClick={sendMessage}
            isLoading={isLoading}
            loadingText="Sending..."
            size="md"
            px={4}
            disabled={!inputMessage.trim() || isLoading}
          >
            Send
          </Button>
        </Flex>
      </Box>
    </>
  );
}

export default EnhancedChatbot;
