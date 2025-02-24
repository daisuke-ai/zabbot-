import React, { useState, useEffect } from 'react';
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
import { supabase } from '../services/supabaseService';

function Portal() {
  const cardBg = useColorModeValue('white', 'gray.800');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [portalData, setPortalData] = useState({
    courses: [],
    marks: [],
    attendance: []
  });

  useEffect(() => {
    const loadPortalData = async () => {
      if (user?.role === 'student') {
        const { data: courses } = await supabase
          .from('student_courses')
          .select('courses(*)')
          .eq('student_id', user.id);

        const { data: marks } = await supabase
          .from('student_marks')
          .select('*')
          .eq('student_id', user.id);

        setPortalData({ courses, marks });
      }
      // Add similar blocks for teacher/program_manager
    };
    
    if (user) loadPortalData();
  }, [user]);

  // Update all user references to use actual data
  const userProfile = {
    name: user?.full_name || '',
    email: user?.email || '',
    studentId: user?.roll_number || '',
    program: user?.department || '',
    semester: 'Current Semester', // You'll need to add this field
    cgpa: '3.75' // Calculate from marks
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
                  name={userProfile.name}
                  bg="szabist.500"
                  color="white"
                  cursor="pointer"
                />
              </MenuButton>
              <MenuList color="gray.800">
                <Box px={4} py={2}>
                  <Text fontWeight="bold">{userProfile.name}</Text>
                  <Text fontSize="sm" color="gray.500">{userProfile.email}</Text>
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
                  <Text>{userProfile.studentId}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Program</Text>
                  <Text>{userProfile.program}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">Semester</Text>
                  <Text>{userProfile.semester}</Text>
                </Box>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">CGPA</Text>
                  <Text>{userProfile.cgpa}</Text>
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
                {portalData.courses.map((course, index) => (
                  <Box key={index} p={4} bg="gray.50" borderRadius="md">
                    <Text fontWeight="bold">{course.course_name}</Text>
                    <Text fontSize="sm">{course.course_code} | {course.course_description}</Text>
                  </Box>
                ))}
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

      <Container maxW="container.xl" py={8}>
        <SimpleGrid columns={[1, 2, 3]} spacing={6}>
          {/* Academic Summary */}
          <Box bg={cardBg} p={6} borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={4}>
              <Icon as={FaBook} mr={2} /> Academic Summary
            </Heading>
            <VStack align="stretch">
              <Text>Program: {userProfile.program}</Text>
              <Text>Semester: {userProfile.semester}</Text>
              <Text>CGPA: {userProfile.cgpa}</Text>
            </VStack>
          </Box>

          {/* Course Enrollment */}
          <Box bg={cardBg} p={6} borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={4}>
              <Icon as={FaGraduationCap} mr={2} /> Current Courses
            </Heading>
            <VStack align="stretch">
              {portalData.courses?.map(course => (
                <Text key={course.id}>{course.courses.name}</Text>
              ))}
            </VStack>
          </Box>

          {/* Academic Calendar */}
          <Box bg={cardBg} p={6} borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={4}>
              <Icon as={FaCalendar} mr={2} /> Important Dates
            </Heading>
            <VStack align="stretch">
              <Text>Midterms: Oct 15-20</Text>
              <Text>Final Exams: Dec 10-20</Text>
            </VStack>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default Portal;