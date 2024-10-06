import React from 'react';
import { Box, Heading, Text, Container, SimpleGrid, List, ListItem, ListIcon, Image } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

function Academics() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={4}>Academics at SZABIST</Heading>
      <Text mb={8}>
        SZABIST offers a wide range of undergraduate and graduate programs across various disciplines. 
        Our academic programs are designed to provide students with a strong foundation in their chosen fields 
        and prepare them for successful careers.
      </Text>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <Box>
          <Heading size="md" mb={4}>Undergraduate Programs</Heading>
          <List spacing={3}>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Bachelor of Science in Computer Science
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Bachelor of Business Administration
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Bachelor of Science in Software Engineering
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Bachelor of Media Sciences
            </ListItem>
          </List>
        </Box>
        <Box>
          <Heading size="md" mb={4}>Graduate Programs</Heading>
          <List spacing={3}>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Master of Science in Computer Science
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Master of Business Administration
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              Master of Project Management
            </ListItem>
            <ListItem>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              PhD in Management Sciences
            </ListItem>
          </List>
        </Box>
      </SimpleGrid>
      <Box mt={8}>
        <Heading size="md" mb={4}>Our Campus</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Image src="https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1186&q=80" alt="SZABIST Library" borderRadius="md" />
          <Image src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" alt="SZABIST Computer Lab" borderRadius="md" />
        </SimpleGrid>
      </Box>
    </Container>
  );
}

export default Academics;