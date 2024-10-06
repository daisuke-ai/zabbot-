import React from 'react';
import { Box, Heading, Text, Container, SimpleGrid, Image } from '@chakra-ui/react';

function Research() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={4}>Research at SZABIST</Heading>
      <Text mb={8}>
        SZABIST is committed to advancing knowledge through cutting-edge research across various disciplines. 
        Our faculty and students are engaged in innovative research projects that address real-world challenges 
        and contribute to societal progress.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <Box>
          <Heading size="md" mb={4}>Research Centers</Heading>
          <Text mb={2}>- Center for Advanced Studies in Engineering</Text>
          <Text mb={2}>- Artificial Intelligence and Data Science Lab</Text>
          <Text mb={2}>- Business Innovation and Entrepreneurship Center</Text>
          <Text mb={2}>- Social Sciences Research Institute</Text>
        </Box>
        <Box>
          <Image src="https://via.placeholder.com/600x400" alt="SZABIST Research Lab" borderRadius="md" />
        </Box>
      </SimpleGrid>
      <Box mt={8}>
        <Heading size="md" mb={4}>Recent Publications</Heading>
        <Text mb={2}>- "Advancements in Machine Learning Algorithms for Predictive Maintenance" - Dr. Ahmed Khan</Text>
        <Text mb={2}>- "Impact of Digital Transformation on Pakistani SMEs" - Prof. Fatima Ali</Text>
        <Text mb={2}>- "Sustainable Urban Planning: A Case Study of Karachi" - Dr. Zainab Hassan</Text>
      </Box>
    </Container>
  );
}

export default Research;