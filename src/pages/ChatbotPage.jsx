import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  HStack,
  Button,
  useColorModeValue,
  Icon,
  Divider,
  Flex,
  Heading,
  Text,
  VStack
} from '@chakra-ui/react';
import EnhancedChatbot from '../components/EnhancedChatbot';
import { FaGraduationCap, FaCalendar, FaBook, FaQuestionCircle, FaRobot } from 'react-icons/fa';

function ChatbotPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  const [promptText, setPromptText] = useState('');
  const prompts = [
    {
      icon: FaGraduationCap,
      text: "What programs are offered at SZABIST?",
    },
    {
      icon: FaCalendar,
      text: "When are the mid-term exams?",
    },
    {
      icon: FaBook,
      text: "Tell me about the CS program",
    },
    {
      icon: FaQuestionCircle,
      text: "What are the campus facilities?",
    }
  ];

  return (
    <Box minH="90vh" bg={bgColor} pb={24}>
      <Container maxW="container.md" py={4}>
        {/* Header Section */}
        <VStack spacing={1} mb={6}>
          <Flex align="center" gap={2}>
            <Heading size="lg" color="szabist.700" fontWeight="bold">
              ZABBOT
            </Heading>
            <Icon as={FaRobot} w={7} h={7} color="szabist.600" />
          </Flex>
          <Text color="gray.600" fontSize="md">
            Your SZABIST AI Assistant
          </Text>
        </VStack>

        <Box
          overflow="auto"
        >
          
          <Divider />
          
          {/* Prompt Section */}
          <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')}>
            <HStack spacing={2} justify="center" flexWrap="wrap" gap={2}>
              {prompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  colorScheme="gray"
                  size="md"
                  py={2}
                  px={3}
                  height="auto"
                  whiteSpace="normal"
                  textAlign="left"
                  fontSize="sm"
                  leftIcon={<Icon as={prompt.icon} boxSize="4" />}
                  _hover={{
                    bg: useColorModeValue('gray.100', 'gray.600'),
                    transform: 'translateY(-1px)',
                  }}
                  transition="all 0.2s"
                  onClick={() =>  setPromptText(prompt.text) }
                >
                  {prompt.text}
                </Button>
              ))}
            </HStack>
          </Box>
          <EnhancedChatbot inputText={promptText || ''} />
          </Box>
      </Container>
    </Box>
  );
}

export default ChatbotPage;
