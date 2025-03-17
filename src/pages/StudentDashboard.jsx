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
  Flex
} from '@chakra-ui/react';
import { 
  FaBook, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaUserGraduate, 
  FaChartLine, 
  FaDownload,
  FaInfoCircle 
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function StudentDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    completedAssignments: 0,
    upcomingAssignments: 0,
    attendanceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('red.50', 'gray.800');
  const borderColor = useColorModeValue('red.500', 'red.400');
  
  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);
  
  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch student enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          classes (
            id,
            name,
            teacher_id,
            users:teacher_id (first_name, last_name),
            programs:program_id (
              id,
              name,
              departments:department_id (name)
            )
          )
        `)
        .eq('student_id', user.id);
      
      if (enrollmentsError) throw enrollmentsError;
      
      setEnrollments(enrollmentsData || []);
      
      // Set some demo stats (in a real app, these would come from the database)
      setStats({
        totalClasses: enrollmentsData?.length || 0,
        completedAssignments: Math.floor(Math.random() * 20),
        upcomingAssignments: Math.floor(Math.random() * 10),
        attendanceRate: Math.floor(75 + Math.random() * 25)
      });
      
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Menu items for the sidebar
  const menuItems = [
    { label: 'My Courses', icon: FaBook, path: '/student-dashboard' },
    { label: 'Schedule', icon: FaCalendarAlt, path: '/student-dashboard/schedule' },
    { label: 'Assignments', icon: FaClipboardList, path: '/student-dashboard/assignments' },
    { label: 'Progress', icon: FaChartLine, path: '/student-dashboard/progress' }
  ];
  
  return (
    <DashboardLayout 
      title="Student Dashboard" 
      menuItems={menuItems}
      userRole="student"
      roleColor="purple"
    >
      <Stack spacing={6}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Enrolled Courses</StatLabel>
                <StatNumber>{stats.totalClasses}</StatNumber>
                <StatHelpText>Active this semester</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Completed Assignments</StatLabel>
                <StatNumber>{stats.completedAssignments}</StatNumber>
                <StatHelpText>This semester</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Pending Assignments</StatLabel>
                <StatNumber>{stats.upcomingAssignments}</StatNumber>
                <StatHelpText>Due this week</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Attendance Rate</StatLabel>
                <StatNumber>{stats.attendanceRate}%</StatNumber>
                <StatHelpText>Overall attendance</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Course List */}
        <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
          <CardHeader bg={headerBg} py={3}>
            <Heading size="md">
              <Flex align="center">
                <Icon as={FaBook} mr={2} />
                My Courses
              </Flex>
            </Heading>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="red" isLazy>
              <TabList>
                <Tab>Current Semester</Tab>
                <Tab>All Courses</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  {enrollments.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Course Name</Th>
                          <Th>Department</Th>
                          <Th>Teacher</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {enrollments.map((enrollment) => (
                          <Tr key={enrollment.id}>
                            <Td>{enrollment.classes.name}</Td>
                            <Td>{enrollment.classes.programs.departments.name}</Td>
                            <Td>
                              {enrollment.classes.users ? 
                                `${enrollment.classes.users.first_name} ${enrollment.classes.users.last_name}` : 
                                'Not assigned'}
                            </Td>
                            <Td>
                              <Button 
                                size="xs" 
                                colorScheme="blue" 
                                variant="ghost"
                                leftIcon={<FaInfoCircle />}
                              >
                                Details
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No courses enrolled for the current semester.</Text>
                  )}
                </TabPanel>
                
                <TabPanel>
                  <Text>Historical course data will be displayed here.</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
        
        {/* Recent Activity */}
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
                  <Th>Course</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Assignment Submission</Td>
                  <Td>Database Management</Td>
                  <Td>2 days ago</Td>
                  <Td><Badge colorScheme="green">Completed</Badge></Td>
                </Tr>
                <Tr>
                  <Td>Quiz Attempt</Td>
                  <Td>Mobile App Development</Td>
                  <Td>5 days ago</Td>
                  <Td><Badge colorScheme="green">Passed</Badge></Td>
                </Tr>
                <Tr>
                  <Td>Assignment Upload</Td>
                  <Td>Software Engineering</Td>
                  <Td>1 week ago</Td>
                  <Td><Badge colorScheme="yellow">Pending Review</Badge></Td>
                </Tr>
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}

export default StudentDashboard; 