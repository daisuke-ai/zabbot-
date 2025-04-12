import React, { useState, useEffect, useRef } from 'react';
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
  Progress,
  Container,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { 
  FaUserTie, 
  FaChalkboardTeacher, 
  FaUserGraduate, 
  FaCalendarAlt, 
  FaClipboardList,
  FaPlus,
  FaEdit,
  FaEye,
  FaSignOutAlt,
  FaCheck,
  FaTimes,
  FaBell,
  FaListAlt,
  FaUserCheck
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';

function ProgramManagerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  
  const { 
    isOpen, 
    onOpen, 
    onClose 
  } = useDisclosure();
  
  const toast = useToast();
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('red.50', 'gray.800');
  const borderColor = useColorModeValue('blue.500', 'blue.400');
  
  const cancelRef = useRef();
  
  useEffect(() => {
    const fetchPmData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch PM's department info
        const { data: pmData, error: pmError } = await supabase
          .from('users')
          .select('department_name')
          .eq('id', user.id)  // Changed from user_id to id
          .single();

        if (pmError || !pmData) {
          throw new Error(pmError?.message || 'PM data not found');
        }

        // Fetch department details
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('*')
          .eq('name', pmData.department_name)
          .single();

        if (deptError || !deptData) {
          throw new Error(deptError?.message || 'Department not found');
        }
        setDepartmentInfo(deptData);

        // Fetch teachers in department
        const { data: teachersData, error: teachersError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'teacher')
          .eq('department_name', pmData.department_name);

        if (teachersError) throw teachersError;
        setTeachers(teachersData || []);

        // Fetch students in department
        const { data: studentsData, error: studentsError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'student')
          .eq('department_name', pmData.department_name);

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

      } catch (error) {
        console.error('Error fetching PM data:', error);
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPmData();
    }
  }, [user, toast]);
  
  useEffect(() => {
    const fetchPendingUsers = async () => {
      setIsLoading(true);
      try {
        // Fetch ONLY pending STUDENT users
        const { data: users, error: usersError } = await supabase
          .from('users')
            .select('*')
          .eq('active', false)
          .eq('role', 'student');
          
        if (usersError) throw usersError;
        setPendingUsers(users || []);
        
        // Fetch activity log notifications
        const { data: logs, error: logError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (logError) throw logError;
        setActivityLog(logs || []);
        
      } catch (error) {
        console.error('Error fetching pending users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pending user approvals',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPendingUsers();
    
    // Real-time subscription for new PENDING STUDENT users
    const usersSubscription = supabase
      .channel('public:users:pending_students')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'users', 
          filter: 'active=eq.false&role=eq.student'
        },
        (payload) => {
          console.log('New pending STUDENT user received!', payload.new);
          setPendingUsers(prev => [payload.new, ...prev]);
          toast({
            title: 'New Student Signup Request',
            description: `${payload.new.first_name} ${payload.new.last_name} requires approval.`,
            status: 'info',
            duration: 7000,
            isClosable: true,
          });
        }
      )
      .subscribe((status, err) => {
         if (err) console.error("Student User Subscription Error:", err);
         else console.log("Student User Subscription Status:", status);
      });
      
    // Real-time subscription for activity log (notifications table)
    const activityLogSubscription = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          console.log('New activity log entry received!', payload.new);
          setActivityLog(prev => [payload.new, ...prev]);
        }
      )
       .subscribe((status, err) => {
         if (err) console.error("Notification Subscription Error:", err);
         else console.log("Notification Subscription Status:", status);
      });
    
    return () => {
      supabase.removeChannel(usersSubscription);
      supabase.removeChannel(activityLogSubscription);
    };
  }, [toast]);
  
  const handleViewClass = (cls) => {
    setSelectedClass(cls);
    onOpen();
  };
  
  const handleAddClass = () => {
    setNewClass({
      name: '',
      teacher_id: '',
      description: ''
    });
    onOpen();
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
      
      onClose();
      fetchPmData();
      
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
  
  const handleCreateTeacher = async (teacherData) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...teacherData,
          role: 'teacher',
          department_name: user.department_name
        }]);
      
      if (error) throw error;
      fetchPmData(); // Refresh data
    } catch (error) {
      console.error('Error creating teacher:', error);
    }
  };
  
  const openActionDialog = (user, action) => {
    setSelectedUser(user);
    setActionType(action);
    onOpen();
  };

  const handleUserAction = async () => {
    if (!selectedUser || !actionType) return;
    
    setIsActionLoading(true);
    let notificationMessage = '';
    let toastStatus = 'info';
    let toastTitle = 'Action Completed';

    try {
      if (actionType === 'approve') {
        // Update user to active
        const { error: updateError } = await supabase
          .from('users')
          .update({ active: true })
          .eq('id', selectedUser.id);
        if (updateError) throw updateError;

        notificationMessage = `Approved signup for ${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.email}).`;
        toastStatus = 'success';
        toastTitle = 'User Approved';
        
      } else if (actionType === 'reject') {
        // Delete the user record entirely upon rejection
        // Note: This assumes rejection means deleting the request.
        // If you need to keep rejected users marked differently, adjust the logic.
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', selectedUser.id);
        if (deleteError) throw deleteError;

        notificationMessage = `Rejected signup for ${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.email}).`;
        toastStatus = 'warning';
        toastTitle = 'User Rejected';
      }

       // Add entry to activity log (notifications table) regardless of action
       const { error: logError } = await supabase
          .from('notifications')
          .insert({
            notification: notificationMessage,
            // Consider adding PM's user_id here if needed for audit
            // pm_id: user.id 
          });
        // Log error but don't throw, as main action succeeded
        if (logError) console.error("Error logging action:", logError);

      toast({
        title: toastTitle,
        description: notificationMessage,
        status: toastStatus,
        duration: 5000,
        isClosable: true,
      });
        
      // Update the local state: Remove user from pending list
      setPendingUsers(currentPendingUsers => 
        currentPendingUsers.filter(u => u.id !== selectedUser.id)
      );

    } catch (error) {
      console.error('Error processing user action:', error);
      toast({
        title: 'Action Error',
        description: error.message || 'Failed to process the request.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsActionLoading(false);
      onClose(); // Close the dialog
      setSelectedUser(null); // Reset selected user
      setActionType(null); // Reset action type
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 3000,
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
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
      <Box textAlign="center" mt={10}>
        <Spinner size="xl" />
      </Box>
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
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Add Class Modal */}
      <Modal isOpen={isOpen} onClose={()=>setIsOpen(false)}>
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
            <Button mr={3} onClick={()=>setIsOpen(false)}>
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

      {/* Updated Tabs */}
      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          {/* Tab 1: Student Approvals */}
          <Tab fontWeight="semibold">
            <Flex align="center">
              <FaUserGraduate style={{ marginRight: '8px' }} />
              Student Approvals
              {pendingUsers.length > 0 && (
                <Badge ml={2} colorScheme="red" borderRadius="full" px={2}>
                  {pendingUsers.length}
                </Badge>
              )}
            </Flex>
          </Tab>
          {/* Tab 2: Activity Log */}
          <Tab fontWeight="semibold">
             <Flex align="center">
               <FaListAlt style={{ marginRight: '8px' }} />
               Activity Log
             </Flex>
          </Tab>
          {/* Add other PM-specific tabs here if needed */}
        </TabList>
        
        <TabPanels>
          {/* Panel 1: Student Approvals Content */}
          <TabPanel>
            <Card>
              <CardHeader>
                <Heading size="md">Pending Student Signup Requests</Heading>
              </CardHeader>
              <CardBody>
                {isLoading ? (
                  <Flex justify="center" py={10}>
                    <Spinner size="xl" />
                  </Flex>
                ) : pendingUsers.length === 0 ? (
                  <Text>No pending student signups require approval.</Text>
                ) : (
                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Role</Th>
                          <Th>Department</Th>
                          <Th>Signup Date</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {pendingUsers.map(studentUser => (
                          <Tr key={studentUser.id}>
                            <Td>{studentUser.first_name} {studentUser.last_name}</Td>
                            <Td>{studentUser.email}</Td>
                            <Td>
                              <Badge colorScheme='green'>
                                {studentUser.role}
                              </Badge>
                            </Td>
                            <Td>{studentUser.department_name || 'N/A'}</Td>
                            <Td>{new Date(studentUser.created_at).toLocaleDateString()}</Td>
                            <Td>
                              <Flex gap={2}>
                                <Button
                                  size="xs" 
                                  colorScheme="green"
                                  leftIcon={<FaCheck />}
                                  onClick={() => openActionDialog(studentUser, 'approve')}
                                  isLoading={isActionLoading && selectedUser?.id === studentUser.id && actionType === 'approve'}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="xs" 
                                  colorScheme="red"
                                  leftIcon={<FaTimes />}
                                  onClick={() => openActionDialog(studentUser, 'reject')}
                                  isLoading={isActionLoading && selectedUser?.id === studentUser.id && actionType === 'reject'}
                                >
                                  Reject
                                </Button>
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
    </Box>
                )}
              </CardBody>
            </Card>
          </TabPanel>
          
          {/* Panel 2: Activity Log Content */}
          <TabPanel>
            <Card>
              <CardHeader>
                <Heading size="md">Recent Activity Log</Heading>
              </CardHeader>
              <CardBody>
                {isLoading ? (
                  <Flex justify="center" py={10}>
                    <Spinner size="xl" />
                  </Flex>
                ) : activityLog.length === 0 ? (
                  <Text>No recent activity recorded.</Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {activityLog.map(logEntry => (
                      <Card key={logEntry.id} size="sm" variant="outline" bg={useColorModeValue('gray.50', 'gray.700')}>
                        <CardBody>
                          <Flex justify="space-between" align="center" wrap="wrap">
                            <Text fontSize="sm">{logEntry.notification}</Text>
                            <Text fontSize="xs" color="gray.500" whiteSpace="nowrap" ml={2}>
                              {new Date(logEntry.created_at).toLocaleString()}
                            </Text>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </CardBody>
            </Card>
          </TabPanel>

           {/* Add other TabPanels corresponding to other tabs */}

        </TabPanels>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </AlertDialogHeader>

            <AlertDialogBody>
              {actionType === 'approve' 
                ? `Are you sure you want to approve the signup request for ${selectedUser?.first_name} ${selectedUser?.last_name}?`
                : `Are you sure you want to reject the signup request for ${selectedUser?.first_name} ${selectedUser?.last_name}? This will delete their request.`
              }
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isActionLoading}>
                Cancel
              </Button>
              <Button 
                colorScheme={actionType === 'approve' ? 'green' : 'red'} 
                onClick={handleUserAction} 
                ml={3}
                isLoading={isActionLoading}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default ProgramManagerDashboard; 