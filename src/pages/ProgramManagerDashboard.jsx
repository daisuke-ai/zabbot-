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
  FaUserTie, 
  FaChalkboardTeacher, 
  FaUserGraduate, 
  FaCalendarAlt, 
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaEye
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function ProgramManagerDashboard() {
  const { user } = useAuth();
  const [programInfo, setProgramInfo] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClass, setNewClass] = useState({
    name: '',
    teacher_id: '',
    description: ''
  });
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalTeachers: 0,
    totalStudents: 0,
    activeEnrollments: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    isOpen: isViewOpen, 
    onOpen: onViewOpen, 
    onClose: onViewClose 
  } = useDisclosure();
  
  const { 
    isOpen: isAddOpen, 
    onOpen: onAddOpen, 
    onClose: onAddClose 
  } = useDisclosure();
  
  const toast = useToast();
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('red.50', 'gray.800');
  const borderColor = useColorModeValue('blue.500', 'blue.400');
  
  useEffect(() => {
    if (user) {
      fetchPMData();
    }
  }, [user]);
  
  const fetchPMData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch program info
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          departments:department_id (id, name)
        `)
        .eq('pm_id', user.id)
        .single();
      
      if (programError) throw programError;
      setProgramInfo(programData);
      
      if (!programData?.id) {
        console.error('No program found for this Program Manager');
        return;
      }
      
      // Fetch classes in this program
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          teacher_id,
          teacher:users!classes_teacher_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          enrollments (
            id,
            student:student_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('program_id', programData.id);
      
      if (classesError) throw classesError;
      
      // Process classes to count students per class
      const processedClasses = classesData?.map(cls => ({
        ...cls,
        studentCount: cls.enrollments.length
      })) || [];
      
      setClasses(processedClasses);
      
      // Fetch teachers assigned to this program's department
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .eq('department_id', programData.departments.id);
      
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);
      
      // Collect students from all enrollments
      const allStudents = new Set();
      let totalEnrollments = 0;
      
      processedClasses.forEach(cls => {
        cls.enrollments.forEach(enrollment => {
          allStudents.add(enrollment.student.id);
          totalEnrollments++;
        });
      });
      
      // Set statistics
      setStats({
        totalClasses: processedClasses.length,
        totalTeachers: teachersData?.length || 0,
        totalStudents: allStudents.size,
        activeEnrollments: totalEnrollments
      });
      
    } catch (error) {
      console.error('Error fetching PM data:', error);
      toast({
        title: 'Error fetching data',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewClass = (cls) => {
    setSelectedClass(cls);
    onViewOpen();
  };
  
  const handleAddClass = () => {
    setNewClass({
      name: '',
      teacher_id: '',
      description: ''
    });
    onAddOpen();
  };
  
  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!newClass.name) {
      toast({
        title: 'Missing fields',
        description: 'Please provide a class name',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          program_id: programInfo.id,
          teacher_id: newClass.teacher_id || null,
          description: newClass.description || null
        })
        .select();
      
      if (error) throw error;
      
      toast({
        title: 'Class created',
        description: `${newClass.name} has been created successfully`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      
      onAddClose();
      fetchPMData();
      
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error creating class',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };
  
  // Menu items for the sidebar
  const menuItems = [
    { label: 'Program Overview', icon: FaUserTie, path: '/pm-dashboard' },
    { label: 'Classes', icon: FaChalkboardTeacher, path: '/pm-dashboard/classes' },
    { label: 'Teachers', icon: FaChalkboardTeacher, path: '/pm-dashboard/teachers' },
    { label: 'Students', icon: FaUserGraduate, path: '/pm-dashboard/students' },
    { label: 'Schedule', icon: FaCalendarAlt, path: '/pm-dashboard/schedule' }
  ];
  
  if (isLoading) {
    return (
      <DashboardLayout 
        title={`PM Dashboard ${programInfo ? '- ' + programInfo.name : ''}`}
        menuItems={menuItems}
        userRole="Program Manager"
        roleColor="blue"
      >
        <Flex justify="center" align="center" height="50vh" direction="column">
          <Text mb={4}>Loading program data...</Text>
          <Progress size="xs" isIndeterminate width="50%" colorScheme="blue" />
        </Flex>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout 
      title={`PM Dashboard ${programInfo ? '- ' + programInfo.name : ''}`}
      menuItems={menuItems}
      userRole="Program Manager"
      roleColor="blue"
    >
      <Stack spacing={6}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Classes</StatLabel>
                <StatNumber>{stats.totalClasses}</StatNumber>
                <StatHelpText>In your program</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Teachers</StatLabel>
                <StatNumber>{stats.totalTeachers}</StatNumber>
                <StatHelpText>Available in department</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Students</StatLabel>
                <StatNumber>{stats.totalStudents}</StatNumber>
                <StatHelpText>Enrolled in program</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Enrollments</StatLabel>
                <StatNumber>{stats.activeEnrollments}</StatNumber>
                <StatHelpText>Active enrollments</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Class List */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Flex align="center" justify="space-between">
              <Heading size="md">
                <Flex align="center">
                  <Icon as={FaChalkboardTeacher} mr={2} />
                  Classes in {programInfo?.name}
                </Flex>
              </Heading>
              <Button 
                size="sm" 
                colorScheme="blue" 
                leftIcon={<FaPlus />}
                onClick={handleAddClass}
              >
                Add Class
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="blue" isLazy>
              <TabList>
                <Tab>All Classes</Tab>
                <Tab>Unassigned Classes</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  {classes.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Class Name</Th>
                          <Th>Teacher</Th>
                          <Th>Students</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {classes.map((cls) => (
                          <Tr key={cls.id}>
                            <Td>{cls.name}</Td>
                            <Td>
                              {cls.teacher ? 
                                `${cls.teacher.first_name} ${cls.teacher.last_name}` : 
                                <Badge colorScheme="yellow">Unassigned</Badge>}
                            </Td>
                            <Td>{cls.studentCount}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button 
                                  size="xs" 
                                  colorScheme="blue" 
                                  variant="ghost"
                                  leftIcon={<FaEye />}
                                  onClick={() => handleViewClass(cls)}
                                >
                                  View
                                </Button>
                                <Button 
                                  size="xs" 
                                  colorScheme="blue" 
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
                    <Text>No classes found in your program.</Text>
                  )}
                </TabPanel>
                
                <TabPanel>
                  {classes.filter(cls => !cls.teacher).length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Class Name</Th>
                          <Th>Students</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {classes.filter(cls => !cls.teacher).map((cls) => (
                          <Tr key={cls.id}>
                            <Td>{cls.name}</Td>
                            <Td>{cls.studentCount}</Td>
                            <Td>
                              <Button 
                                size="xs" 
                                colorScheme="green" 
                                variant="ghost"
                                leftIcon={<FaChalkboardTeacher />}
                              >
                                Assign Teacher
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>All classes have teachers assigned.</Text>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
        
        {/* Available Teachers */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Heading size="md">
              <Flex align="center">
                <Icon as={FaChalkboardTeacher} mr={2} />
                Available Teachers
              </Flex>
            </Heading>
          </CardHeader>
          <CardBody>
            {teachers.length > 0 ? (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Classes</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {teachers.map((teacher) => (
                    <Tr key={teacher.id}>
                      <Td>{`${teacher.first_name} ${teacher.last_name}`}</Td>
                      <Td>{teacher.email}</Td>
                      <Td>
                        {classes.filter(cls => cls.teacher_id === teacher.id).length}
                      </Td>
                      <Td>
                        <Button 
                          size="xs" 
                          colorScheme="blue" 
                          variant="ghost"
                          leftIcon={<FaEye />}
                        >
                          View Classes
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            ) : (
              <Text>No teachers available in your department.</Text>
            )}
          </CardBody>
        </Card>
      </Stack>
      
      {/* Class Details Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedClass?.name} - Class Details
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Box>
                <Heading size="sm" mb={2}>Class Information</Heading>
                <Text><strong>Program:</strong> {programInfo?.name}</Text>
                <Text>
                  <strong>Teacher:</strong> {
                    selectedClass?.teacher ? 
                      `${selectedClass.teacher.first_name} ${selectedClass.teacher.last_name}` : 
                      'Unassigned'
                  }
                </Text>
                <Text><strong>Total Students:</strong> {selectedClass?.studentCount || 0}</Text>
              </Box>
              
              {selectedClass?.enrollments?.length > 0 && (
                <Box>
                  <Heading size="sm" mb={2}>Enrolled Students</Heading>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Email</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {selectedClass.enrollments.map((enrollment) => (
                        <Tr key={enrollment.id}>
                          <Td>{`${enrollment.student.first_name} ${enrollment.student.last_name}`}</Td>
                          <Td>{enrollment.student.email}</Td>
                          <Td>
                            <Button size="xs" colorScheme="blue" variant="ghost">
                              View Profile
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onViewClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Add Class Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Class</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <form id="add-class-form" onSubmit={handleCreateClass}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Class Name</FormLabel>
                  <Input 
                    value={newClass.name}
                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    placeholder="Enter class name"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Assign Teacher</FormLabel>
                  <Select 
                    placeholder="Select teacher (optional)"
                    value={newClass.teacher_id}
                    onChange={(e) => setNewClass({...newClass, teacher_id: e.target.value})}
                  >
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input 
                    value={newClass.description}
                    onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                    placeholder="Enter class description (optional)"
                  />
                </FormControl>
              </VStack>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              type="submit"
              form="add-class-form"
            >
              Create Class
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default ProgramManagerDashboard; 