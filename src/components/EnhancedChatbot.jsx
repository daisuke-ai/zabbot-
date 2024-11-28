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
import { keyframes } from '@emotion/react';
import { chatService } from '../services/chatService';

const blink = keyframes`
  0% { opacity: .2; }
  20% { opacity: 1; }
  100% { opacity: .2; }
`;

const TypingIndicator = () => (
  <Flex align="center" p={4}>
    <Avatar size="sm" name="ZABBOT" bg="szabist.600" color="white" mr={2} />
    <Spinner size="sm" color="szabist.600" />
  </Flex>
);

const MessageBubble = ({ message, sender }) => (
  <Flex
    justify={sender === 'user' ? 'flex-end' : 'flex-start'}
    mb={4}
    align="start"
  >
    {sender === 'bot' && (
      <Avatar size="sm" name="ZABBOT" bg="szabist.600" color="white" mr={2} />
    )}
    <Box
      maxW="80%"
      bg={sender === 'user' ? 'szabist.500' : 'gray.100'}
      color={sender === 'user' ? 'white' : 'black'}
      p={4}
      borderRadius="lg"
      boxShadow="md"
    >
      <Text
        fontSize="md"
        whiteSpace="pre-wrap"
        sx={{
          '& p': {
            mb: 2,
          },
          '& p:last-child': {
            mb: 0,
          },
        }}
      >
        {message}
      </Text>
    </Box>
    {sender === 'user' && (
      <Avatar size="sm" name="User" ml={2} />
    )}
  </Flex>
);

function EnhancedChatbot() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const toast = useToast();

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      
      chatContainerRef.current.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    setMessages([{
      text: "Hello! I'm ZABBOT, your SZABIST University AI assistant. How can I help you today?",
      sender: 'bot'
    }]);
  }, []);

  const formatResponse = (text) => {
    return text.split('\n\n').join('\n\n');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    try {
      setIsLoading(true);
      const newMessages = [...messages, { text: inputMessage, sender: 'user' }];
      setMessages(newMessages);
      setInputMessage('');

      const response = await chatService.sendMessage(inputMessage);
      const formattedResponse = formatResponse(response);
      
      setMessages([...newMessages, { text: formattedResponse, sender: 'bot' }]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="full">
      <Box
        ref={chatContainerRef}
        p={4}
        bg="gray.50"
        borderRadius="xl"
        height="500px"
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
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
          scrollBehavior: 'smooth',
        }}
      >
        <VStack spacing={4} align="stretch">
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message.text}
              sender={message.sender}
            />
          ))}
          {isLoading && <TypingIndicator />}
        </VStack>
      </Box>
      
      <Box 
        p={4} 
        bg="white" 
        borderTop="1px" 
        borderColor="gray.200"
      >
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask ZABBOT anything about SZABIST..."
          size="lg"
          bg="white"
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isLoading}
        />
        <Button
          mt={2}
          colorScheme="szabist"
          onClick={sendMessage}
          isLoading={isLoading}
          loadingText="Sending..."
          w="full"
          size="lg"
        >
          Send Message
        </Button>
      </Box>
    </VStack>
  );
}

export default EnhancedChatbot;

