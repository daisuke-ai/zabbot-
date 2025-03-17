import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  SimpleGrid, 
  Card, 
  CardHeader, 
  CardBody, 
  Text, 
  Stack, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Badge, 
  Icon, 
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useDisclosure,
  HStack,
  VStack,
  useToast,
  Progress
} from '@chakra-ui/react';
import { 
  FaUniversity, 
  FaUserTie, 
  FaChalkboardTeacher,
  FaUserGraduate, 
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function HodPortal() {
  const { user } = useAuth();
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [pms, setPMs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [newPM, setNewPM] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [stats, setStats] = useState({
    totalPMs: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { 
    isOpen: isAddPmOpen, 
    onOpen: onAddPmOpen, 
    onClose: onAddPmClose 
  } = useDisclosure();
  
  const toast = useToast();
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('red.50', 'gray.800');
  const borderColor = useColorModeValue('red.500', 'red.400');
  
  useEffect(() => {
    if (user) {
      fetchHodData();
    }
  }, [user]);
  
  const fetchHodData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch department info
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('hod_id', user.id)
        .single();
      
      if (deptError) {
        toast({
          title: 'Error fetching department',
          description: deptError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw deptError;
      }
      
      setDepartmentInfo(deptData);
      
      if (!deptData?.id) {
        const errorMsg = 'No department found for this HOD';
        toast({
          title: 'Department not found',
          description: errorMsg,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        console.error(errorMsg);
        return;
      }
      
      // Fetch PMs in this department
      const { data: pmsData, error: pmsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'pm')
        .eq('department_id', deptData.id);
      
      if (pmsError) {
        toast({
          title: 'Error fetching program managers',
          description: pmsError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw pmsError;
      }
      
      setPMs(pmsData || []);
      
      // Fetch teachers in this department
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .eq('department_id', deptData.id);
      
      if (teachersError) {
        toast({
          title: 'Error fetching teachers',
          description: teachersError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw teachersError;
      }
      
      setTeachers(teachersData || []);
      
      // Fetch students in this department
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .eq('department_id', deptData.id);
        
      if (studentsError) {
        toast({
          title: 'Error fetching students',
          description: studentsError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw studentsError;
      }
      
      setStudents(studentsData || []);
      
      // Fetch classes count in this department
      const { count: classesCount, error: classesError } = await supabase
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', deptData.id);
      
      if (classesError) {
        toast({
          title: 'Error fetching classes count',
          description: classesError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw classesError;
      }
      
      // Set statistics
      setStats({
        totalPMs: pmsData?.length || 0,
        totalTeachers: teachersData?.length || 0,
        totalStudents: studentsData?.length || 0,
        totalClasses: classesCount || 0
      });
      
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast({
        title: 'Error fetching data',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddPM = () => {
    onAddPmOpen();
  };
  
  const handleCreatePM = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!newPM.email || !newPM.password || !newPM.first_name || !newPM.last_name) {
      toast({
        title: 'Missing fields',
        description: 'Please fill all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPM.email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    // Password validation
    if (newPM.password.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters long',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newPM.email,
        password: newPM.password,
        options: {
          data: {
            first_name: newPM.first_name,
            last_name: newPM.last_name,
            role: 'pm'
          }
        }
      });
      
      if (authError) {
        toast({
          title: 'Auth Error',
          description: authError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw authError;
      }
      
      if (!authData?.user?.id) {
        const errMsg = 'User creation failed - no user ID returned';
        toast({
          title: 'User Creation Failed',
          description: errMsg,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw new Error(errMsg);
      }
      
      // Create user profile directly under the department
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: newPM.email,
          first_name: newPM.first_name,
          last_name: newPM.last_name,
          role: 'pm',
          department_id: departmentInfo.id
        });
      
      if (userError) {
        toast({
          title: 'Profile Creation Error',
          description: userError.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw userError;
      }
      
      toast({
        title: 'Program Manager created',
        description: `${newPM.first_name} ${newPM.last_name} has been added to your department`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      
      // Reset form and refresh data
      setNewPM({
        email: '',
        password: '',
        first_name: '',
        last_name: ''
      });
      
      onAddPmClose();
      fetchHodData();
      
    } catch (error) {
      console.error('Error creating PM:', error);
      toast({
        title: 'Error creating Program Manager',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Add function to remove a PM from the department
  const handleRemovePM = async (pmId) => {
    if (!window.confirm("Are you sure you want to remove this Program Manager? This action cannot be undone.")) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Delete the user from the users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', pmId);
      
      if (error) {
        toast({
          title: 'Error removing PM',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        throw error;
      }
      
      toast({
        title: 'PM Removed',
        description: 'Program Manager has been removed from your department',
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      
      fetchHodData();
    } catch (error) {
      console.error('Error removing PM:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Menu items for the sidebar
  const menuItems = [
    { label: 'Department Overview', icon: FaUniversity, path: '/hod-portal' },
    { label: 'Program Managers', icon: FaUserTie, path: '/hod-portal/program-managers' },
    { label: 'Teachers', icon: FaChalkboardTeacher, path: '/hod-portal/teachers' },
    { label: 'Students', icon: FaUserGraduate, path: '/hod-portal/students' },
    { label: 'Classes', icon: FaUsers, path: '/hod-portal/classes' }
  ];
  
  if (isLoading) {
    return (
      <DashboardLayout 
        title={`HOD Dashboard ${departmentInfo ? '- ' + departmentInfo.name : ''}`}
        menuItems={menuItems}
        userRole="HOD"
        roleColor="red"
      >
        <Flex justify="center" align="center" height="50vh" direction="column">
          <Text mb={4}>Loading department data...</Text>
          <Progress size="xs" isIndeterminate width="50%" colorScheme="red" />
        </Flex>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title={`HOD Dashboard ${departmentInfo ? '- ' + departmentInfo.name : ''}`}
      menuItems={menuItems}
      userRole="HOD"
      roleColor="red"
    >
      <Stack spacing={6}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Department</StatLabel>
                <StatNumber>{departmentInfo?.name || 'N/A'}</StatNumber>
                <StatHelpText>Your assigned department</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Program Managers</StatLabel>
                <StatNumber>{stats.totalPMs}</StatNumber>
                <StatHelpText>Active PMs</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Teachers</StatLabel>
                <StatNumber>{stats.totalTeachers}</StatNumber>
                <StatHelpText>Active teachers</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Students</StatLabel>
                <StatNumber>{stats.totalStudents}</StatNumber>
                <StatHelpText>Enrolled students</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Department Members */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Flex align="center" justify="space-between">
              <Heading size="md">
                <Flex align="center">
                  <Icon as={FaUserTie} mr={2} />
                  Department Staff
                </Flex>
              </Heading>
              <Button 
                size="sm" 
                colorScheme="red" 
                leftIcon={<FaUserTie />}
                onClick={handleAddPM}
              >
                Add Program Manager
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="red" isLazy>
              <TabList>
                <Tab>Program Managers</Tab>
                <Tab>Teachers</Tab>
                <Tab>Students</Tab>
              </TabList>
              
              <TabPanels>
                {/* Program Managers Tab */}
                <TabPanel>
                  {pms.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {pms.map((pm) => (
                          <Tr key={pm.id}>
                            <Td>{`${pm.first_name} ${pm.last_name}`}</Td>
                            <Td>{pm.email}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button 
                                  size="xs" 
                                  colorScheme="blue" 
                                  variant="ghost"
                                  leftIcon={<FaEdit />}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  size="xs" 
                                  colorScheme="red" 
                                  variant="ghost"
                                  leftIcon={<FaTrash />}
                                  onClick={() => handleRemovePM(pm.id)}
                                >
                                  Remove
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No Program Managers assigned to this department yet.</Text>
                  )}
                </TabPanel>
                
                {/* Teachers Tab */}
                <TabPanel>
                  {teachers.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {teachers.map((teacher) => (
                          <Tr key={teacher.id}>
                            <Td>{`${teacher.first_name} ${teacher.last_name}`}</Td>
                            <Td>{teacher.email}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button 
                                  size="xs" 
                                  colorScheme="blue" 
                                  variant="ghost"
                                  leftIcon={<FaEye />}
                                >
                                  View
                                </Button>
                                <Button 
                                  size="xs" 
                                  colorScheme="green" 
                                  variant="ghost"
                                  leftIcon={<FaEdit />}
                                >
                                  Edit
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No teachers found in this department.</Text>
                  )}
                </TabPanel>
                
                {/* Students Tab */}
                <TabPanel>
                  {students.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {students.map((student) => (
                          <Tr key={student.id}>
                            <Td>{`${student.first_name} ${student.last_name}`}</Td>
                            <Td>{student.email}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button 
                                  size="xs" 
                                  colorScheme="blue" 
                                  variant="ghost"
                                  leftIcon={<FaEye />}
                                >
                                  View
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No students enrolled in this department yet.</Text>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
        
        {/* Classes List */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Flex align="center" justify="space-between">
              <Heading size="md">
                <Flex align="center">
                  <Icon as={FaUsers} mr={2} />
                  Department Classes
                </Flex>
              </Heading>
              <Button 
                size="sm" 
                colorScheme="red" 
                leftIcon={<FaPlus />}
              >
                Add Class
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="red" isLazy>
              <TabList>
                <Tab>Active Classes</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Text mb={4}>
                    Total Classes: {stats.totalClasses}
                  </Text>
                  
                  {/* Placeholder for classes - in a real implementation, we would fetch and display classes */}
                  <Text>Class management functionality coming soon.</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
      
      {/* Add Program Manager Modal */}
      <Modal isOpen={isAddPmOpen} onClose={onAddPmClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Program Manager</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <form id="add-pm-form" onSubmit={handleCreatePM}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input 
                    value={newPM.first_name}
                    onChange={(e) => setNewPM({...newPM, first_name: e.target.value})}
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input 
                    value={newPM.last_name}
                    onChange={(e) => setNewPM({...newPM, last_name: e.target.value})}
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email"
                    value={newPM.email}
                    onChange={(e) => setNewPM({...newPM, email: e.target.value})}
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input 
                    type="password"
                    value={newPM.password}
                    onChange={(e) => setNewPM({...newPM, password: e.target.value})}
                  />
                </FormControl>
              </VStack>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onAddPmClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="red" 
              type="submit"
              form="add-pm-form"
              isLoading={isSubmitting}
            >
              Create Program Manager
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default HodPortal; 