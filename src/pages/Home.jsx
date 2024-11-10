import React from 'react';
import { Box, Heading, Text, Container, Image, SimpleGrid, Button, VStack, Flex, Stack, Icon } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaBook, FaChartBar, FaUsers, FaRobot } from 'react-icons/fa';
import { BsBuilding } from 'react-icons/bs';

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
            Welcome to SZABIST University Pakistan
          </Heading>
          <Text fontSize="xl" mb={8}>
            Empowering Minds, Shaping Futures
          </Text>
          <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
            <Button as={Link} to="/admissions" colorScheme="szabist" size="lg">
              Apply Now
            </Button>
            <Button 
              as={Link} 
              to="/chatbot" 
              colorScheme="white" 
              variant="outline" 
              size="lg"
              _hover={{ bg: 'whiteAlpha.200' }}
            >
              Try Our AI Assistant
            </Button>
          </Stack>
        </Flex>
      </Box>

      <Container maxW="container.xl" py={16}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={16}>
          <Box>
            <Heading as="h2" size="xl" mb={6}>
              About SZABIST University
            </Heading>
            <Text fontSize="lg" mb={6}>
              Shaheed Zulfikar Ali Bhutto Institute of Science and Technology (SZABIST UNIVERSITY) is a fully Chartered Institute
              established through a Legislative Act of Sindh Assembly. SZABIST UNIVERSITY is approved and recognized by the Higher
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
            Explore SZABIST University
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 6 }} spacing={8}>
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
            <VStack as={Link} to="/chatbot" _hover={{ transform: 'scale(1.05)', transition: '0.2s' }}>
              <Icon as={FaRobot} w={12} h={12} color="szabist.600" />
              <Text fontWeight="bold">AI Assistant</Text>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      <Container maxW="container.xl" py={16}>
        <Box 
          bg="szabist.700" 
          p={12} 
          borderRadius="xl" 
          color="white"
          textAlign="center"
        >
          <Heading size="xl" mb={6}>
            Meet Our AI Assistant
          </Heading>
          <Text fontSize="lg" mb={8}>
            Get instant answers to your questions about SZABIST University, admissions, programs, and more.
          </Text>
          <Button 
            as={Link} 
            to="/chatbot" 
            size="lg" 
            colorScheme="white" 
            variant="outline"
            _hover={{ bg: 'whiteAlpha.200' }}
          >
            Chat Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default Home;