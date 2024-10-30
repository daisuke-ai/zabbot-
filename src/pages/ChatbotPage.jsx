import React from 'react';
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react';
import EnhancedChatbot from '../components/EnhancedChatbot.jsx';

function ChatbotPage() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center" mb={8}>
          <Heading size="2xl" mb={4} color="szabist.700">
            SZABIST AI Assistant
          </Heading>
          <Text fontSize="xl" color="gray.600">
            Get instant answers to your questions about SZABIST
          </Text>
        </Box>
        <Box 
          bg="white" 
          borderRadius="xl" 
          boxShadow="2xl"
          p={6}
          minH="600px"
        >
          <EnhancedChatbot />
        </Box>
      </VStack>
    </Container>
  );
}

export default ChatbotPage;