import React from 'react';
import { 
  Box, 
  Heading, 
  Text, 
  Container, 
  SimpleGrid, 
  VStack, 
  Icon,
  useColorModeValue,
  Button,
  Avatar,
  Flex,
  Spacer,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider
} from '@chakra-ui/react';
import { FaBook, FaGraduationCap, FaCalendar, FaRobot, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import { useAuth } from '../context/AuthContext';

function Portal() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Dummy user data
  const user = {
    name: "Ammar",
    email: "test@szabist.edu.pk",
    studentId: "21108186",
    program: "BS-AI",
    semester: "7th",
    cgpa: "3.75"
  };

  return (
    <Box>
      {/* Hero Section with Profile */}
      <Box bg="szabist.700" color="white" py={12}>
        <Container maxW="container.xl">
          <Flex align="center" mb={6}>
            <Box>
              <Heading size="2xl" mb={4}>SZABIST Educational Portal</Heading>
              <Text fontSize="xl">
                Welcome to your educational portal. Access your courses, grades, and get AI assistance all in one place.
              </Text>
            </Box>
            <Spacer />
            <Menu>
              <MenuButton>
                <Avatar 
                  size="lg" 
                  name={user.name}
                  bg="szabist.500"
                  color="white"
                  cursor="pointer"
                />
              </MenuButton>
              <MenuList color="gray.800">
                <Box px={4} py={2}>
                  <Text fontWeight="bold">{user.name}</Text>
                  <Text fontSize="sm" color="gray.500">{user.email}</Text>
                </Box>
                <Divider />
                <MenuItem icon={<FaUserCircle />}>Profile</MenuItem>
                <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="container.xl" py={12}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          {/* Left Column */}
          <VStack spacing={8} align="stretch">
            {/* Profile Card */}
            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: '2xl' }}
            >
              <Icon as={FaUserCircle} w={10} h={10} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} color="szabist.700">Student Profile</Heading>
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Student ID</Text>
                  <Text>{user.studentId}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Program</Text>
                  <Text>{user.program}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Semester</Text>
                  <Text>{user.semester}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">CGPA</Text>
                  <Text>{user.cgpa}</Text>
                </Box>
              </VStack>
            </Box>

            {/* Rest of the existing content */}
            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: '2xl' }}
            >
              <Icon as={FaGraduationCap} w={10} h={10} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} color="szabist.700">Your Courses</Heading>
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Computer Science</Text>
                  <Text fontSize="sm">CS-401 | Advanced Programming</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Database Systems</Text>
                  <Text fontSize="sm">CS-402 | Data Management</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Software Engineering</Text>
                  <Text fontSize="sm">CS-403 | System Design</Text>
                </Box>
              </VStack>
              <Button colorScheme="szabist" mt={6} size="sm">View All Courses</Button>
            </Box>

            <Box 
              bg={cardBg} 
              p={8} 
              borderRadius="xl" 
              boxShadow="lg"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-4px)', shadow: '2xl' }}
            >
              <Icon as={FaCalendar} w={10} h={10} color="szabist.600" mb={4} />
              <Heading size="md" mb={4} color="szabist.700">Upcoming Events</Heading>
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Mid-Term Examinations</Text>
                  <Text fontSize="sm">Starting from next week</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Project Submissions</Text>
                  <Text fontSize="sm">Due in 2 weeks</Text>
                </Box>
              </VStack>
            </Box>
          </VStack>

          {/* Right Column - Chatbot */}
          <Box 
            bg={cardBg} 
            p={8} 
            borderRadius="xl" 
            boxShadow="lg"
            height="fit-content"
          >
            <Icon as={FaRobot} w={10} h={10} color="szabist.600" mb={4} />
            <Heading size="md" mb={4} color="szabist.700">ZABBOT Assistant</Heading>
            <Text mb={4}>Get instant help with your queries about courses, schedules, and university policies.</Text>
            <Chatbot />
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default Portal;