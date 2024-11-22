import React from 'react';
import { Box, Heading, Text, Container, SimpleGrid } from '@chakra-ui/react';
import Chatbot from '../components/Chatbot';

function Portal() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={4}>SZABIST Educational Portal</Heading>
      <Text mb={8}>Welcome to your educational portal. Here you can access your courses, grades, and use the chatbot for assistance.</Text>
      <SimpleGrid columns={2} spacing={8}>
        <Box>
          <Heading size="md" mb={4}>Your Courses</Heading>
          <Text>Course list would appear here in a real application.</Text>
        </Box>
        <Box>
          <Heading size="md" mb={4}>Portal Chatbot</Heading>
          <Chatbot />
        </Box>
      </SimpleGrid>
    </Container>
  );
}

export default Portal;