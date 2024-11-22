import React from 'react';
import { Container, Heading, VStack, Box } from '@chakra-ui/react';
import EnhancedChatbot from '../components/EnhancedChatbot';

function ChatbotPage() {
  return (
    <Container maxW="container.md" py={8}>
      <Heading textAlign="center" mb={6} color="szabist.700">
        ZABBOT - Your SZABIST AI Assistant
      </Heading>
      <VStack spacing={6} align="stretch">
        <Box
          bg="white"
          borderRadius="xl"
          boxShadow="2xl"
          p={6}
          minH="600px"
          overflow="hidden"
        >
          <EnhancedChatbot />
        </Box>
      </VStack>
    </Container>
  );
}

export default ChatbotPage;
