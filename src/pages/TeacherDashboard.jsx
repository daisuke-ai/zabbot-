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
  Textarea,
  Select,
  useDisclosure,
  HStack
} from '@chakra-ui/react';
import { 
  FaChalkboardTeacher, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaUsers, 
  FaChartLine,
  FaPlus,
  FaEdit,
  FaEye
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    assignmentsCreated: 0,
    avgAttendance: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [students, setStudents] = useState([]);
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('red.50', 'gray.800');
  const borderColor = useColorModeValue('green.500', 'green.400');

  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
  }, [user]);
  
  const fetchTeacherData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch classes taught by this teacher
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id);
      
      setClasses(classesData || []);

      // Fetch students in these classes
      const { data: studentsData, error: studentsError } = await supabase
        .from('enrollments')
        .select('student:student_id (*)')
        .in('class_id', classesData.map(c => c.id));
      
      setStudents(studentsData?.map(s => s.student) || []);
      
      // Calculate statistics
      const totalStudents = studentsData?.length || 0;
      
      setStats({
        totalClasses: classesData.length,
        totalStudents,
        assignmentsCreated: Math.floor(Math.random() * 30), // Demo data
        avgAttendance: Math.floor(75 + Math.random() * 25) // Demo data
      });
      
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewClass = (classData) => {
    setSelectedClass(classData);
    onOpen();
  };
  
  const handleUpdateGrades = async (studentId, classId, grade) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ grade })
        .eq('student_id', studentId)
        .eq('class_id', classId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating grade:', error);
    }
  };
  
  // Menu items for the sidebar
  const menuItems = [
    { label: 'My Classes', icon: FaChalkboardTeacher, path: '/teacher-dashboard' },
    { label: 'Schedule', icon: FaCalendarAlt, path: '/teacher-dashboard/schedule' },
    { label: 'Assignments', icon: FaClipboardList, path: '/teacher-dashboard/assignments' },
    { label: 'Students', icon: FaUsers, path: '/teacher-dashboard/students' },
    { label: 'Reports', icon: FaChartLine, path: '/teacher-dashboard/reports' }
  ];

  return (
    <DashboardLayout 
      title="Teacher Dashboard" 
      menuItems={menuItems}
      userRole="teacher"
      roleColor="green"
    >
      <Stack spacing={6}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Teaching</StatLabel>
                <StatNumber>{stats.totalClasses}</StatNumber>
                <StatHelpText>Active classes</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Students</StatLabel>
                <StatNumber>{stats.totalStudents}</StatNumber>
                <StatHelpText>Across all classes</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Assignments</StatLabel>
                <StatNumber>{stats.assignmentsCreated}</StatNumber>
                <StatHelpText>Created this semester</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Avg. Attendance</StatLabel>
                <StatNumber>{stats.avgAttendance}%</StatNumber>
                <StatHelpText>For all classes</StatHelpText>
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
                  My Classes
                </Flex>
              </Heading>
              <Button 
                size="sm" 
                colorScheme="green" 
                leftIcon={<FaPlus />}
              >
                Add Class
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="green" isLazy>
              <TabList>
                <Tab>Current Semester</Tab>
                <Tab>All Classes</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  {classes.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Class Name</Th>
                          <Th>Department</Th>
                          <Th>Program</Th>
                          <Th>Students</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {classes.map((cls) => (
                          <Tr key={cls.id}>
                            <Td>{cls.name}</Td>
                            <Td>{cls.programs.departments.name}</Td>
                            <Td>{cls.programs.name}</Td>
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
                    <Text>No classes assigned for the current semester.</Text>
                  )}
                </TabPanel>
                
                <TabPanel>
                  <Text>Historical class data will be displayed here.</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
        
        {/* Recent Activities */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Heading size="md">
              <Flex align="center">
                <Icon as={FaClipboardList} mr={2} />
                Recent Activities
              </Flex>
            </Heading>
          </CardHeader>
          <CardBody>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Activity</Th>
                  <Th>Class</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>New Assignment Created</Td>
                  <Td>Database Management</Td>
                  <Td>Today</Td>
                  <Td><Badge colorScheme="green">Active</Badge></Td>
                </Tr>
                <Tr>
                  <Td>Attendance Taken</Td>
                  <Td>Mobile App Development</Td>
                  <Td>Yesterday</Td>
                  <Td><Badge colorScheme="blue">Completed</Badge></Td>
                </Tr>
                <Tr>
                  <Td>Assignment Graded</Td>
                  <Td>Software Engineering</Td>
                  <Td>3 days ago</Td>
                  <Td><Badge colorScheme="purple">Published</Badge></Td>
                </Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Stack>
      
      {/* Class Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
                <Text><strong>Department:</strong> {selectedClass?.programs.departments.name}</Text>
                <Text><strong>Program:</strong> {selectedClass?.programs.name}</Text>
                <Text><strong>Total Students:</strong> {selectedClass?.studentCount}</Text>
              </Box>
              
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
                    {selectedClass?.enrollments.map((enrollment) => (
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
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" mr={3}>
              Take Attendance
            </Button>
            <Button colorScheme="blue" mr={3}>
              Create Assignment
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default TeacherDashboard; 