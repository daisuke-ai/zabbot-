import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AlertDialogOverlay,
  InputGroup,
  InputRightElement,
  Link,
  List,
  ListItem,
  ListIcon
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
  FaUserCheck,
  FaUserPlus,
  FaEyeSlash,
  FaExternalLinkAlt
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';

// --- Academic Calendar Data (Same as HOD Portal) ---
const academicCalendarData = {
  title: "Academic Calendar (Spring - 2025)",
  duration: "February 2025 – June 2025",
  semesterDates: "Start: Feb 10, 2025 | End: July 6, 2025",
  exams: [ { type: "Midterm Exam", week: "8th", dates: "March 24 – March 30, 2025" }, { type: "Final Exam", week: "16th–17th", dates: "May 19 – June 1, 2025" }, ],
  importantDates: [ { event: "Teaching Evaluation (1st)", dates: "March 10 – March 23, 2025" }, { event: "Course Withdrawal Deadline", dates: "April 27, 2025 (11th Week)" }, { event: "Teaching Evaluation (2nd)", dates: "April 28 – May 4, 2025" }, { event: "ZABDESK Closing", dates: "June 25, 2025" }, { event: "Change of Grade Deadline", dates: "June 30, 2025" }, { event: "Probation & Dismissal List", dates: "June 30, 2025" }, ],
  holidays: [ { occasion: "Pakistan Day", dates: "March 23, 2025" }, { occasion: "Eid ul-Fitr", dates: "March 30 – April 1, 2025" }, { occasion: "Labor Day", dates: "May 1, 2025" }, { occasion: "Eid al-Adha", dates: "June 7 – 9, 2025" }, ],
  dissertationDeadlines: [ { activity: "Proposal Submission", week: "1st Week" }, { activity: "Midterm Review", week: "8th Week" }, { activity: "Plagiarism Checking", week: "12th Week (May 4, 2025)" }, { activity: "Final Submission", week: "13th Week (May 7, 2025)" }, { activity: "Final Defence (IRS, Thesis, RP, etc.)", week: "16th–17th Week (June 2–8, 2025)" }, { activity: "MS Thesis Defence", week: "16th–17th Week (June 2–8, 2025)" }, { activity: "PhD Presentation", week: "17th Week (June 2–8, 2025)" }, ],
  registrationDates: [ { activity: "Open Zabdesk Interface (PM/HoD)", date: "January 6, 2025" }, { activity: "Course Offering Completion by PM/HoD", date: "January 16, 2025" }, { activity: "Timetable Release", date: "January 18, 2025" }, { activity: "Course Registration (Online)", date: "February 1–16, 2025" }, { activity: "Manual Registration (with fine)", date: "February 17–18, 2025" }, ]
};
// --- End Academic Calendar Data ---

function ProgramManagerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pmDepartmentName, setPmDepartmentName] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  
  const { 
    isOpen: isApprovalDialogOpen, 
    onOpen: onApprovalDialogOpen, 
    onClose: onApprovalDialogClose 
  } = useDisclosure();
  
  const { 
    isOpen: isAddTeacherModalOpen, 
    onOpen: onAddTeacherModalOpen, 
    onClose: onAddTeacherModalClose 
  } = useDisclosure();
  
  const { 
    isOpen: isAddClassModalOpen, 
    onOpen: onAddClassModalOpen, 
    onClose: onAddClassModalClose 
  } = useDisclosure();
  
  const { isOpen: isCalendarOpen, onOpen: onCalendarOpen, onClose: onCalendarClose } = useDisclosure();
  
  const toast = useToast();
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('blue.500', 'blue.400');
  
  const cancelRef = useRef();
  
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [newClass, setNewClass] = useState({ name: '', description: '', teacher_id: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedUserForAction, setSelectedUserForAction] = useState(null);
  const [actionType, setActionType] = useState(null);
  
  useEffect(() => {
    const fetchPmData = async () => {
      if (!user?.id) { setIsLoading(false); return; }
      setIsLoading(true);
      try {
        // Fetch PM Department
        const { data: pmData, error: pmError } = await supabase.from('users').select('department_name').eq('id', user.id).single();
        if (pmError || !pmData?.department_name) throw new Error(pmError?.message || 'PM department not found.');
        const departmentName = pmData.department_name; setPmDepartmentName(departmentName);

        // Fetch Teachers in Dept
        const { data: teachersData, error: teachersError } = await supabase.from('users').select('id, first_name, last_name, email, created_at').eq('role', 'teacher').eq('department_name', departmentName).order('created_at', { ascending: false });
        if (teachersError) throw teachersError; setTeachers(teachersData || []);

        // Fetch Students in Dept
        const { data: studentsData, error: studentsError } = await supabase.from('users').select('id, first_name, last_name, email, created_at, active').eq('role', 'student').eq('department_name', departmentName).order('created_at', { ascending: false });
        if (studentsError) throw studentsError; setStudents(studentsData || []);

        // Fetch Pending Student Approvals (Global)
        const { data: pending, error: pendingError } = await supabase.from('users').select('*').eq('active', false).eq('role', 'student').order('created_at', { ascending: false });
        if (pendingError) throw pendingError; setPendingUsers(pending || []);

        // Fetch Activity Log (Global)
        const { data: logs, error: logError } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
        if (logError) throw logError; setActivityLog(logs || []);

        // TODO: Fetch actual Classes for the 'Classes' tab if needed
        // const { data: classData, error: classError } = await supabase.from('classes')...

      } catch (error) {
        console.error('Error fetching PM dashboard data:', error);
        toast({ title: 'Error Loading Data', description: error.message, status: 'error'});
        setPmDepartmentName(''); setTeachers([]); setStudents([]); setPendingUsers([]); setActivityLog([]); // Reset states
      } finally { setIsLoading(false); }
    };
    fetchPmData();

    // Cleanup function for potential subscriptions (if added later)
    return () => {};
  }, [user, toast]);
  
  const handleCreateTeacher = async (e) => {
    e.preventDefault();

    // --- 1. Validation (Similar to HOD Portal) ---
    if (!newTeacher.firstName || !newTeacher.lastName || !newTeacher.email || !newTeacher.password) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', status: 'warning', duration: 3000 }); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email regex
    if (!emailRegex.test(newTeacher.email)) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email.', status: 'error', duration: 3000 }); return;
    }
    if (newTeacher.password.length < 6) {
      toast({ title: 'Weak Password', description: 'Password must be at least 6 characters.', status: 'warning', duration: 3000 }); return;
    }
    if (!pmDepartmentName) { // Ensure PM's department is known
      toast({ title: 'Error', description: 'Cannot identify Program Manager Department.', status: 'error', duration: 5000 }); return;
    }

    // --- 2. Set Loading State ---
    setIsCreatingTeacher(true);
    console.log("[handleCreateTeacher] Attempting creation...");

    try {
        // --- 3. Create user in Supabase Auth ---
        console.log("[handleCreateTeacher] Calling supabase.auth.signUp for:", newTeacher.email);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newTeacher.email.trim(),
            password: newTeacher.password,
            options: {
                data: { // Metadata stored in auth.users table (raw_user_meta_data)
                    first_name: newTeacher.firstName.trim(),
                    last_name: newTeacher.lastName.trim(),
                    role: "teacher", // Set the role in metadata
                },
            },
        });

        // --- 4. Handle Auth Error ---
        if (authError) {
            console.error("[handleCreateTeacher] Auth Error:", authError);
            toast({ title: "Auth Error", description: authError.message, status: "error", duration: 5000 });
            throw authError; // Stop execution if auth fails
        }

        // --- 5. Check for User ID from Auth ---
        if (!authData?.user?.id) {
            const errMsg = "Auth creation succeeded but no user ID returned.";
            console.error("[handleCreateTeacher]", errMsg, authData);
            toast({ title: "User Creation Failed", description: errMsg, status: "error", duration: 5000 });
            throw new Error(errMsg); // Stop execution
        }

        const createdAuthUserId = authData.user.id;
        console.log(`[handleCreateTeacher] Auth user created: ${createdAuthUserId}`);

        // --- 6. Create user profile in public.users table ---
        const profileData = {
            user_id: createdAuthUserId, // Link using the ID from auth step
            email: newTeacher.email.trim(), // Ensure email consistency
            first_name: newTeacher.firstName.trim(),
            last_name: newTeacher.lastName.trim(),
            role: "teacher", // Set role in the users table
            department_name: pmDepartmentName, // Assign PM's department
            active: true // Teachers created by PM are active
        };
        console.log("[handleCreateTeacher] Inserting profile into public.users:", profileData);

        const { data: userProfileData, error: userProfileError } = await supabase
            .from("users")
            .insert(profileData);

        // --- 7. Handle Profile Insert Error ---
        if (userProfileError) {
            console.error("[handleCreateTeacher] Profile Insert Error:", userProfileError);
            toast({ title: "Profile Creation Error", description: userProfileError.message, status: "error", duration: 5000 });
            // NOTE: Unlike previous attempts, we are NOT trying to delete the auth user here,
            // mirroring the HOD portal's simpler approach. Manual cleanup might be needed if this step fails.
            throw userProfileError; // Stop execution
        }

        // --- 8. Success ---
        console.log("[handleCreateTeacher] Teacher profile created successfully.");
        toast({
            title: "Teacher Created",
            description: `${newTeacher.firstName} ${newTeacher.lastName} added to ${pmDepartmentName}.`,
            status: "success",
            duration: 5000,
        });

        // --- 9. Reset Form, Close Modal, Refresh Data ---
        setNewTeacher({ firstName: "", lastName: "", email: "", password: "" }); // Reset form
        onAddTeacherModalClose(); // Close the specific modal
        fetchPmData(); // Refetch all necessary dashboard data

    } catch (error) {
        // Catch errors from any step above
        console.error("Error during handleCreateTeacher:", error);
        // Toast is likely already shown for specific errors, but a general one can be added if needed.
        // toast({ title: "Failed to Create Teacher", description: error.message, status: "error", duration: 5000 });
    } finally {
        // --- 10. ALWAYS Reset Loading State ---
        console.log("[handleCreateTeacher] Operation finished, resetting loading state.");
        setIsCreatingTeacher(false); // Ensure loading is turned off
    }
  };
  
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name) { toast({ title: 'Class Name Required', status: 'warning' }); return; }
    if (!pmDepartmentName) { toast({ title: 'Error', description: 'Department context missing.', status: 'error' }); return; }
    setIsCreatingClass(true);
    try {
      console.log("Attempting to create class:", { ...newClass, department_name: pmDepartmentName });
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      toast({ title: 'Class Created (Not Implemented)', description: 'Backend logic needed.', status: 'info' });
      onAddClassModalClose();
      setNewClass({ name: '', description: '', teacher_id: '' });
    } catch (error) { toast({ title: 'Class Creation Failed', description: error.message, status: 'error' }); }
    finally { setIsCreatingClass(false); }
  };

  const openActionDialog = (userToAction, action) => {
    setSelectedUserForAction(userToAction);
    setActionType(action);
    onApprovalDialogOpen();
  };

  const handleUserAction = async () => {
    if (!selectedUserForAction || !actionType) return;
    setIsActionLoading(true);
    let notificationMessage = '';
    let toastStatus = 'info';
    let toastTitle = 'Action Completed';
    try {
      if (actionType === 'approve') {
        const { error } = await supabase.from('users').update({ active: true }).eq('id', selectedUserForAction.id);
        if (error) throw error;
        notificationMessage = `Approved ${selectedUserForAction.first_name}.`;
        toastStatus = 'success';
        toastTitle = 'User Approved';
      } else if (actionType === 'reject') {
        const { error } = await supabase.from('users').delete().eq('id', selectedUserForAction.id);
        if (error) throw error;
        notificationMessage = `Rejected ${selectedUserForAction.first_name}.`;
        toastStatus = 'warning';
        toastTitle = 'User Rejected';
      }
      await supabase.from('notifications').insert({ notification: notificationMessage });
      toast({ title: toastTitle, description: notificationMessage, status: toastStatus });
      setPendingUsers(prev => prev.filter(u => u.id !== selectedUserForAction.id));
    } catch (error) { toast({ title: 'Action Error', description: error.message, status: 'error' }); }
    finally {
      setIsActionLoading(false);
      onApprovalDialogClose();
      setSelectedUserForAction(null);
      setActionType(null);
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
    { label: 'Dashboard', icon: FaUserTie, path: '/pm-dashboard' },
  ];
  
  // --- Calculate Stats ---
  const calculatedStats = useMemo(() => ({
    totalTeachers: teachers.length,
    totalStudents: students.length,
    pendingApprovals: pendingUsers.length,
  }), [teachers, students, pendingUsers]);
  
  if (isLoading) {
    return (
      <Box textAlign="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <DashboardLayout 
      title={`PM Dashboard (${pmDepartmentName || 'No Department'})`}
      menuItems={menuItems}
      userRole="Program Manager"
      roleColor="blue"
    >
      <Stack spacing={6}>
        {/* Header Row with Buttons */}
         <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
             <Heading size="lg">Department Overview</Heading>
             <HStack>
                 <Button
                    as={Link}
                    href="https://szabist-isb.edu.pk/timetable-all/"
                    isExternal
                    colorScheme="teal"
                    size="sm"
                    leftIcon={<FaExternalLinkAlt />}
                 >
                    View Timetable
                 </Button>
                 <Button
                    colorScheme="purple"
                    size="sm"
                    leftIcon={<FaCalendarAlt />}
                    onClick={onCalendarOpen}
                 >
                    Academic Calendar
                 </Button>
             </HStack>
         </Flex>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Teachers</StatLabel><StatNumber>{calculatedStats.totalTeachers}</StatNumber><StatHelpText>In {pmDepartmentName}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Students</StatLabel><StatNumber>{calculatedStats.totalStudents}</StatNumber><StatHelpText>In {pmDepartmentName}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Pending Approvals</StatLabel><StatNumber>{calculatedStats.pendingApprovals}</StatNumber><StatHelpText>Students Waiting</StatHelpText></Stat></CardBody></Card>
        </SimpleGrid>
        
        {/* Main Content Tabs */}
        <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
            <Tab><Icon as={FaChalkboardTeacher} mr={2}/>Classes</Tab>
            <Tab><Icon as={FaUserGraduate} mr={2}/>Students</Tab>
            <Tab><Icon as={FaChalkboardTeacher} mr={2}/>Teachers</Tab>
            <Tab><Icon as={FaCheck} mr={2}/>Student Approvals <Badge ml={1} colorScheme={calculatedStats.pendingApprovals > 0 ? 'red' : 'green'}>{calculatedStats.pendingApprovals}</Badge></Tab>
            <Tab><Icon as={FaListAlt} mr={2}/>Activity Log</Tab>
        </TabList>
        
        <TabPanels>
            {/* Classes Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}>
                   <Flex justify="space-between" align="center">
                      <Heading size="md">Manage Classes</Heading>
                       <Button colorScheme="blue" size="sm" leftIcon={<FaPlus />} onClick={onAddClassModalOpen}>
                         Add Class
              </Button>
            </Flex>
                </CardHeader>
                <CardBody>
                    <Text>Class list and management functionality will be added here.</Text>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Students Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Students in {pmDepartmentName}</Heading></CardHeader>
                <CardBody>
                   {students.length > 0 ? (
                      <Box overflowX="auto">
                          <Table variant="simple" size="sm">
                              <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Status</Th><Th>Joined</Th></Tr></Thead>
              <Tbody>
                                {students.map(student => ( <Tr key={student.id}> <Td>{student.first_name} {student.last_name}</Td> <Td>{student.email}</Td> <Td><Badge colorScheme={student.active ? 'green' : 'yellow'}>{student.active ? 'Active' : 'Pending'}</Badge></Td> <Td>{new Date(student.created_at).toLocaleDateString()}</Td> </Tr> ))}
              </Tbody>
            </Table>
                      </Box>
                   ) : (<Text>No students found in this department.</Text>)}
                </CardBody>
              </Card>
          </TabPanel>
          
            {/* Teachers Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Teachers in {pmDepartmentName}</Heading>
                    <Button colorScheme="blue" size="sm" leftIcon={<FaUserPlus />} onClick={onAddTeacherModalOpen}>
                Add Teacher
              </Button>
            </Flex>
                </CardHeader>
                <CardBody>
                    {teachers.length > 0 ? (
                       <Box overflowX="auto">
                           <Table variant="simple" size="sm">
                               <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Joined</Th></Tr></Thead>
                               <Tbody>
                                 {teachers.map(teacher => ( <Tr key={teacher.id}> <Td>{teacher.first_name} {teacher.last_name}</Td> <Td>{teacher.email}</Td> <Td>{new Date(teacher.created_at).toLocaleDateString()}</Td> </Tr> ))}
                               </Tbody>
                           </Table>
                       </Box>
                    ) : (<Text>No teachers found in this department.</Text>)}
                </CardBody>
              </Card>
            </TabPanel>

            {/* Student Approvals Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Pending Student Signup Requests</Heading></CardHeader>
                <CardBody>
                    {pendingUsers.length === 0 ? (<Text>No pending student signups.</Text>) : (
                     <Box overflowX="auto">
                         <Table variant="simple" size="sm">
                            <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Department</Th><Th>Signup Date</Th><Th>Actions</Th></Tr></Thead>
              <Tbody>
                                {pendingUsers.map(pUser => (
                                <Tr key={pUser.id}>
                                    <Td>{pUser.first_name} {pUser.last_name}</Td>
                                    <Td>{pUser.email}</Td>
                                    <Td>{pUser.department_name || 'N/A'}</Td>
                                    <Td>{new Date(pUser.created_at).toLocaleDateString()}</Td>
                                    <Td>
                                        <HStack spacing={2}>
                                            <Button size="xs" colorScheme="green" leftIcon={<FaCheck />} onClick={() => openActionDialog(pUser, 'approve')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'approve'}>Approve</Button>
                                            <Button size="xs" colorScheme="red" leftIcon={<FaTimes />} onClick={() => openActionDialog(pUser, 'reject')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'reject'}>Reject</Button>
                                        </HStack>
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
          
            {/* Activity Log Tab Panel */}
            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}><Heading size="md">Recent Activity Log</Heading></CardHeader>
                 <CardBody>
                    {activityLog.length === 0 ? (<Text>No recent activity.</Text>) : (
                    <VStack spacing={3} align="stretch">
                        {activityLog.map(log => (
                        <Card key={log.id} size="sm" variant="outline">
                            <CardBody><Flex justify="space-between" wrap="wrap"><Text fontSize="sm" mr={2}>{log.notification}</Text><Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{new Date(log.created_at).toLocaleString()}</Text></Flex></CardBody>
                        </Card>
                        ))}
                    </VStack>
                    )}
                 </CardBody>
               </Card>
          </TabPanel>

        </TabPanels>
      </Tabs>
      </Stack>

      {/* Modals & Dialogs */}
      
      {/* Add Teacher Modal */}
      <Modal isOpen={isAddTeacherModalOpen} onClose={onAddTeacherModalClose} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleCreateTeacher}>
           <ModalHeader>Add New Teacher Account</ModalHeader>
          <ModalCloseButton />
           <ModalBody pb={6}>
              <VStack spacing={4}>
                 <FormControl isRequired><FormLabel>First Name</FormLabel><Input placeholder='First Name' value={newTeacher.firstName} onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})} /></FormControl>
                 <FormControl isRequired><FormLabel>Last Name</FormLabel><Input placeholder='Last Name' value={newTeacher.lastName} onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})} /></FormControl>
                 <FormControl isRequired><FormLabel>Email Address</FormLabel><Input type='email' placeholder='teacher@example.com' value={newTeacher.email} onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})} /></FormControl>
                 <FormControl isRequired><FormLabel>Password</FormLabel><InputGroup size='md'><Input pr='4.5rem' type={showPassword ? 'text' : 'password'} placeholder='Enter password' value={newTeacher.password} onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})}/><InputRightElement width='4.5rem'><Button h='1.75rem' size='sm' onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FaEyeSlash/> : <FaEye/>}</Button></InputRightElement></InputGroup><Text fontSize="xs" color="gray.500" mt={1}>Min. 6 characters.</Text></FormControl>
                 <FormControl isReadOnly><FormLabel>Department</FormLabel><Input value={pmDepartmentName} isDisabled /></FormControl>
              </VStack>
          </ModalBody>
          <ModalFooter>
              <Button onClick={onAddTeacherModalClose} mr={3} variant="ghost">Cancel</Button>
              <Button colorScheme='blue' type="submit" isLoading={isCreatingTeacher} leftIcon={<FaUserPlus/>}>Create Teacher</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Class Modal */}
      <Modal isOpen={isAddClassModalOpen} onClose={onAddClassModalClose} isCentered>
          <ModalOverlay />
          <ModalContent as="form" onSubmit={handleCreateClass}>
            <ModalHeader>Add New Class</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                  <FormControl isRequired><FormLabel>Class Name</FormLabel><Input placeholder='e.g., Advanced Algorithms' value={newClass.name} onChange={(e) => setNewClass({...newClass, name: e.target.value})} /></FormControl>
                  <FormControl><FormLabel>Description</FormLabel><Input placeholder='Optional description' value={newClass.description} onChange={(e) => setNewClass({...newClass, description: e.target.value})} /></FormControl>
                  {teachers.length > 0 && ( <FormControl><FormLabel>Assign Teacher</FormLabel><Select placeholder="Select teacher (optional)" value={newClass.teacher_id} onChange={(e) => setNewClass({...newClass, teacher_id: e.target.value})}>{teachers.map(t => (<option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>))}</Select></FormControl> )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onAddClassModalClose} mr={3} variant="ghost">Cancel</Button>
              <Button colorScheme='blue' type="submit" isLoading={isCreatingClass} leftIcon={<FaPlus/>}>Create Class</Button>
            </ModalFooter>
          </ModalContent>
      </Modal>

      {/* Approve/Reject Confirmation Dialog */}
      <AlertDialog isOpen={isApprovalDialogOpen} leastDestructiveRef={cancelRef} onClose={onApprovalDialogClose}>
        <AlertDialogOverlay><AlertDialogContent>
           <AlertDialogHeader>
             {actionType === 'approve' ? 'Confirm Approval' : actionType === 'reject' ? 'Confirm Rejection' : 'Confirm Action'}
           </AlertDialogHeader>
           <AlertDialogBody>
              {actionType === 'approve'
                ? `Approve signup for ${selectedUserForAction?.first_name || 'this user'}?`
                : actionType === 'reject'
                ? `Reject signup for ${selectedUserForAction?.first_name || 'this user'}? This deletes request.`
                : 'Are you sure you want to proceed?'
              }
           </AlertDialogBody>
           <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onApprovalDialogClose} isDisabled={isActionLoading}>Cancel</Button>
              <Button
                 colorScheme={actionType === 'approve' ? 'green' : 'red'}
                 onClick={handleUserAction}
                 ml={3}
                 isLoading={isActionLoading}
                 isDisabled={!actionType}
               >
                 {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Confirm'}
              </Button>
           </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>

      {/* Academic Calendar Modal */}
      <Modal isOpen={isCalendarOpen} onClose={onCalendarClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{academicCalendarData.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={5}>
              <Text fontWeight="bold">{academicCalendarData.duration}</Text>
              <Text fontSize="sm">Semester Dates: {academicCalendarData.semesterDates}</Text>
              <Box><Heading size="sm" mb={2}>Examination Schedule</Heading><Table variant="simple" size="sm"><Thead><Tr><Th>Type</Th><Th>Week</Th><Th>Dates</Th></Tr></Thead><Tbody>{academicCalendarData.exams.map((e, i) => (<Tr key={i}><Td>{e.type}</Td><Td>{e.week}</Td><Td>{e.dates}</Td></Tr>))}</Tbody></Table></Box>
              <Box><Heading size="sm" mb={2}>Important Academic Dates</Heading><List spacing={1} fontSize="sm">{academicCalendarData.importantDates.map((d, i) => (<ListItem key={i}><ListIcon as={FaCalendarAlt} color="green.500" /><b>{d.event}:</b> {d.dates}</ListItem>))}</List></Box>
              <Box><Heading size="sm" mb={2}>Course Offering / Registration</Heading><List spacing={1} fontSize="sm">{academicCalendarData.registrationDates.map((r, i) => (<ListItem key={i}><ListIcon as={FaCalendarAlt} color="blue.500" /><b>{r.activity}:</b> {r.date}</ListItem>))}</List></Box>
              <Box><Heading size="sm" mb={2}>Dissertation / Thesis / IS Deadlines</Heading><List spacing={1} fontSize="sm">{academicCalendarData.dissertationDeadlines.map((d, i) => (<ListItem key={i}><ListIcon as={FaCalendarAlt} color="orange.500" /><b>{d.activity}:</b> {d.week}</ListItem>))}</List></Box>
              <Box><Heading size="sm" mb={2}>Holidays</Heading><List spacing={1} fontSize="sm">{academicCalendarData.holidays.map((h, i) => (<ListItem key={i}><ListIcon as={FaCalendarAlt} color="red.500" /><b>{h.occasion}:</b> {h.dates}</ListItem>))}</List><Text fontSize="xs" mt={1}><i>Note: Holidays compensated on following Sunday. Ramadan dates highlighted in yellow (March/April - based on moon sighting).</i></Text></Box>
            </VStack>
          </ModalBody>
          <ModalFooter> <Button onClick={onCalendarClose}>Close</Button> </ModalFooter>
        </ModalContent>
      </Modal>

    </DashboardLayout>
  );
}

export default ProgramManagerDashboard; 