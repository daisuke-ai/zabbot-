import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  Avatar,
  Spinner,
} from '@chakra-ui/react';
import { chatService } from '../services/chatService';
import '../styles/blog.css';

function EnhancedChatbot(promptText) {
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
    if (promptText.inputText) {
      setInputMessage(promptText.inputText);
    }
  }, [promptText]);

  useEffect(() => {
    // initial welcome message
    setMessages([
      {
        text: "Hello! I'm ZABBOT, your SZABIST University AI assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date()
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);

    // Add user's message
    setMessages((prev) => [...prev, {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }]);

    try {
      // Get response from chatService
      const response = await chatService.sendMessage(inputMessage);

      // Add bot's response
      setMessages((prev) => [...prev, {
        text: response,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error:', error);
      // Show error message to user
      setMessages((prev) => [...prev, {
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Box h="55vh" maxH="600px" w="full" maxW="2xl" mx="auto">
      <Box
        display="flex"
        flexDirection="column"
        h="full"
        overflow="hidden"
      >
        {/* Messages Container */}
        <Box
          ref={chatContainerRef}
          flex="1"
          overflowY="auto"
          p={4}
          className='no-scrollbar no-scrollbar::-webkit-scrollbar'
        >
          <VStack spacing={4} align="stretch">
            {messages.map((msg, index) => (
              <Flex
                key={index}
                justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
                align="start"
                gap={2}
              >
                {msg.sender === 'bot' && (
                  <Avatar
                    size="sm"
                    name="ZABBOT"
                    bg="blue.600"
                    color="white"
                  />
                )}
                <Box
                  maxW="80%"
                  bg={msg.sender === 'user'
                    ? 'blue.500'
                    : msg.isError
                      ? 'red.50'
                      : 'gray.100'}
                  color={msg.sender === 'user'
                    ? 'white'
                    : msg.isError
                      ? 'red.800'
                      : 'black'}
                  p={3}
                  borderRadius="lg"
                  boxShadow="sm"
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {msg.text}
                  </Text>
                  <Text fontSize="xs" opacity={0.7} mt={1}>
                    {formatTimestamp(msg.timestamp)}
                  </Text>
                </Box>
                {msg.sender === 'user' && (
                  <Avatar
                    size="sm"
                    name="User"
                    bg="green.500"
                    color="white"
                  />
                )}
              </Flex>
            ))}
            {isLoading && (
              <Flex align="center" p={2}>
                <Avatar
                  size="sm"
                  name="ZABBOT"
                  bg="blue.600"
                  color="white"
                  mr={2}
                />
                <Spinner size="sm" color="blue.600" />
              </Flex>
            )}
          </VStack>
        </Box>

        {/* Input Area */}
        <Box
          bg="white"
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={4}
          m={4}
          w={{ base: "90%", md: 800 }}
          shadow="2xl"
          position={'fixed'}
          bottom={4}
          left="48%"
          transform="translateX(-50%)"
        >
          <Flex direction={{ base: "column", md: "row" }} // Stack vertically on mobile, horizontally on desktop
            gap={2}
            w="full">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask ZABBOT anything about SZABIST..."
              size="md"
              p={{base: 2, md: 4}}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
              bg="white"
              flex="1"
            />
            <Button
              onClick={sendMessage}
              isLoading={isLoading}
              loadingText="Sending..."
              size="md"
              px={4}
              disabled={!inputMessage.trim() || isLoading}
              colorScheme="blue"
            >
              Send
            </Button>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}

export default EnhancedChatbot;
