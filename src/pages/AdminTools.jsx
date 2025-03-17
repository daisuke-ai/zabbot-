import React from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  VStack, 
  Button, 
  Text,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Divider,
  HStack,
  Badge,
  Link,
  Icon,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaUser, FaUsers, FaUserGraduate, FaUserTie, FaTools, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function AdminTools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.700');
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={8}>
        <Box>
          <Heading mb={2}>Admin Tools</Heading>
          <Text color="gray.600">Development and administration tools</Text>
        </Box>
        <HStack>
          <Text>Logged in as: <Badge colorScheme="purple">{user?.email}</Badge></Text>
          <Button 
            leftIcon={<Icon as={FaSignOutAlt} />} 
            colorScheme="red" 
            variant="outline" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </HStack>
      </HStack>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Account Management</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch">
              <Button 
                as={RouterLink} 
                to="/account-fixer" 
                colorScheme="blue" 
                leftIcon={<Icon as={FaTools} />}
              >
                Account Fixer Tool
              </Button>
              <Button 
                as={RouterLink} 
                to="/portal" 
                colorScheme="teal" 
                leftIcon={<Icon as={FaUser} />}
              >
                Login Portal
              </Button>
            </VStack>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} shadow="md">
          <CardHeader>
            <Heading size="md">Development Tools</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch">
              <Button 
                as="a" 
                href="https://supabase.com" 
                target="_blank" 
                colorScheme="green" 
                leftIcon={<Icon as={FaTools} />}
              >
                Supabase Dashboard
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>
      
      <Heading size="md" mb={4}>User Portals</Heading>
      <Divider mb={6} />
      
      <Table variant="simple" mb={8}>
        <Thead>
          <Tr>
            <Th>Portal</Th>
            <Th>Role</Th>
            <Th>Description</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>HOD Portal</Td>
            <Td><Badge colorScheme="red">HOD</Badge></Td>
            <Td>Department management, program oversight</Td>
            <Td>
              <Button as={RouterLink} to="/hod-portal" size="sm" colorScheme="blue">
                Access
              </Button>
            </Td>
          </Tr>
          <Tr>
            <Td>Program Manager Dashboard</Td>
            <Td><Badge colorScheme="orange">Program Manager</Badge></Td>
            <Td>Program management, class scheduling</Td>
            <Td>
              <Button as={RouterLink} to="/pm-dashboard" size="sm" colorScheme="blue">
                Access
              </Button>
            </Td>
          </Tr>
          <Tr>
            <Td>Teacher Dashboard</Td>
            <Td><Badge colorScheme="green">Teacher</Badge></Td>
            <Td>Class management, student grading</Td>
            <Td>
              <Button as={RouterLink} to="/teacher-dashboard" size="sm" colorScheme="blue">
                Access
              </Button>
            </Td>
          </Tr>
          <Tr>
            <Td>Student Dashboard</Td>
            <Td><Badge colorScheme="blue">Student</Badge></Td>
            <Td>Course enrollment, grades view</Td>
            <Td>
              <Button as={RouterLink} to="/student-dashboard" size="sm" colorScheme="blue">
                Access
              </Button>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      
      <Heading size="md" mb={4}>Test Accounts</Heading>
      <Divider mb={6} />
      
      <Text mb={4}>
        The following test accounts can be used with password: <Badge>Password123!</Badge>
      </Text>
      
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Access</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>admin@example.com</Td>
            <Td><Badge colorScheme="purple">Admin</Badge></Td>
            <Td>All portals and tools</Td>
          </Tr>
          <Tr>
            <Td>de_hod@example.com</Td>
            <Td><Badge colorScheme="red">HOD</Badge></Td>
            <Td>HOD Portal</Td>
          </Tr>
          <Tr>
            <Td>cs_hod@example.com</Td>
            <Td><Badge colorScheme="red">HOD</Badge></Td>
            <Td>HOD Portal</Td>
          </Tr>
          <Tr>
            <Td>cs_pm@example.com</Td>
            <Td><Badge colorScheme="orange">Program Manager</Badge></Td>
            <Td>PM Dashboard</Td>
          </Tr>
          <Tr>
            <Td>teacher1@example.com</Td>
            <Td><Badge colorScheme="green">Teacher</Badge></Td>
            <Td>Teacher Dashboard</Td>
          </Tr>
          <Tr>
            <Td>student1@example.com</Td>
            <Td><Badge colorScheme="blue">Student</Badge></Td>
            <Td>Student Dashboard</Td>
          </Tr>
        </Tbody>
      </Table>
    </Container>
  );
}

export default AdminTools; 