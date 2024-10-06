import React from 'react';
import { Box, Heading, Text, Container, Image, SimpleGrid, Button, VStack, Flex, Stack, Icon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaBook, FaChartBar, FaUsers } from 'react-icons/fa';
import { BsBuilding } from 'react-icons/bs';
import Chatbot from '../components/Chatbot';

function Home() {
  return (
    <Box>
      <Box
        bgImage="url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1186&q=80')"
        bgPosition="center"
        bgRepeat="no-repeat"
        bgSize="cover"
        h="600px"
        position="relative"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          bg="rgba(0,0,0,0.6)"
        />
        <Flex
          direction="column"
          align="center"
          justify="center"
          h="100%"
          position="relative"
          color="white"
          textAlign="center"
        >
          <Heading as="h1" size="3xl" mb={4}>
            Welcome to SZABIST Pakistan
          </Heading>
          <Text fontSize="xl" mb={8}>
            Empowering Minds, Shaping Futures
          </Text>
          <Button as={Link} to="/admissions" colorScheme="szabist" size="lg">
            Apply Now
          </Button>
        </Flex>
      </Box>

      <Container maxW="container.xl" py={16}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={16}>
          <Box>
            <Heading as="h2" size="xl" mb={6}>
              About SZABIST
            </Heading>
            <Text fontSize="lg" mb={6}>
              Shaheed Zulfikar Ali Bhutto Institute of Science and Technology (SZABIST) is a fully Chartered Institute
              established through a Legislative Act of Sindh Assembly. SZABIST is approved and recognized by the Higher
              Education Commission (HEC) of Pakistan as a degree awarding institution.
            </Text>
            <Button as={Link} to="/about" colorScheme="szabist">
              Learn More
            </Button>
          </Box>
          <Image
            src="https://szabist-isb.edu.pk/wp-content/uploads/2020/05/356A8016-3.jpg"
            alt="SZABIST Campus"
            borderRadius="md"
            boxShadow="lg"
          />
        </SimpleGrid>
      </Container>

      <Box bg="szabist.50" py={16}>
        <Container maxW="container.xl">
          <Heading as="h2" size="xl" mb={12} textAlign="center">
            Explore SZABIST
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={8}>
            <VStack>
              <Icon as={BsBuilding} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">University Life</Text>
            </VStack>
            <VStack>
              <Icon as={FaGraduationCap} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">Academics</Text>
            </VStack>
            <VStack>
              <Icon as={FaBook} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">Library</Text>
            </VStack>
            <VStack>
              <Icon as={FaChartBar} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">IR/QEC</Text>
            </VStack>
            <VStack>
              <Icon as={FaUsers} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">EDC</Text>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      <Container maxW="container.xl" py={16}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={16}>
          <Box>
            <Heading as="h2" size="xl" mb={6}>
              Admissions Open
            </Heading>
            <Text fontSize="lg" mb={6}>
              Join SZABIST and embark on a journey of academic excellence and personal growth. We welcome applications
              from motivated individuals who are ready to challenge themselves and make a positive impact on society.
            </Text>
            <Button as={Link} to="/admissions" colorScheme="szabist">
              Apply Now
            </Button>
          </Box>
          <Box bg="szabist.100" p={8} borderRadius="md" boxShadow="lg">
            <Heading as="h3" size="lg" mb={4}>
              Have a question?
            </Heading>
            <Text mb={4}>Ask our University Chatbot for quick answers.</Text>
            <Chatbot />
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default Home;