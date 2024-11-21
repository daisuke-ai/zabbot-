import React from 'react';
import { Box, Heading, Text, Container, Image, SimpleGrid, Button, VStack, Flex, Stack, Icon, useColorModeValue } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FaGraduationCap, FaBook, FaChartBar, FaUsers, FaRobot, FaArrowRight } from 'react-icons/fa';
import { BsBuilding } from 'react-icons/bs';
import szabistImage from '../public/images/szabist.jpg';

function Home() {
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box>
      {/* Hero Section */}
      <Box
        bgImage={`url(${szabistImage})`}
        bgPosition="center"
        bgRepeat="no-repeat"
        bgSize="cover"
        h="700px"
        position="relative"
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="100%"
          bg="rgba(0,0,0,0.7)"
        />
        <Container maxW="container.xl" h="100%">
          <Flex
            direction="column"
            align="flex-start"
            justify="center"
            h="100%"
            position="relative"
            color="white"
            maxW="800px"
          >
            <Heading 
              as="h1" 
              size="4xl" 
              mb={6}
              lineHeight="1.2"
              fontWeight="bold"
            >
              Welcome to SZABIST University Pakistan
            </Heading>
            <Text fontSize="2xl" mb={8} lineHeight="1.6">
              Empowering Minds, Shaping Futures through Excellence in Education
            </Text>
            <Stack direction={{ base: 'column', md: 'row' }} spacing={5}>
              <Button 
                as={Link} 
                to="/admissions" 
                size="lg" 
                colorScheme="szabist"
                px={8}
                fontSize="lg"
                height="60px"
                _hover={{ transform: 'translateY(-2px)', shadow: 'xl' }}
                transition="all 0.2s"
              >
                Apply Now
              </Button>
            </Stack>
          </Flex>
        </Container>
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

      {/* Featured Services */}
      <Box py={16} bg="gray.50">
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={10}>
            <VStack 
              bg={cardBg}
              p={8}
              borderRadius="xl"
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Icon as={FaRobot} w={12} h={12} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} textAlign="center">AI Assistant</Heading>
              <Text textAlign="center" mb={4}>Get instant answers to your questions about SZABIST</Text>
              <Button 
                as={Link}
                to="/chatbot"
                colorScheme="szabist"
                rightIcon={<FaArrowRight />}
              >
                Chat Now
              </Button>
            </VStack>

            <VStack 
              bg={cardBg}
              p={8}
              borderRadius="xl"
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Icon as={FaGraduationCap} w={12} h={12} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} textAlign="center">Student Portal</Heading>
              <Text textAlign="center" mb={4}>Access your courses, grades, and resources</Text>
              <Button 
                as={Link}
                to="/portal"
                colorScheme="szabist"
                rightIcon={<FaArrowRight />}
              >
                Login
              </Button>
            </VStack>

            <VStack 
              bg={cardBg}
              p={8}
              borderRadius="xl"
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Icon as={FaBook} w={12} h={12} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} textAlign="center">Admissions</Heading>
              <Text textAlign="center" mb={4}>Start your journey with SZABIST</Text>
              <Button 
                as={Link}
                to="/admissions"
                colorScheme="szabist"
                rightIcon={<FaArrowRight />}
              >
                Learn More
              </Button>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Quick Links Section */}
      <Box py={16}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={8}>
            <VStack 
              p={6} 
              borderRadius="lg" 
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
            >
              <Icon as={BsBuilding} w={10} h={10} color="szabist.600" />
              <Text fontWeight="bold">University Life</Text>
            </VStack>
            <VStack 
              p={6} 
              borderRadius="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
            >
              <Icon as={FaGraduationCap} w={10} h={10} color="szabist.600" />
              <Text fontWeight="bold">Academics</Text>
            </VStack>
            <VStack 
              p={6} 
              borderRadius="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
            >
              <Icon as={FaBook} w={10} h={10} color="szabist.600" />
              <Text fontWeight="bold">Library</Text>
            </VStack>
            <VStack 
              p={6} 
              borderRadius="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
            >
              <Icon as={FaChartBar} w={10} h={10} color="szabist.600" />
              <Text fontWeight="bold">IR/QEC</Text>
            </VStack>
            <VStack 
              p={6} 
              borderRadius="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: 'md' }}
            >
              <Icon as={FaUsers} w={10} h={10} color="szabist.600" />
              <Text fontWeight="bold">EDC</Text>
            </VStack>
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}

export default Home;