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
  IconButton,
  HStack,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Badge
} from '@chakra-ui/react';
import { FaPaperPlane } from 'react-icons/fa';
import axios from 'axios'; // Using axios for simpler POST requests

function DatabaseChatbot({ currentUserContext }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const toast = useToast();
  const [errorAlert, setErrorAlert] = useState(null);

  // IMPORTANT: Use the new port for the DB Assistant Server
  const DB_ASSISTANT_API_BASE_URL = import.meta.env.VITE_DB_ASSISTANT_URL || 'http://localhost:3036';

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
    setMessages([
      {
        text: "Hello! I'm your ZABBOT Database Assistant. Ask me questions about student marks, courses, teachers, and other university data. I'll fetch it directly from the database based on your role.",
        sender: 'bot',
        timestamp: new Date()
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);
    setErrorAlert(null); // Clear previous errors

    const userMessage = {
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      if (!currentUserContext || !currentUserContext.role || !currentUserContext.userId) {
        throw new Error("User context is missing. Please ensure you are logged in and your role is defined.");
      }

      const response = await axios.post(`${DB_ASSISTANT_API_BASE_URL}/api/db-assistant-query`, {
        query: userMessage.text,
        userContext: currentUserContext
      }, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${currentUserContext.token}`, // Add this if you re-enable auth
        }
      });

      if (response.data.success) {
        const generatedSql = response.data.generated_sql;
        let botResponseText = response.data.response; // Now expecting a direct string response

        setMessages(prev => [...prev, {
          text: botResponseText,
          sender: 'bot',
          timestamp: new Date()
        }]);
      } else {
        throw new Error(response.data.error || "Unknown error occurred.");
      }

    } catch (error) {
      console.error('Error sending database query:', error);
      const errorMessage = error.response?.data?.error || error.message || "An unexpected error occurred while processing your query.";
      setErrorAlert({
        title: "Database Query Failed",
        description: errorMessage,
      });
      setMessages(prev => [...prev, {
        text: `Error: ${errorMessage}`,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderMessageContent = (message) => {
    if (message.isError) {
      return <Text color="red.500">{message.text}</Text>;
    }
    return <Text fontSize="sm" whiteSpace="pre-wrap">{message.text}</Text>;
  };

  return (
    <Box h="65vh" maxH="700px" w="full" maxW="3xl" mx="auto" borderRadius="lg" boxShadow="lg" overflow="hidden">
      <Box
        display="flex"
        flexDirection="column"
        h="full"
        overflow="hidden"
        bgColor="white"
      >
        {/* Header */}
        <Box bg="purple.700" p={3} color="white">
          <Flex alignItems="center">
            <Avatar
              size="sm"
              name="ZABBOT DB"
              bg="purple.500"
              color="white"
              mr={2}
            />
            <Text fontWeight="bold">ZABBOT Database Assistant</Text>
            <Flex ml="auto">
              <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="full">Online</Badge>
            </Flex>
          </Flex>
        </Box>
        
        {/* Messages Container */}
        <Box
          flex="1"
          overflowY="auto"
          p={4}
          ref={chatContainerRef}
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c5c5c5',
              borderRadius: '24px',
            },
          }}
          bg="gray.50"
        >
          {errorAlert && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <Box flex="1">
                <AlertTitle>{errorAlert.title}</AlertTitle>
                <AlertDescription>{errorAlert.description}</AlertDescription>
              </Box>
              <CloseButton position="absolute" right="8px" top="8px" onClick={() => setErrorAlert(null)} />
            </Alert>
          )}
          <VStack spacing={4} align="stretch">
            {messages.map((msg, index) => (
              <Flex
                key={index}
                justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
                mb={2}
              >
                {msg.sender === 'bot' && (
                  <Avatar
                    size="sm"
                    name="ZABBOT DB"
                    bg="purple.700"
                    color="white"
                    mr={2}
                    alignSelf="flex-end"
                    mb={1}
                  />
                )}
                <Box
                  bg={msg.sender === 'user' ? 'purple.600' : 'white'}
                  color={msg.sender === 'user' ? 'white' : 'gray.800'}
                  borderRadius="lg"
                  p={3}
                  maxW="75%"
                  boxShadow="sm"
                  borderWidth={msg.sender === 'bot' ? '1px' : '0'}
                  borderColor="gray.200"
                >
                  {renderMessageContent(msg)}
                  <Text
                    fontSize="xs"
                    opacity={0.7}
                    textAlign="right"
                    mt={1}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </Text>
                </Box>
                {msg.sender === 'user' && (
                  <Avatar
                    size="sm"
                    name="User"
                    bg="gray.500"
                    color="white"
                    ml={2}
                    alignSelf="flex-end"
                    mb={1}
                  />
                )}
              </Flex>
            ))}
            {isLoading && (
              <Flex align="center" p={2}>
                <Avatar
                  size="sm"
                  name="ZABBOT DB"
                  bg="purple.700"
                  color="white"
                  mr={2}
                />
                <Spinner size="sm" color="purple.700" />
                <Text ml={2} fontSize="sm" color="gray.600">Processing query...</Text>
              </Flex>
            )}
          </VStack>
        </Box>

        {/* Input Area */}
        <Box
          bg="white"
          p={3}
          borderTop="1px"
          borderColor="gray.200"
        >
          <Flex gap={2} w="full">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me about the database (e.g., 'show all students', 'what are the marks for student X?')..."
              size="md"
              borderRadius="full"
              borderColor="gray.300"
              _hover={{ borderColor: "gray.400" }}
              _focus={{ borderColor: "purple.500", boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" }}
              disabled={isLoading}
              bg="white"
              flex="1"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <HStack spacing={2}>
              {/* Send Button */}
              <IconButton
                icon={<FaPaperPlane />}
                onClick={sendMessage}
                isLoading={isLoading}
                isRound
                size="md"
                isDisabled={!inputMessage.trim() || isLoading}
                colorScheme="purple"
                aria-label="Send message"
              />
            </HStack>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}

export default DatabaseChatbot; 