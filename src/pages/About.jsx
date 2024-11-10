import React from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Container, 
  Image, 
  SimpleGrid, 
  VStack, 
  Stat,
  StatNumber,
  StatLabel,
  Grid,
  Icon,
  useColorModeValue,
  Flex
} from '@chakra-ui/react';
import { FaGraduationCap, FaUniversity, FaUsers, FaGlobe } from 'react-icons/fa';

function About() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const statBg = useColorModeValue('szabist.50', 'szabist.900');

  return (
    <Box>
      {/* Hero Section */}
      <Box
        bg="szabist.700"
        color="white"
        py={20}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="szabist.800"
          transform="skewY(-6deg)"
          transformOrigin="top left"
        />
        <Container maxW="container.xl" position="relative">
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8} alignItems="center">
            <Box>
              <Heading 
                as="h1" 
                size="3xl" 
                mb={6}
                lineHeight="1.2"
              >
                About SZABIST University
              </Heading>
              <Text fontSize="xl" maxW="600px">
                A premier institution committed to academic excellence and innovation since 1995
              </Text>
            </Box>
            <Box>
              <Image 
                src="https://szabist-isb.edu.pk/wp-content/uploads/2020/05/356A8016-3.jpg" 
                alt="SZABIST Campus" 
                borderRadius="xl"
                boxShadow="2xl"
                objectFit="cover"
                h="400px"
                w="100%"
              />
            </Box>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box py={16}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={8}>
            <Stat bg={statBg} p={8} borderRadius="lg" textAlign="center">
              <Icon as={FaGraduationCap} w={10} h={10} color="szabist.600" mb={4} />
              <StatNumber fontSize="4xl" fontWeight="bold" color="szabist.600">16,500+</StatNumber>
              <StatLabel fontSize="lg">Graduates</StatLabel>
            </Stat>
            <Stat bg={statBg} p={8} borderRadius="lg" textAlign="center">
              <Icon as={FaUsers} w={10} h={10} color="szabist.600" mb={4} />
              <StatNumber fontSize="4xl" fontWeight="bold" color="szabist.600">12,500+</StatNumber>
              <StatLabel fontSize="lg">Current Students</StatLabel>
            </Stat>
            <Stat bg={statBg} p={8} borderRadius="lg" textAlign="center">
              <Icon as={FaUniversity} w={10} h={10} color="szabist.600" mb={4} />
              <StatNumber fontSize="4xl" fontWeight="bold" color="szabist.600">5</StatNumber>
              <StatLabel fontSize="lg">Campuses</StatLabel>
            </Stat>
            <Stat bg={statBg} p={8} borderRadius="lg" textAlign="center">
              <Icon as={FaGlobe} w={10} h={10} color="szabist.600" mb={4} />
              <StatNumber fontSize="4xl" fontWeight="bold" color="szabist.600">50+</StatNumber>
              <StatLabel fontSize="lg">Global Partners</StatLabel>
            </Stat>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Main Content */}
      <Box py={16} bg="gray.50">
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={16}>
            <VStack align="stretch" spacing={6}>
              <Heading as="h2" size="xl" color="szabist.700">
                Our Legacy
              </Heading>
              <Text fontSize="lg" lineHeight="tall">
                Shaheed Zulfikar Ali Bhutto Institute of Science and Technology (SZABIST University) 
                is a fully chartered institute established through a Legislative Act of Sindh Assembly 
                (Sindh Act No. XI of 1995).
              </Text>
              <Text fontSize="lg" lineHeight="tall">
                Approved and recognized by the Higher Education Commission (HEC) of Pakistan, 
                SZABIST has established itself as a premier institution of higher learning in the country.
              </Text>
            </VStack>
            <Box>
              <Image
                src="https://images.unsplash.com/photo-1523580494863-6f3031224c94"
                alt="SZABIST Campus Life"
                borderRadius="xl"
                boxShadow="2xl"
                objectFit="cover"
                h="400px"
                w="100%"
              />
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16}>
        <Container maxW="container.xl">
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Heading size="md" mb={4} color="szabist.700">Academic Excellence</Heading>
              <Text>
                Our programs are designed to meet international standards and are regularly updated 
                to reflect the latest developments in respective fields.
              </Text>
            </Box>
            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Heading size="md" mb={4} color="szabist.700">Research Focus</Heading>
              <Text>
                We maintain a strong emphasis on research and innovation, encouraging both faculty 
                and students to contribute to their fields of study.
              </Text>
            </Box>
            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-8px)', shadow: '2xl' }}
            >
              <Heading size="md" mb={4} color="szabist.700">Global Network</Heading>
              <Text>
                Our partnerships with international universities and organizations provide students 
                with global exposure and opportunities.
              </Text>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* Campus Life Section */}
      <Box py={16} bg="gray.50">
        <Container maxW="container.xl">
          <Heading textAlign="center" mb={12} size="xl" color="szabist.700">
            Campus Life at SZABIST
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            <Image
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1"
              alt="Campus Life 1"
              borderRadius="xl"
              boxShadow="lg"
              objectFit="cover"
              h="300px"
              w="100%"
            />
            <Image
              src="https://images.unsplash.com/photo-1562774053-701939374585"
              alt="Campus Life 2"
              borderRadius="xl"
              boxShadow="lg"
              objectFit="cover"
              h="300px"
              w="100%"
            />
            <Image
              src="https://images.unsplash.com/photo-1523580494863-6f3031224c94"
              alt="Campus Life 3"
              borderRadius="xl"
              boxShadow="lg"
              objectFit="cover"
              h="300px"
              w="100%"
              display={{ base: 'none', lg: 'block' }}
            />
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}

export default About;