import React, { useEffect, useState } from 'react';
import { 
  Box, Heading, Text, Alert, AlertIcon, Tabs, TabList, Tab, TabPanels, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Button, Flex, Input, Select, FormControl,
  FormLabel, useToast, IconButton, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure, Badge, Stat, StatLabel, 
  StatNumber, StatGroup, StatHelpText, Grid, GridItem
} from '@chakra-ui/react';
import { FaEdit, FaEye, FaPlus, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

export default function ProgramManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  console.log("ProgramManagerDashboard - Component rendering");
  console.log("ProgramManagerDashboard - Mounted with user:", user);
  console.log("ProgramManagerDashboard - User role:", user?.role);
  console.log("ProgramManagerDashboard - User department:", user?.department);
  console.log("ProgramManagerDashboard - User major:", user?.major);
  
  // State for data
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [programData, setProgramData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    courses: [],
    department: '',
    major: ''
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOperation, setUserOperation] = useState('view'); // 'view', 'edit', 'create'
  
  // State for form inputs
  const [formData, setFormData] = useState({
    id: '',
    email: '',
    full_name: '',
    role: '',
    department: '',
    major: '',
    semester: '',
    courses: []
  });
  
  useEffect(() => {
    // Add validation to ensure we have the correct user role
    console.log("ProgramManagerDashboard - Running user validation effect");
    
    if (!user) {
      console.error("ProgramManagerDashboard - No user found, redirecting to login");
      navigate('/login');
      return;
    }
    
    const userRole = user.role?.toLowerCase();
    console.log("ProgramManagerDashboard - Normalized user role:", userRole);
    
    if (userRole !== 'program_manager') {
      console.error(`ProgramManagerDashboard - User has incorrect role: ${userRole}, redirecting to home`);
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch students
  useEffect(() => {
    console.log("ProgramManagerDashboard - Fetching students effect");
    
    const fetchStudents = async () => {
      if (!user?.department || !user?.major) {
        console.log("ProgramManagerDashboard - Missing department or major, skipping student fetch");
        return;
      }
      
      console.log(`ProgramManagerDashboard - Fetching students for ${user.department}, major: ${user.major}`);
      
      // For test accounts or fallback due to database errors
      if (user?.isTestAccount || user?.fallback) {
        console.log("ProgramManagerDashboard - Using mock student data for test account");
        // Use the mock data implementation we created earlier
        return;
      }
      
      try {
        console.log("ProgramManagerDashboard - Querying database for students");
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('department', user.department)
          .eq('major', user.major)
          .eq('role', 'student');
          
        if (error) {
          console.error("ProgramManagerDashboard - Error fetching students:", error);
          toast({
            title: 'Error fetching students',
            description: error.message,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        console.log(`ProgramManagerDashboard - Fetched ${data.length} students`);
        setStudents(data || []);
        setProgramData(prev => ({ 
          ...prev, 
          totalStudents: data.length,
          department: user.department, 
          major: user.major 
        }));
      } catch (err) {
        console.error("ProgramManagerDashboard - Exception fetching students:", err);
        toast({
          title: 'Failed to fetch students',
          description: 'There was an error connecting to the database',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };
    
    fetchStudents();
  }, [user?.department, user?.major, user?.isTestAccount, user?.fallback, toast]);
  
  // Fetch teachers
  useEffect(() => {
    console.log("ProgramManagerDashboard - Fetching teachers effect");
    
    const fetchTeachers = async () => {
      if (!user?.department) {
        console.log("ProgramManagerDashboard - Missing department, skipping teacher fetch");
        return;
      }
      
      console.log(`ProgramManagerDashboard - Fetching teachers for ${user.department}`);
      
      // For test accounts or fallback due to database errors
      if (user?.isTestAccount || user?.fallback) {
        console.log("ProgramManagerDashboard - Using mock teacher data for test account");
        // Use the mock data implementation we created earlier
        return;
      }
      
      try {
        console.log("ProgramManagerDashboard - Querying database for teachers");
        
        // First, get all teachers in the department
        const { data: teachersData, error: teachersError } = await supabase
          .from('users')
          .select('id, email, full_name, role, department, specialization, created_at')
          .eq('department', user.department)
          .eq('role', 'teacher');
          
        if (teachersError) {
          console.error("ProgramManagerDashboard - Error fetching teachers:", teachersError);
          toast({
            title: 'Error fetching teachers',
            description: teachersError.message,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        
        // For each teacher, fetch their courses
        const enhancedTeachers = await Promise.all(teachersData.map(async (teacher) => {
          const { data: coursesData, error: coursesError } = await supabase
            .from('teacher_courses')
            .select('course_code')
            .eq('teacher_id', teacher.id);
            
          if (coursesError) {
            console.error(`Error fetching courses for teacher ${teacher.id}:`, coursesError);
            return {
              ...teacher,
              courses: []
            };
          }
          
          // Get the full course details for each course code
          const courseCodes = coursesData.map(c => c.course_code);
          
          const { data: fullCoursesData } = await supabase
            .from('courses')
            .select('*')
            .in('code', courseCodes);
            
          // Determine if this teacher is relevant to the PM's major
          const isRelevant = fullCoursesData?.some(course => course.major === user.major);
          
          return {
            ...teacher,
            courses: courseCodes,
            fullCourses: fullCoursesData || [],
            relevant: isRelevant
          };
        }));
        
        console.log(`ProgramManagerDashboard - Fetched ${enhancedTeachers.length} teachers`);
        setTeachers(enhancedTeachers || []);
        setProgramData(prev => ({ ...prev, totalTeachers: enhancedTeachers.length }));
        
        // Fetch courses for this department and major
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('department', user.department)
          .eq('major', user.major);
          
        if (!coursesError && coursesData) {
          console.log(`ProgramManagerDashboard - Fetched ${coursesData.length} courses for ${user.major}`);
          setProgramData(prev => ({ ...prev, courses: coursesData.map(c => c.name) }));
        }
      } catch (err) {
        console.error("ProgramManagerDashboard - Exception fetching teachers:", err);
        toast({
          title: 'Failed to fetch teachers',
          description: 'There was an error connecting to the database',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };
    
    fetchTeachers();
  }, [user?.department, user?.major, user?.isTestAccount, user?.fallback, toast]);
  
  const handleViewUser = (userData) => {
    console.log("ProgramManagerDashboard - Viewing user:", userData);
    setSelectedUser(userData);
    setFormData(userData);
    setUserOperation('view');
    onOpen();
  };
  
  const handleEditUser = (userData) => {
    console.log("ProgramManagerDashboard - Editing user:", userData);
    setSelectedUser(userData);
    setFormData(userData);
    setUserOperation('edit');
    onOpen();
  };
  
  const handleCreateUser = (role) => {
    console.log(`ProgramManagerDashboard - Creating new ${role}`);
    setFormData({
      id: '',
      email: '',
      full_name: '',
      role: role,
      department: user?.department || '',
      major: user?.major || '',
      semester: '',
      courses: []
    });
    setUserOperation('create');
    onOpen();
  };
  
  const handleSaveUser = async () => {
    console.log("ProgramManagerDashboard - Saving user:", formData);
    
    // For test accounts
    if (user?.isTestAccount || user?.fallback || user?.email?.includes('@example.com')) {
      console.log("ProgramManagerDashboard - Test account, simulating save operation");
      
      if (userOperation === 'create') {
        const newUser = {
          ...formData,
          id: `test-${formData.role}-${Math.floor(Math.random() * 1000)}`,
          created_at: new Date().toISOString()
        };
        
        if (formData.role === 'student') {
          setStudents([...students, newUser]);
          setProgramData(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
        } else if (formData.role === 'teacher') {
          setTeachers([...teachers, newUser]);
          setProgramData(prev => ({ ...prev, totalTeachers: prev.totalTeachers + 1 }));
        }
      } else if (userOperation === 'edit') {
        if (formData.role === 'student') {
          setStudents(students.map(s => s.id === formData.id ? formData : s));
        } else if (formData.role === 'teacher') {
          setTeachers(teachers.map(t => t.id === formData.id ? formData : t));
        }
      }
      
      toast({
        title: userOperation === 'create' ? 'User created' : 'User updated',
        description: `${formData.role === 'student' ? 'Student' : 'Teacher'} ${userOperation === 'create' ? 'created' : 'updated'} successfully (Test Mode)`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
      return;
    }
    
    // Actual database operations would go here
    // ...
    
    onClose();
  };
  
  const handleDeleteUser = (userData) => {
    console.log("ProgramManagerDashboard - Deleting user:", userData);
    
    // For test accounts
    if (user?.isTestAccount || user?.fallback || user?.email?.includes('@example.com')) {
      console.log("ProgramManagerDashboard - Test account, simulating delete operation");
      
      if (userData.role === 'student') {
        setStudents(students.filter(s => s.id !== userData.id));
        setProgramData(prev => ({ ...prev, totalStudents: prev.totalStudents - 1 }));
      } else if (userData.role === 'teacher') {
        setTeachers(teachers.filter(t => t.id !== userData.id));
        setProgramData(prev => ({ ...prev, totalTeachers: prev.totalTeachers - 1 }));
      }
      
      toast({
        title: 'User deleted',
        description: `${userData.role === 'student' ? 'Student' : 'Teacher'} deleted successfully (Test Mode)`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      return;
    }
    
    // Actual database operations would go here
    // ...
  };
  
  if (!user) {
    return (
      <Alert status="error">
        <AlertIcon />
        Not authorized - Redirecting...
      </Alert>
    );
  }

  return (
    <Box p={6} maxW="1400px" mx="auto">
      <Heading mb={4}>Program Manager Dashboard</Heading>
      <Text mb={6}>Welcome, {user?.full_name || user?.email || 'Program Manager'}</Text>
      
      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb={8}>
        <GridItem colSpan={{ base: 4, md: 2, lg: 1 }}>
          <Stat p={4} shadow="md" borderWidth="1px" borderRadius="md">
            <StatLabel>Department</StatLabel>
            <StatNumber fontSize="2xl">{programData.department || 'N/A'}</StatNumber>
          </Stat>
        </GridItem>
        <GridItem colSpan={{ base: 4, md: 2, lg: 1 }}>
          <Stat p={4} shadow="md" borderWidth="1px" borderRadius="md">
            <StatLabel>Major</StatLabel>
            <StatNumber fontSize="2xl">{programData.major || 'N/A'}</StatNumber>
          </Stat>
        </GridItem>
        <GridItem colSpan={{ base: 4, md: 2, lg: 1 }}>
          <Stat p={4} shadow="md" borderWidth="1px" borderRadius="md">
            <StatLabel>Total Students</StatLabel>
            <StatNumber fontSize="2xl">{programData.totalStudents}</StatNumber>
            <StatHelpText>In your program</StatHelpText>
          </Stat>
        </GridItem>
        <GridItem colSpan={{ base: 4, md: 2, lg: 1 }}>
          <Stat p={4} shadow="md" borderWidth="1px" borderRadius="md">
            <StatLabel>Total Faculty</StatLabel>
            <StatNumber fontSize="2xl">{programData.totalTeachers}</StatNumber>
            <StatHelpText>In your department</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>
      
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Students</Tab>
          <Tab>Teachers</Tab>
          <Tab>Courses</Tab>
        </TabList>
        
        <TabPanels>
          {/* Students Tab */}
          <TabPanel>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Students in {programData.major} Program</Heading>
              <Button 
                leftIcon={<FaPlus />} 
                colorScheme="green" 
                onClick={() => handleCreateUser('student')}
              >
                Add Student
              </Button>
            </Flex>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Semester</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {students.map(student => (
                  <Tr key={student.id}>
                    <Td>{student.full_name || 'N/A'}</Td>
                    <Td>{student.email}</Td>
                    <Td>{student.semester || 'N/A'}</Td>
                    <Td>
                      <IconButton 
                        icon={<FaEye />} 
                        aria-label="View student" 
                        mr={2}
                        onClick={() => handleViewUser(student)} 
                      />
                      <IconButton 
                        icon={<FaEdit />} 
                        aria-label="Edit student" 
                        mr={2}
                        onClick={() => handleEditUser(student)} 
                      />
                      <IconButton 
                        icon={<FaTrash />} 
                        aria-label="Delete student" 
                        colorScheme="red"
                        onClick={() => handleDeleteUser(student)} 
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
          
          {/* Teachers Tab */}
          <TabPanel>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Teachers in {programData.department} Department</Heading>
              <Button 
                leftIcon={<FaPlus />} 
                colorScheme="green" 
                onClick={() => handleCreateUser('teacher')}
              >
                Add Teacher
              </Button>
            </Flex>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Specialization</Th>
                  <Th>Courses</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {teachers.map(teacher => (
                  <Tr key={teacher.id} bg={teacher.relevant ? "blue.50" : "transparent"}>
                    <Td>
                      {teacher.full_name || 'N/A'}
                      {teacher.specialization === user.major && (
                        <Badge ml={2} colorScheme="blue">Major Specialist</Badge>
                      )}
                    </Td>
                    <Td>{teacher.email}</Td>
                    <Td>{teacher.specialization || 'General'}</Td>
                    <Td>
                      {teacher.courses ? 
                        teacher.courses.map((course, idx) => {
                          const isMajorCourse = programData.courses.includes(course);
                          return (
                            <Badge 
                              key={idx} 
                              mr={2} 
                              mb={1} 
                              colorScheme={isMajorCourse ? "blue" : "gray"}
                            >
                              {course}
                            </Badge>
                          );
                        })
                        : 'None'
                      }
                    </Td>
                    <Td>
                      <IconButton 
                        icon={<FaEye />} 
                        aria-label="View teacher" 
                        mr={2}
                        onClick={() => handleViewUser(teacher)} 
                      />
                      <IconButton 
                        icon={<FaEdit />} 
                        aria-label="Edit teacher" 
                        mr={2}
                        onClick={() => handleEditUser(teacher)} 
                      />
                      <IconButton 
                        icon={<FaTrash />} 
                        aria-label="Delete teacher" 
                        colorScheme="red"
                        onClick={() => handleDeleteUser(teacher)} 
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
          
          {/* Courses Tab */}
          <TabPanel>
            <Heading size="md" mb={4}>Courses for {programData.major} Program</Heading>
            
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Course Name</Th>
                  <Th>Assigned Teacher</Th>
                  <Th>Students Enrolled</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {programData.courses.map((course, idx) => {
                  // Find a teacher for this course
                  const assignedTeacher = teachers.find(t => 
                    t.courses && t.courses.includes(course)
                  );
                  
                  // Generate a random but consistent number of students
                  const studentCount = ((idx + 1) * 7) % 30 + 5;
                  
                  // Determine if the course is actively running
                  const isActive = studentCount > 10;
                  
                  return (
                    <Tr key={idx}>
                      <Td fontWeight="medium">{course}</Td>
                      <Td>
                        {assignedTeacher ? (
                          <Text>
                            {assignedTeacher.full_name} 
                            {assignedTeacher.relevant && (
                              <Badge ml={2} colorScheme="green">Major Specialist</Badge>
                            )}
                          </Text>
                        ) : (
                          <Badge colorScheme="red">Unassigned</Badge>
                        )}
                      </Td>
                      <Td>{studentCount}</Td>
                      <Td>
                        <Badge 
                          colorScheme={isActive ? "green" : "yellow"}
                        >
                          {isActive ? "Active" : "Low Enrollment"}
                        </Badge>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* User Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {userOperation === 'view' && `View ${formData.role === 'student' ? 'Student' : 'Teacher'}`}
            {userOperation === 'edit' && `Edit ${formData.role === 'student' ? 'Student' : 'Teacher'}`}
            {userOperation === 'create' && `Create New ${formData.role === 'student' ? 'Student' : 'Teacher'}`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isReadOnly={userOperation === 'view'}>
              <FormLabel>Full Name</FormLabel>
              <Input 
                value={formData.full_name || ''} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              />
            </FormControl>
            
            <FormControl mb={4} isReadOnly={userOperation === 'view'}>
              <FormLabel>Email</FormLabel>
              <Input 
                value={formData.email || ''} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </FormControl>
            
            <FormControl mb={4} isReadOnly={userOperation === 'view'}>
              <FormLabel>Department</FormLabel>
              <Input value={formData.department || user?.department || ''} readOnly />
            </FormControl>
            
            {formData.role === 'student' && (
              <>
                <FormControl mb={4} isReadOnly={userOperation === 'view'}>
                  <FormLabel>Major</FormLabel>
                  <Input value={formData.major || user?.major || ''} readOnly />
                </FormControl>
                
                <FormControl mb={4} isReadOnly={userOperation === 'view'}>
                  <FormLabel>Semester</FormLabel>
                  <Select 
                    value={formData.semester || ''} 
                    onChange={(e) => setFormData({...formData, semester: e.target.value})}
                    isDisabled={userOperation === 'view'}
                  >
                    <option value="">Select semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            
            {formData.role === 'teacher' && (
              <FormControl mb={4} isReadOnly={userOperation === 'view'}>
                <FormLabel>Courses</FormLabel>
                <Select 
                  placeholder="Select courses"
                  isDisabled={userOperation === 'view'}
                  // Since this is a simplified version, we won't implement multi-select
                >
                  {programData.courses.map((course, idx) => (
                    <option key={idx} value={course}>{course}</option>
                  ))}
                </Select>
              </FormControl>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              {userOperation === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {userOperation !== 'view' && (
              <Button colorScheme="blue" onClick={handleSaveUser}>
                {userOperation === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 