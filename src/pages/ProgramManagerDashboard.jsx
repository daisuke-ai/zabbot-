import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ListIcon,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  CheckboxGroup,
  Checkbox,
  Stack as ChakraStack,
  Icon as ChakraIcon,
  Textarea
} from '@chakra-ui/react';
import { 
  FaUserTie, 
  FaChalkboardTeacher, 
  FaUserGraduate, 
  FaCalendarAlt, 
  FaPlus,
  FaEye,
  FaCheck,
  FaTimes,
  FaListAlt,
  FaUserPlus,
  FaEyeSlash,
  FaExternalLinkAlt,
  FaBook,
  FaLink,
  FaRobot,
  FaBrain,
  FaSave,
  FaUsers,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';
import DatabaseChatbot from '../components/DatabaseChatbot';

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
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [pmDepartmentName, setPmDepartmentName] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [departmentCourseDetails, setDepartmentCourseDetails] = useState([]);
  const [isFetchingCourses, setIsFetchingCourses] = useState(false);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);
  const [isEmbeddingText, setIsEmbeddingText] = useState(false);
  
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
    isOpen: isAddCourseModalOpen, 
    onOpen: onAddCourseModalOpen, 
    onClose: onAddCourseModalClose 
  } = useDisclosure();
  
  const { isOpen: isCalendarOpen, onOpen: onCalendarOpen, onClose: onCalendarClose } = useDisclosure();
  
  const { isOpen: isAssignCourseModalOpen, onOpen: onAssignCourseModalOpen, onClose: onAssignCourseModalClose } = useDisclosure();
  
  const toast = useToast();
  
  // Colors
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('blue.500', 'blue.400');
  
  const cancelRef = useRef();
  
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [newCourse, setNewCourse] = useState({ code: '', name: '', description: '', credit_hours: 3 });
  const [showPassword, setShowPassword] = useState(false);
  
  const [selectedUserForAction, setSelectedUserForAction] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState(null);
  const [coursesToAssign, setCoursesToAssign] = useState([]);
  const [teacherAssignedCourses, setTeacherAssignedCourses] = useState([]);
  const [expandedCourseDetails, setExpandedCourseDetails] = useState({});
  
  // Construct currentUserContext for the chatbot
  const currentUserContext = useMemo(() => {
    if (user && session && user.role && user.id) {
      return {
        userId: user.id,
        role: user.role,
        departmentName: user.department_name || pmDepartmentName,
        token: session.access_token
      };
    }
    return null;
  }, [user, session, pmDepartmentName]);
  
  const fetchPmData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
        return;
      }
    setIsLoading(true);
    try {
      const { data: pmData, error: pmError } = await supabase
        .from('users')
        .select('department_name')
        .eq('id', user.id)
        .single();
      if (pmError || !pmData?.department_name)
        throw new Error(pmError?.message || 'PM department not found.');
      const departmentName = pmData.department_name;
      setPmDepartmentName(departmentName);

      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'teacher')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at, active, roll_number')
        .eq('role', 'student')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      const { data: pending, error: pendingError } = await supabase
          .from('users')
          .select('*')
        .eq('active', false)
        .eq('role', 'student')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (pendingError) throw pendingError;
      setPendingUsers(pending || []);

      const { data: logs, error: logError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (logError) throw logError;
      setActivityLog(logs || []);

      const { data: allCoursesData, error: allCoursesError } = await supabase
        .from('courses')
        .select('id, code, name, description, credit_hours')
        .order('code');
      if (allCoursesError) {
        console.error("Error fetching all courses:", allCoursesError);
        toast({ title: 'Error Loading Courses', description: allCoursesError.message, status: 'error' });
      }
      setAllCourses(allCoursesData || []);

      try {
        setIsFetchingCourses(true);
        const teacherIds = teachersData.map(t => t.id);
        const studentIds = studentsData.map(s => s.id);
        let relevantCourseIds = new Set();

        if (teacherIds.length > 0) {
          const { data: teacherCourses, error: tcError } = await supabase
            .from('teacher_courses')
            .select('course_id')
            .in('teacher_id', teacherIds);
          if (tcError) console.error("Error fetching teacher courses:", tcError);
          else teacherCourses?.forEach(tc => relevantCourseIds.add(tc.course_id));
        }

        if (studentIds.length > 0) {
          const { data: studentCourses, error: scError } = await supabase
            .from('student_courses')
            .select('course_id')
            .in('student_id', studentIds);
          if (scError) console.error("Error fetching student courses:", scError);
          else studentCourses?.forEach(sc => relevantCourseIds.add(sc.course_id));
        }

        const courseIdArray = Array.from(relevantCourseIds);
        let detailedCourses = [];

        if (courseIdArray.length > 0) {
          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('id, code, name, credit_hours')
            .in('id', courseIdArray)
            .order('code');
          if (coursesError) throw coursesError;

          const [assignmentsRes, enrollmentsRes] = await Promise.all([
            supabase.from('teacher_courses').select('course_id, teacher:users!inner(id, first_name, last_name)').in('course_id', courseIdArray).in('teacher_id', teacherIds),
            supabase.from('student_courses').select('course_id, student:users!inner(id, first_name, last_name)').in('course_id', courseIdArray).in('student_id', studentIds)
          ]);

          if (assignmentsRes.error) console.error("Error fetching assignments:", assignmentsRes.error);
          if (enrollmentsRes.error) console.error("Error fetching enrollments:", enrollmentsRes.error);

          const assignments = assignmentsRes.data || [];
          const enrollments = enrollmentsRes.data || [];

          detailedCourses = coursesData.map(course => ({
            ...course,
            teachers: assignments.filter(a => a.course_id === course.id).map(a => a.teacher).filter(Boolean),
            students: enrollments.filter(e => e.course_id === course.id).map(e => e.student).filter(Boolean)
          }));
        }
        setDepartmentCourseDetails(detailedCourses);

      } catch (courseError) {
        console.error("Error fetching department course details:", courseError);
        toast({ title: 'Error Loading Course View', description: courseError.message, status: 'error' });
        setDepartmentCourseDetails([]);
      } finally {
        setIsFetchingCourses(false);
      }

    } catch (error) {
      console.error('Error fetching PM dashboard data:', error);
      toast({ title: 'Error Loading Data', description: error.message, status: 'error' });
      setPmDepartmentName(''); setTeachers([]); setStudents([]); setPendingUsers([]); setActivityLog([]);
      setAllCourses([]); setDepartmentCourseDetails([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPmData();
  }, [fetchPmData]); 
  
  const handleCreateTeacher = async (e) => {
    e.preventDefault();

    if (!newTeacher.firstName || !newTeacher.lastName || !newTeacher.email || !newTeacher.password) {
      toast({ title: 'Missing Fields', description: 'Please fill all required fields.', status: 'warning', duration: 3000 }); return;
    }
    const emailRegex = /^[\S]+@[\S]+\.[\S]+$/;
    if (!emailRegex.test(newTeacher.email)) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email.', status: 'error', duration: 3000 }); return;
    }
    if (newTeacher.password.length < 6) {
      toast({ title: 'Weak Password', description: 'Password must be at least 6 characters.', status: 'warning', duration: 3000 }); return;
    }
    if (!pmDepartmentName) {
      toast({ title: 'Error', description: 'Cannot identify Program Manager Department.', status: 'error', duration: 5000 }); return;
    }

    setIsCreatingTeacher(true);
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newTeacher.email.trim(),
            password: newTeacher.password,
            options: {
                data: {
                    first_name: newTeacher.firstName.trim(),
                    last_name: newTeacher.lastName.trim(),
                    role: "teacher",
                },
            },
        });

        if (authError) {
             if (authError.message.includes("User already registered")) {
                toast({ title: "User Exists", description: "This email is already registered.", status: "error" });
             } else {
                toast({ title: "Auth Error", description: authError.message, status: "error", duration: 5000 });
             }
            throw authError;
        }

        if (!authData?.user?.id) {
            const errMsg = "Auth creation succeeded but no user ID returned.";
            toast({ title: "User Creation Failed", description: errMsg, status: "error", duration: 5000 });
            throw new Error(errMsg);
        }

        const createdAuthUserId = authData.user.id;
        const profileData = {
            user_id: createdAuthUserId,
            email: newTeacher.email.trim(),
            first_name: newTeacher.firstName.trim(),
            last_name: newTeacher.lastName.trim(),
            role: "teacher",
            department_name: pmDepartmentName,
            active: true
        };

        const { error: userProfileError } = await supabase
            .from("users")
            .insert(profileData);

        if (userProfileError) {
            toast({ title: "Profile Creation Error", description: userProfileError.message, status: "error", duration: 5000 });
            throw userProfileError; 
        }

        toast({
            title: "Teacher Created",
            description: `${newTeacher.firstName} ${newTeacher.lastName} added to ${pmDepartmentName}.`,
            status: "success",
            duration: 5000,
        });

        setNewTeacher({ firstName: "", lastName: "", email: "", password: "" });
        onAddTeacherModalClose();
        fetchPmData(); 

    } catch (error) {
        console.error("Error during handleCreateTeacher:", error);
    } finally {
        setIsCreatingTeacher(false);
    }
  };
  
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.credit_hours) {
        toast({ title: 'Missing Fields', description: 'Course Code, Name, and Credit Hours are required.', status: 'warning' });
        return;
    }
     if (isNaN(parseInt(newCourse.credit_hours)) || newCourse.credit_hours <= 0) {
        toast({ title: 'Invalid Credit Hours', description: 'Credit hours must be a positive number.', status: 'warning' });
        return;
    }

    setIsCreatingCourse(true);
    try {
        const { data, error } = await supabase
            .from('courses')
            .insert({
                code: newCourse.code.toUpperCase().trim(),
                name: newCourse.name.trim(),
                description: newCourse.description?.trim(),
                credit_hours: parseInt(newCourse.credit_hours)
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                 toast({ title: 'Course Code Exists', description: `A course with code ${newCourse.code.toUpperCase().trim()} already exists.`, status: 'error' });
            } else {
                throw error;
            }
        } else {
            toast({ title: 'Course Created', description: `Course ${data.code} - ${data.name} added successfully.`, status: 'success' });
            setNewCourse({ code: '', name: '', description: '', credit_hours: 3 });
            onAddCourseModalClose();
            fetchPmData();
        }
    } catch (error) {
        console.error("Error creating course:", error);
        toast({ title: 'Error Creating Course', description: error.message, status: 'error' });
    } finally {
        setIsCreatingCourse(false);
    }
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
        // IMPORTANT: See note at the bottom of the file about this section.
        // This client-side admin call will likely fail.
        try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(selectedUserForAction.user_id);
            if (authDeleteError && authDeleteError.message !== 'User not found') {
                console.warn("Could not delete auth user (expected on client-side):", authDeleteError.message);
                toast({ title: 'Partial Deletion', description: 'Profile removed, but auth user may remain. Please contact admin.', status: 'warning', duration: 7000});
            }
        } catch (adminError) {
             console.warn("Admin action (delete auth user) failed:", adminError.message);
        }

        const { error: profileDeleteError } = await supabase.from('users').delete().eq('id', selectedUserForAction.id);
        if (profileDeleteError) throw profileDeleteError;

        notificationMessage = `Rejected and removed profile for ${selectedUserForAction.first_name}.`;
        toastStatus = 'warning';
        toastTitle = 'User Rejected & Profile Removed';
      }
      
      await supabase.from('notifications').insert({ notification: notificationMessage });

      toast({ title: toastTitle, description: notificationMessage, status: toastStatus });

      setPendingUsers(prev => prev.filter(u => u.id !== selectedUserForAction.id));
      if (actionType === 'approve') {
          fetchPmData();
      }
    } catch (error) {
      toast({ title: 'Action Error', description: error.message, status: 'error' });
      console.error("Error during user action:", error);
    }
    finally {
      setIsActionLoading(false);
      onApprovalDialogClose();
      setSelectedUserForAction(null);
      setActionType(null);
    }
  };

  const openAssignCourseModal = async (teacher) => {
    setSelectedTeacherForAssignment(teacher);
    setCoursesToAssign([]);
    setTeacherAssignedCourses([]);
    
    try {
        const { data, error } = await supabase
            .from('teacher_courses')
            .select('course_id')
            .eq('teacher_id', teacher.id);
            
        if (error) throw error;
        setTeacherAssignedCourses(data.map(item => item.course_id));
    } catch (error) {
        console.error("Error fetching assigned courses:", error);
        toast({ title: 'Error', description: 'Could not fetch currently assigned courses.', status: 'error' });
    }
    
    onAssignCourseModalOpen();
  };
  
  const handleAssignCourses = async () => {
    if (!selectedTeacherForAssignment || coursesToAssign.length === 0) {
        toast({ title: 'Error', description: 'No teacher or courses selected.', status: 'warning'});
      return;
    }
    
    setIsAssigningCourse(true);
    const assignments = coursesToAssign.map(courseId => ({
        teacher_id: selectedTeacherForAssignment.id,
        course_id: courseId
    }));
    
    try {
        const { error } = await supabase
            .from('teacher_courses')
            .upsert(assignments, { onConflict: 'teacher_id, course_id', ignoreDuplicates: true }); 
            
        if (error) throw error;
        
        toast({ title: 'Courses Assigned', description: `Successfully assigned ${assignments.length} course(s) to ${selectedTeacherForAssignment.first_name}.`, status: 'success'});
        onAssignCourseModalClose();
        fetchPmData();
    } catch (error) {
        console.error("Error assigning courses:", error);
        toast({ title: 'Assignment Failed', description: error.message, status: 'error'});
    } finally {
        setIsAssigningCourse(false);
        setSelectedTeacherForAssignment(null);
        setCoursesToAssign([]);
        setTeacherAssignedCourses([]);
    }
  };

  const handleEmbedText = async () => {
    const textToEmbed = document.getElementById('pm-ai-training-textarea').value;

    if (!textToEmbed || textToEmbed.trim() === '') {
      toast({ title: 'No Text Provided', description: 'Please enter text to train the AI.', status: 'warning', duration: 3000 });
      return;
    }

    setIsEmbeddingText(true);
    try {
      const response = await fetch(`http://localhost:3036/api/embed-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: textToEmbed,
          userContext: {
            userId: user.id,
            role: user.role,
            departmentName: pmDepartmentName,
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to embed text on server.');
      }

      toast({ title: 'Text Embedding Successful', description: result.message || 'Text has been successfully embedded and stored.', status: 'success', duration: 5000 });
      document.getElementById('pm-ai-training-textarea').value = '';

    } catch (error) {
      console.error("Error embedding text:", error);
      toast({ title: 'Error Embedding Text', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setIsEmbeddingText(false);
    }
  };

  const menuItems = [
    { label: 'Dashboard', icon: FaUserTie, path: '/pm-dashboard' },
    { label: 'Database Assistant', icon: FaBrain, path: '/pm-dashboard#db-assistant'},
    { label: 'Train AI', icon: FaRobot, path: '/pm-dashboard#train-ai' },
  ];
  
  const calculatedStats = useMemo(() => ({
    totalTeachers: teachers.length,
    totalStudents: students.length,
    pendingApprovals: pendingUsers.length,
  }), [teachers, students, pendingUsers]);
  
  if (isLoading && !pmDepartmentName) {
    return (
      <DashboardLayout title="PM Dashboard (Loading...)" menuItems={menuItems} userRole="Program Manager" roleColor="blue">
         <Flex justify="center" align="center" h="50vh"><Spinner size="xl" /></Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`PM Dashboard (${pmDepartmentName || 'Loading Department...'})`}
      menuItems={menuItems}
      userRole="Program Manager"
      roleColor="blue"
    >
      <Stack spacing={6}>
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
             </HStack>
         </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md" borderRadius="lg"><CardBody><Stat><StatLabel>Teachers</StatLabel><StatNumber>{calculatedStats.totalTeachers}</StatNumber><StatHelpText>In {pmDepartmentName || 'Dept.'}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md" borderRadius="lg"><CardBody><Stat><StatLabel>Students</StatLabel><StatNumber>{calculatedStats.totalStudents}</StatNumber><StatHelpText>In {pmDepartmentName || 'Dept.'}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md" borderRadius="lg"><CardBody><Stat><StatLabel>Pending Approvals</StatLabel><StatNumber>{calculatedStats.pendingApprovals}</StatNumber><StatHelpText>Dept. Students Waiting</StatHelpText></Stat></CardBody></Card>
        </SimpleGrid>
        
        <Tabs colorScheme="blue" variant="enclosed" isLazy>
        <TabList>
            <Tab><ChakraIcon as={FaUserGraduate} mr={2}/>Students</Tab>
            <Tab><ChakraIcon as={FaChalkboardTeacher} mr={2}/>Teachers</Tab>
            <Tab><ChakraIcon as={FaCheck} mr={2}/>Student Approvals <Badge ml={1} colorScheme={calculatedStats.pendingApprovals > 0 ? 'red' : 'green'}>{calculatedStats.pendingApprovals}</Badge></Tab>
            <Tab><ChakraIcon as={FaBook} mr={2}/>Courses</Tab>
            <Tab><ChakraIcon as={FaEye} mr={2}/>Course View</Tab>
            <Tab><ChakraIcon as={FaBrain} mr={2}/>DB Assistant</Tab>
            <Tab><ChakraIcon as={FaListAlt} mr={2}/>Activity Log</Tab>
            <Tab><ChakraIcon as={FaRobot} mr={2}/>Train AI</Tab>
        </TabList>
        
        <TabPanels>
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Students in {pmDepartmentName || 'Department'}</Heading></CardHeader>
                <CardBody>
                   {students.length > 0 ? (
                      <Box overflowX="auto">
                          <Table variant="simple" size="sm">
                              <Thead><Tr><Th>Name</Th><Th>Roll No.</Th><Th>Status</Th><Th>Joined</Th></Tr></Thead>
                              <Tbody>
                                {students.map(student => ( <Tr key={student.id}> <Td>{student.first_name} {student.last_name}</Td> <Td>{student.roll_number || 'N/A'}</Td> <Td><Badge colorScheme={student.active ? 'green' : 'yellow'} borderRadius="md">{student.active ? 'Active' : 'Pending'}</Badge></Td> <Td>{new Date(student.created_at).toLocaleDateString()}</Td> </Tr> ))}
                              </Tbody>
                           </Table>
                      </Box>
                   ) : (<Text>No students found in this department.</Text>)}
                </CardBody>
              </Card>
          </TabPanel>
          
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                <CardHeader bg={headerBg} py={3}>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Teachers in {pmDepartmentName || 'Department'}</Heading>
                    <Button colorScheme="blue" size="sm" leftIcon={<FaUserPlus />} onClick={onAddTeacherModalOpen} borderRadius="md">
                      Add Teacher
                    </Button>
                  </Flex>
                </CardHeader>
                <CardBody>
                    {teachers.length > 0 ? (
                       <Box overflowX="auto">
                           <Table variant="simple" size="sm">
                               <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Joined</Th><Th>Actions</Th></Tr></Thead>
                               <Tbody>
                                 {teachers.map(teacher => ( 
                                    <Tr key={teacher.id}> 
                                        <Td>{teacher.first_name} {teacher.last_name}</Td> 
                                        <Td>{teacher.email}</Td> 
                                        <Td>{new Date(teacher.created_at).toLocaleDateString()}</Td>
                                        <Td>
                                            <Button 
                                                size="xs" 
                                                colorScheme="teal"
                                                variant="outline"
                                                leftIcon={<FaLink />} 
                                                onClick={() => openAssignCourseModal(teacher)}
                                                borderRadius="md"
                                            >
                                                Assign Course
                                            </Button>
                                         </Td>
                                     </Tr>
                                 ))}
                               </Tbody>
                           </Table>
                       </Box>
                    ) : (<Text>No teachers found in this department.</Text>)}
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Pending Student Signup Requests ({pmDepartmentName || 'Department'})</Heading></CardHeader>
                <CardBody>
                    {pendingUsers.length === 0 ? (<Text>No pending student signups for this department.</Text>) : (
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
                                            <Button size="xs" colorScheme="green" leftIcon={<FaCheck />} onClick={() => openActionDialog(pUser, 'approve')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'approve'} borderRadius="md">Approve</Button>
                                            <Button size="xs" colorScheme="red" leftIcon={<FaTimes />} onClick={() => openActionDialog(pUser, 'reject')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'reject'} borderRadius="md">Reject</Button>
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
          
            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                 <CardHeader bg={headerBg} py={3}>
                    <Flex justify="space-between" align="center">
                       <Heading size="md">Manage Courses</Heading>
                        <Button 
                          colorScheme="green" 
                          size="sm"
                          leftIcon={<FaPlus />}
                          onClick={onAddCourseModalOpen}
                          borderRadius="md"
                        >
                          Add New Course
                        </Button>
                    </Flex>
                 </CardHeader>
                 <CardBody>
                     <Heading size="sm" mb={3} fontWeight="medium">Existing Courses (System-wide)</Heading>
                     {isLoading ? (
                         <Flex justify="center" p={5}><Spinner /></Flex>
                     ) : allCourses.length === 0 ? (
                         <Text>No courses found in the system.</Text>
                     ) : (
                         <Box overflowX="auto">
                             <Table variant="simple" size="sm">
                                <Thead>
                                  <Tr>
                                    <Th>Code</Th>
                                    <Th>Name</Th>
                                    <Th>Credits</Th>
                                    <Th>Description</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                     {allCourses.map((course) => (
                                         <Tr key={course.id}>
                                             <Td fontWeight="bold">{course.code}</Td>
                                             <Td>{course.name}</Td>
                                             <Td textAlign="center">{course.credit_hours}</Td>
                                             <Td whiteSpace="normal" maxW="300px" overflow="hidden" textOverflow="ellipsis">{course.description || <Text as="i" color="gray.500">N/A</Text>}</Td>
                                          </Tr>
                                        ))}
                                </Tbody>
                            </Table>
                         </Box>
                     )}
                 </CardBody>
               </Card>
            </TabPanel>

            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                 <CardHeader bg={headerBg} py={3}><Heading size="md">Department Course Offerings</Heading></CardHeader>
                  <CardBody>
                   {isFetchingCourses ? (
                     <Flex justify="center" align="center" p={10}><Spinner /></Flex>
                   ) : departmentCourseDetails.length === 0 ? (
                     <Text>No courses currently offered involving teachers or students from the {pmDepartmentName} department.</Text>
                   ) : (
                     <Accordion allowMultiple defaultIndex={[]}>
                       {departmentCourseDetails.map((course) => (
                         <AccordionItem key={course.id}>
                           <h2>
                             <AccordionButton _expanded={{ bg: headerBg, color: 'inherit' }} borderRadius="md">
                               <Box flex='1' textAlign='left' fontWeight="medium">
                                 {course.code} - {course.name} ({course.credit_hours} Credits)
                               </Box>
                               <AccordionIcon />
                             </AccordionButton>
                           </h2>
                           <AccordionPanel pb={4}>
                             <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} mt={2}>
                               <Box>
                                 <Heading size="sm" mb={2}>Assigned Teacher(s)</Heading>
                                 {course.teachers.length > 0 ? (
                                   <List spacing={1} fontSize="sm">
                                     {(expandedCourseDetails[course.id]?.teachers ? course.teachers : course.teachers.slice(0, 5)).map(teacher => (
                                       <ListItem key={teacher.id}>
                                         <ListIcon as={FaChalkboardTeacher} color="teal.500" />
                                         {teacher.first_name} {teacher.last_name}
                                       </ListItem>
                                     ))}
                                     {course.teachers.length > 5 && (
                                       <Button 
                                         size="xs" 
                                         variant="link" 
                                         colorScheme="blue" 
                                         mt={2} 
                                         onClick={() => setExpandedCourseDetails(prev => ({
                                           ...prev, 
                                           [course.id]: { 
                                             ...prev[course.id], 
                                             teachers: !prev[course.id]?.teachers 
                                           }
                                         }))}
                                         leftIcon={expandedCourseDetails[course.id]?.teachers ? <FaChevronUp/> : <FaChevronDown/>}
                                       >
                                         {expandedCourseDetails[course.id]?.teachers ? 'Show Less' : `Show All (${course.teachers.length})`}
                                       </Button>
                                     )}
                                   </List>
                                 ) : (
                                   <Text fontSize="sm" fontStyle="italic">No teachers currently assigned from this department.</Text>
                                 )}
                               </Box>
                               <Box>
                                 <Heading size="sm" mb={2}>Enrolled Student(s)</Heading>
                                  {course.students.length > 0 ? (
                                    <List spacing={1} fontSize="sm">
                                      {(expandedCourseDetails[course.id]?.students ? course.students : course.students.slice(0, 5)).map(student => (
                                        <ListItem key={student.id}>
                                           <ListIcon as={FaUserGraduate} color="purple.500" />
                                          {student.first_name} {student.last_name}
                                        </ListItem>
                                      ))}
                                      {course.students.length > 5 && (
                                        <Button 
                                          size="xs" 
                                          variant="link" 
                                          colorScheme="blue" 
                                          mt={2} 
                                          onClick={() => setExpandedCourseDetails(prev => ({
                                            ...prev, 
                                            [course.id]: { 
                                              ...prev[course.id], 
                                              students: !prev[course.id]?.students 
                                            }
                                          }))}
                                          leftIcon={expandedCourseDetails[course.id]?.students ? <FaChevronUp/> : <FaChevronDown/>}
                                        >
                                          {expandedCourseDetails[course.id]?.students ? 'Show Less' : `Show All (${course.students.length})`}
                                        </Button>
                                      )}
                                    </List>
                                  ) : (
                                    <Text fontSize="sm" fontStyle="italic">No students currently enrolled from this department.</Text>
                                  )}
                               </Box>
                             </SimpleGrid>
                           </AccordionPanel>
                         </AccordionItem>
                       ))}
                     </Accordion>
                    )}
                  </CardBody>
                </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                <CardHeader bg={headerBg} py={3}>
                  <Heading size="md">
                    <Flex align="center">
                      <ChakraIcon as={FaBrain} mr={2}/> Department Database Assistant
                    </Flex>
                  </Heading>
                </CardHeader>
                <CardBody>
                  {currentUserContext ? (
                    <DatabaseChatbot currentUserContext={currentUserContext} />
                  ) : (
                    <Flex justify="center" align="center" h="200px">
                      <Spinner size="xl" mr={3}/> 
                      <Text>Loading user context for Database Assistant...</Text>
                    </Flex>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                 <CardHeader bg={headerBg} py={3}><Heading size="md">Recent Activity Log</Heading></CardHeader>
                 <CardBody>
                    {activityLog.length === 0 ? (<Text>No recent activity.</Text>) : (
                    <VStack spacing={3} align="stretch">
                        {activityLog.map(log => (
                        <Card key={log.id} size="sm" variant="outline" borderRadius="md">
                            <CardBody><Flex justify="space-between" wrap="wrap"><Text fontSize="sm" mr={2}>{log.notification}</Text><Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{new Date(log.created_at).toLocaleString()}</Text></Flex></CardBody>
                        </Card>
                        ))}
                    </VStack>
                    )}
                 </CardBody>
               </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md" borderRadius="lg">
                <CardHeader bg={headerBg} py={3}>
                  <Heading size="md">
                    <Flex align="center">
                      <ChakraIcon as={FaRobot} mr={2}/> Train RAG Assistant
                    </Flex>
                  </Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="md">
                      Enter text below to train the RAG assistant. This will create an embedding of the content and store it in the `documents` table.
                    </Text>
                    <FormControl>
                      <FormLabel htmlFor="pm-ai-training-textarea">Text to Embed</FormLabel>
                      <Textarea
                        id="pm-ai-training-textarea"
                        placeholder="Enter the text you want to train the AI with..."
                        rows={10}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.300"
                        _dark={{ borderColor: "gray.600" }}
                      />
                    </FormControl>
                    <Button
                      colorScheme="purple"
                      leftIcon={<FaSave />}
                      onClick={handleEmbedText}
                      isLoading={isEmbeddingText}
                      borderRadius="md"
                    >
                      Embed and Save Text
                    </Button>
                    <Text fontSize="sm" color="gray.500">
                      Note: Large texts will be chunked automatically.
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

        </TabPanels>
      </Tabs>
      </Stack>

      {/* Modals & Dialogs */}
      
      <Modal isOpen={isAddTeacherModalOpen} onClose={onAddTeacherModalClose} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleCreateTeacher} borderRadius="lg">
           <ModalHeader>Add New Teacher Account</ModalHeader>
          <ModalCloseButton />
           <ModalBody pb={6}>
              <VStack spacing={4}>
                 <FormControl isRequired><FormLabel>First Name</FormLabel><Input placeholder='First Name' value={newTeacher.firstName} onChange={(e) => setNewTeacher({...newTeacher, firstName: e.target.value})} borderRadius="md"/></FormControl>
                 <FormControl isRequired><FormLabel>Last Name</FormLabel><Input placeholder='Last Name' value={newTeacher.lastName} onChange={(e) => setNewTeacher({...newTeacher, lastName: e.target.value})} borderRadius="md"/></FormControl>
                 <FormControl isRequired><FormLabel>Email Address</FormLabel><Input type='email' placeholder='teacher@example.com' value={newTeacher.email} onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})} borderRadius="md"/></FormControl>
                 <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup size='md'>
                        <Input pr='4.5rem' type={showPassword ? 'text' : 'password'} placeholder='Enter password' value={newTeacher.password} onChange={(e) => setNewTeacher({...newTeacher, password: e.target.value})} borderRadius="md"/>
                        <InputRightElement width='4.5rem'>
                            <Button h='1.75rem' size='sm' onClick={() => setShowPassword(!showPassword)} borderRadius="md">
                                {showPassword ? <FaEyeSlash/> : <FaEye/>}
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                    <Text fontSize="xs" color="gray.500" mt={1}>Min. 6 characters.</Text>
                </FormControl>
                 <FormControl isReadOnly><FormLabel>Department</FormLabel><Input value={pmDepartmentName} isDisabled borderRadius="md"/></FormControl>
              </VStack>
          </ModalBody>
          <ModalFooter>
              <Button onClick={onAddTeacherModalClose} mr={3} variant="ghost" borderRadius="md">Cancel</Button>
              <Button colorScheme='blue' type="submit" isLoading={isCreatingTeacher} leftIcon={<FaUserPlus/>} borderRadius="md">Create Teacher</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isAddCourseModalOpen} onClose={onAddCourseModalClose} isCentered>
          <ModalOverlay />
          <ModalContent as="form" onSubmit={handleCreateCourse} borderRadius="lg">
            <ModalHeader>Add New Course</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                  <FormControl isRequired><FormLabel>Course Code</FormLabel><Input placeholder='e.g., CS101' value={newCourse.code} onChange={(e) => setNewCourse({...newCourse, code: e.target.value})} borderRadius="md"/></FormControl>
                  <FormControl isRequired><FormLabel>Course Name</FormLabel><Input placeholder='e.g., Introduction to Computing' value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} borderRadius="md"/></FormControl>
                  <FormControl>
                     <FormLabel>Description</FormLabel>
                     <Textarea 
                        placeholder="Optional: Brief description of the course"
                        value={newCourse.description}
                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                        borderRadius="md"
                     />
                  </FormControl>
                  <FormControl isRequired>
                     <FormLabel>Credit Hours</FormLabel>
                     <Input 
                        type="number"
                        min="1"
                        value={newCourse.credit_hours}
                        onChange={(e) => setNewCourse({ ...newCourse, credit_hours: e.target.value })}
                        borderRadius="md"
                     />
                  </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onAddCourseModalClose} mr={3} variant="ghost" borderRadius="md">Cancel</Button>
              <Button colorScheme='green' type="submit" isLoading={isCreatingCourse} leftIcon={<FaPlus/>} borderRadius="md">Create Course</Button>
            </ModalFooter>
          </ModalContent>
      </Modal>

      <AlertDialog isOpen={isApprovalDialogOpen} leastDestructiveRef={cancelRef} onClose={onApprovalDialogClose}>
        <AlertDialogOverlay>
            <AlertDialogContent borderRadius="lg">
                <AlertDialogHeader>
                    {actionType === 'approve' ? 'Confirm Approval' : actionType === 'reject' ? 'Confirm Rejection' : 'Confirm Action'}
                </AlertDialogHeader>
                <AlertDialogBody>
                    {actionType === 'approve'
                    ? `Approve signup for ${selectedUserForAction?.first_name || 'this user'}?`
                    : actionType === 'reject'
                    ? `Reject signup for ${selectedUserForAction?.first_name || 'this user'}? This deletes the user's profile and attempts to remove their authentication account.`
                    : 'Are you sure you want to proceed?'
                    }
                </AlertDialogBody>
                <AlertDialogFooter>
                    <Button ref={cancelRef} onClick={onApprovalDialogClose} isDisabled={isActionLoading} borderRadius="md">Cancel</Button>
                    <Button
                        colorScheme={actionType === 'approve' ? 'green' : 'red'}
                        onClick={handleUserAction}
                        ml={3}
                        isLoading={isActionLoading}
                        isDisabled={!actionType}
                        borderRadius="md"
                    >
                        {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject & Remove' : 'Confirm'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isAssignCourseModalOpen} onClose={onAssignCourseModalClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="lg">
          <ModalHeader>Assign Courses to {selectedTeacherForAssignment?.first_name} {selectedTeacherForAssignment?.last_name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {allCourses.length > 0 ? (
              <CheckboxGroup 
                colorScheme="teal"
                value={coursesToAssign} 
                onChange={(values) => setCoursesToAssign(values)}
              >
                <Text mb={2} fontWeight="medium">Available Courses (Check to assign):</Text>
                <ChakraStack spacing={2} maxHeight="400px" overflowY="auto" p={2} borderWidth="1px" borderRadius="md">
                  {allCourses.map(course => {
                    const isAlreadyAssigned = teacherAssignedCourses.includes(course.id);
                    return (
                        <Checkbox 
                            key={course.id} 
                            value={course.id} 
                            isDisabled={isAlreadyAssigned}
                            borderRadius="md"
                        >
                            {course.code} - {course.name} {isAlreadyAssigned && <Badge ml={2} colorScheme="green" borderRadius="md">Assigned</Badge>}
                        </Checkbox>
                    );
                  })}
                </ChakraStack>
              </CheckboxGroup>
            ) : (
              <Text>No courses available in the system to assign.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onAssignCourseModalClose} mr={3} variant="ghost" borderRadius="md">Cancel</Button>
            <Button 
              colorScheme="teal"
              onClick={handleAssignCourses} 
              isLoading={isAssigningCourse}
              isDisabled={coursesToAssign.length === 0}
              leftIcon={<FaCheck/>}
              borderRadius="md"
            >
              Save Assignments ({coursesToAssign.length})
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isCalendarOpen} onClose={onCalendarClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="lg">
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
          <ModalFooter> <Button onClick={onCalendarClose} borderRadius="md">Close</Button> </ModalFooter>
        </ModalContent>
      </Modal>

    </DashboardLayout>
  );
}

export default ProgramManagerDashboard;