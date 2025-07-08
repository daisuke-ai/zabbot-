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
    <Box
      minH="100vh"
      pb={24}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        // Base gradient background
        background: 'linear-gradient(135deg, #cce3ff 0%, #e0e7ff 50%, #b3d9ff 100%)', // Dynamic blue gradient
        // Overlay a repeating hexagon pattern with more visibility
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,<svg width='150' height='130' viewBox='0 0 150 130' fill='none' xmlns='http://www.w3.org/2000/svg'><g opacity='0.25' stroke='%238cbaff' stroke-width='2'><polygon points='75,5 145,40 145,100 75,135 5,100 5,40'/></g></svg>")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '150px 130px',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxW="container.md" py={4} position="relative" zIndex={1}>
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