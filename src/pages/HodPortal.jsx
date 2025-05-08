import React, { useState, useEffect, useRef, useMemo } from "react";
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
  useDisclosure,
  HStack,
  VStack,
  useToast,
  Spinner,
  Link,
  List,
  ListItem,
  ListIcon,
  Select,
  InputGroup,
  InputRightElement,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  CheckboxGroup,
  Checkbox,
  Stack as ChakraStack,
} from "@chakra-ui/react";
import {
  FaUniversity,
  FaUserTie,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUsers,
  FaPlus,
  FaTrash,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaBook,
  FaCheck,
  FaTimes,
  FaListAlt,
  FaUserPlus,
  FaEye,
  FaEyeSlash,
  FaLink,
} from "react-icons/fa";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseService";
import { useNavigate } from 'react-router-dom';

// --- Academic Calendar Data ---
const academicCalendarData = {
  title: "Academic Calendar (Spring - 2025)",
  duration: "February 2025 – June 2025",
  semesterDates: "Start: Feb 10, 2025 | End: July 6, 2025",
  exams: [
    { type: "Midterm Exam", week: "8th", dates: "March 24 – March 30, 2025" },
    { type: "Final Exam", week: "16th–17th", dates: "May 19 – June 1, 2025" },
  ],
  importantDates: [
    { event: "Teaching Evaluation (1st)", dates: "March 10 – March 23, 2025" },
    { event: "Course Withdrawal Deadline", dates: "April 27, 2025 (11th Week)" },
    { event: "Teaching Evaluation (2nd)", dates: "April 28 – May 4, 2025" },
    { event: "ZABDESK Closing", dates: "June 25, 2025" },
    { event: "Change of Grade Deadline", dates: "June 30, 2025" },
    { event: "Probation & Dismissal List", dates: "June 30, 2025" },
  ],
  holidays: [
    { occasion: "Pakistan Day", dates: "March 23, 2025" },
    { occasion: "Eid ul-Fitr", dates: "March 30 – April 1, 2025" },
    { occasion: "Labor Day", dates: "May 1, 2025" },
    { occasion: "Eid al-Adha", dates: "June 7 – 9, 2025" },
  ],
  dissertationDeadlines: [
    { activity: "Proposal Submission", week: "1st Week" },
    { activity: "Midterm Review", week: "8th Week" },
    { activity: "Plagiarism Checking", week: "12th Week (May 4, 2025)" },
    { activity: "Final Submission", week: "13th Week (May 7, 2025)" },
    { activity: "Final Defence (IRS, Thesis, RP, etc.)", week: "16th–17th Week (June 2–8, 2025)" },
    { activity: "MS Thesis Defence", week: "16th–17th Week (June 2–8, 2025)" },
    { activity: "PhD Presentation", week: "17th Week (June 2–8, 2025)" },
  ],
  registrationDates: [
      { activity: "Open Zabdesk Interface (PM/HoD)", date: "January 6, 2025" },
      { activity: "Course Offering Completion by PM/HoD", date: "January 16, 2025" },
      { activity: "Timetable Release", date: "January 18, 2025" },
      { activity: "Course Registration (Online)", date: "February 1–16, 2025" },
      { activity: "Manual Registration (with fine)", date: "February 17–18, 2025" },
  ]
};
// --- End Academic Calendar Data ---

function HodPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [departmentName, setDepartmentName] = useState('');
  const [pms, setPMs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [departmentCourseDetails, setDepartmentCourseDetails] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  
  const [newPM, setNewPM] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [newTeacher, setNewTeacher] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [newCourse, setNewCourse] = useState({ code: '', name: '', description: '', credit_hours: 3 });

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingCourses, setIsFetchingCourses] = useState(false);
  const [isSubmittingPM, setIsSubmittingPM] = useState(false);
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);

  const { 
    isOpen: isAddPmOpen,
    onOpen: onAddPmOpen,
    onClose: onAddPmClose,
  } = useDisclosure();

  const {
    isOpen: isAddTeacherModalOpen,
    onOpen: onAddTeacherModalOpen,
    onClose: onAddTeacherModalClose,
  } = useDisclosure();

  const {
    isOpen: isAddCourseOpen,
    onOpen: onAddCourseOpen,
    onClose: onAddCourseClose,
  } = useDisclosure();

  const { isOpen: isCalendarOpen, onOpen: onCalendarOpen, onClose: onCalendarClose } = useDisclosure();
  const { isOpen: isApprovalDialogOpen, onOpen: onApprovalDialogOpen, onClose: onApprovalDialogClose } = useDisclosure();
  const { isOpen: isAssignCourseModalOpen, onOpen: onAssignCourseModalOpen, onClose: onAssignCourseModalClose } = useDisclosure();

  const toast = useToast();
  const cancelRef = useRef();
  const [showPassword, setShowPassword] = useState(false);

  const [selectedUserForAction, setSelectedUserForAction] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState(null);
  const [coursesToAssign, setCoursesToAssign] = useState([]);
  const [teacherAssignedCourses, setTeacherAssignedCourses] = useState([]);

  const cardBg = useColorModeValue("white", "gray.700");
  const headerBg = useColorModeValue("red.50", "gray.800");
  const borderColor = useColorModeValue("red.500", "red.400");
  const tabColorScheme = "red";

  useEffect(() => {
    if (user && user.id) {
      fetchHodData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchHodData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data: hodData, error: hodError } = await supabase
        .from('users')
        .select('department_name')
        .eq('id', user.id)
        .single();

      if (hodError || !hodData?.department_name) {
        throw new Error(hodError?.message || 'HOD department not found or user profile incomplete.');
      }
      const deptName = hodData.department_name;
      setDepartmentName(deptName);

      const [pmsRes, teachersRes, studentsRes, pendingRes, logsRes, allCoursesRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, email, user_id').eq('role', 'pm').eq('department_name', deptName).order('created_at', { ascending: false }),
        supabase.from('users').select('id, first_name, last_name, email, created_at').eq('role', 'teacher').eq('department_name', deptName).order('created_at', { ascending: false }),
        supabase.from('users').select('id, first_name, last_name, email, created_at, active').eq('role', 'student').eq('department_name', deptName).order('created_at', { ascending: false }),
        supabase.from('users').select('*').eq('active', false).eq('role', 'student').order('created_at', { ascending: false }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('courses').select('id, code, name, description, credit_hours').order('code')
      ]);

      if (pmsRes.error) throw pmsRes.error;
      if (teachersRes.error) throw teachersRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (logsRes.error) throw logsRes.error;
      if (allCoursesRes.error) {
          console.error("Error fetching all courses:", allCoursesRes.error);
          toast({ title: 'Error Loading Courses', description: allCoursesRes.error.message, status: 'error'});
      }

      setPMs(pmsRes.data || []);
      setTeachers(teachersRes.data || []);
      setStudents(studentsRes.data || []);
      setPendingUsers(pendingRes.data || []);
      setActivityLog(logsRes.data || []);
      setAllCourses(allCoursesRes.data || []);

      try {
         const teacherIds = teachersRes.data.map(t => t.id);
         const studentIds = studentsRes.data.map(s => s.id);

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
                 supabase.from('teacher_courses').select('course_id, teacher:users(id, first_name, last_name)').in('course_id', courseIdArray),
                 supabase.from('student_courses').select('course_id, student:users(id, first_name, last_name)').in('course_id', courseIdArray)
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
      }

    } catch (error) {
      console.error('Error fetching HOD dashboard data:', error);
      toast({
        title: 'Error Loading Data',
        description: error.message,
        status: 'error',
        duration: 9000,
        isClosable: true,
      });
      setDepartmentName('');
      setPMs([]);
      setTeachers([]);
      setStudents([]);
      setPendingUsers([]);
      setActivityLog([]);
      setAllCourses([]);
      setDepartmentCourseDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPM = () => { onAddPmOpen(); };

  const handleCreatePM = async (e) => {
    e.preventDefault();
    if (!newPM.email || !newPM.password || !newPM.first_name || !newPM.last_name) {
      toast({ title: "Missing fields", description: "Please fill all required fields for PM", status: "error" }); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPM.email)) {
      toast({ title: "Invalid email", status: "error" }); return;
    }
    if (newPM.password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters long", status: "error" }); return;
    }
    if (!departmentName) {
      toast({ title: "Department Error", description: "HOD department not identified.", status: "error" }); return;
    }

    setIsSubmittingPM(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newPM.email.trim(),
        password: newPM.password,
        options: { data: { first_name: newPM.first_name.trim(), last_name: newPM.last_name.trim(), role: "pm" } },
      });
      if (authError) {
        if (authError.message.includes("User already registered")) {
      toast({
             title: "User Exists",
             description: "This email is already registered.",
             status: "error",
        duration: 5000,
        isClosable: true,
      });
        } else {
          toast({
            title: "Auth Error",
            description: authError.message,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
        throw authError;
      }
      if (!authData?.user?.id) {
        const errMsg = "User creation failed - no user ID returned";
        toast({
          title: "User Creation Failed",
          description: errMsg,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw new Error(errMsg);
      }

      const profileData = { user_id: authData.user.id, email: newPM.email.trim(), first_name: newPM.first_name.trim(), last_name: newPM.last_name.trim(), role: "pm", department_name: departmentName, active: true };
      const { error: userError } = await supabase.from("users").insert(profileData);
      if (userError) {
        console.error("Profile insert failed, potentially orphaned auth user:", authData.user.id);
      toast({
          title: "Profile Creation Error",
          description: userError.message,
          status: "error",
        duration: 5000,
        isClosable: true,
      });
        throw userError;
      }

      toast({ title: "Program Manager created", status: "success" });
      setNewPM({ email: "", password: "", first_name: "", last_name: "" });
      onAddPmClose();
      fetchHodData();
    } catch (error) {
      console.error("Error creating PM:", error);
    } finally {
      setIsSubmittingPM(false);
    }
  };

  const handleRemovePM = async (pmToRemove) => {
    if (!pmToRemove || !pmToRemove.id) {
        toast({
        title: "Error",
        description: "PM information is missing for removal.",
        status: "error",
        });
        return;
      }
      
    if (
      !window.confirm(
        `Are you sure you want to remove PM ${pmToRemove.first_name} ${pmToRemove.last_name} from the department?\n\nNOTE: This only removes their profile record. The underlying authentication account must be removed manually by an administrator via the Supabase dashboard.`
      )
    ) {
        return;
      }
      
    setIsSubmittingPM(true);

    try {
      const { error: profileDeleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", pmToRemove.id);

      if (profileDeleteError) {
      toast({
          title: "Error removing PM Profile",
          description: profileDeleteError.message,
          status: "error",
          duration: 5000,
        isClosable: true,
      });
        throw profileDeleteError;
      }
      
      toast({
        title: "PM Profile Removed",
        description: `PM ${pmToRemove.first_name} ${pmToRemove.last_name}'s profile removed. Remember to manually delete their authentication account if required.`,
        status: "warning",
        duration: 7000,
        isClosable: true,
      });

      fetchHodData();
    } catch (error) {
      console.error("Error removing PM profile:", error);
    } finally {
      setIsSubmittingPM(false);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!newTeacher.firstName || !newTeacher.lastName || !newTeacher.email || !newTeacher.password) {
      toast({ title: 'Missing Fields', description: 'Please fill all required teacher fields.', status: 'warning' }); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTeacher.email)) {
      toast({ title: 'Invalid Email', status: 'error' }); return;
    }
    if (newTeacher.password.length < 6) {
      toast({ title: 'Weak Password', status: 'warning' }); return;
    }
    if (!departmentName) {
      toast({ title: 'Department Error', description: 'HOD department not identified.', status: 'error' }); return;
    }

    setIsCreatingTeacher(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newTeacher.email.trim(),
        password: newTeacher.password,
        options: { data: { first_name: newTeacher.firstName.trim(), last_name: newTeacher.lastName.trim(), role: "teacher" } },
      });
      if (authError) {
      toast({
          title: "Auth Error",
          description: authError.message,
          status: "error",
        duration: 5000,
        isClosable: true,
      });
        throw authError;
      }
      if (!authData?.user?.id) {
        toast({
          title: "Auth Creation Failed",
          description: "Auth user creation failed - no user ID returned",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw new Error("Auth creation failed");
      }

      const profileData = { user_id: authData.user.id, email: newTeacher.email.trim(), first_name: newTeacher.firstName.trim(), last_name: newTeacher.lastName.trim(), role: "teacher", department_name: departmentName, active: true };
      const { error: userProfileError } = await supabase.from("users").insert(profileData);
      if (userProfileError) {
        console.error("Profile insert failed, potentially orphaned auth user:", authData.user.id);
      toast({
          title: "Profile Creation Error",
          description: userProfileError.message,
          status: "error",
        duration: 5000,
        isClosable: true,
      });
        throw userProfileError;
      }

      toast({ title: "Teacher Created", description: `${newTeacher.firstName} ${newTeacher.lastName} added to ${departmentName}.`, status: "success" });
      setNewTeacher({ firstName: "", lastName: "", email: "", password: "" });
      onAddTeacherModalClose();
      fetchHodData();
    } catch (error) {
      console.error("Error creating teacher:", error);
    } finally {
      setIsCreatingTeacher(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.name || !newCourse.credit_hours) {
      toast({ title: 'Missing Fields', description: 'Course Code, Name, and Credit Hours required.', status: 'warning' }); return;
    }
    if (isNaN(parseInt(newCourse.credit_hours)) || newCourse.credit_hours <= 0) {
      toast({ title: 'Invalid Credit Hours', status: 'warning' }); return;
    }

    setIsCreatingCourse(true);
    try {
      const { data, error } = await supabase.from('courses').insert({ code: newCourse.code.toUpperCase().trim(), name: newCourse.name.trim(), description: newCourse.description?.trim(), credit_hours: parseInt(newCourse.credit_hours) }).select().single();
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Course Code Exists', description: `A course with code ${newCourse.code.toUpperCase().trim()} already exists.`, status: 'error' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Course Created', description: `Course ${data.code} - ${data.name} added.`, status: 'success' });
        setNewCourse({ code: '', name: '', description: '', credit_hours: 3 });
        onAddCourseClose();
        fetchHodData();
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
        const { error } = await supabase.from('users').delete().eq('id', selectedUserForAction.id);
        if (error) throw error;
        notificationMessage = `Rejected and removed ${selectedUserForAction.first_name}.`;
        toastStatus = 'warning';
        toastTitle = 'User Rejected';
      }
      await supabase.from('notifications').insert({ notification: notificationMessage });
      toast({ title: toastTitle, description: notificationMessage, status: toastStatus });
      fetchHodData();
    } catch (error) {
      toast({ title: 'Action Error', description: error.message, status: 'error' });
      console.error("Error during user action:", error);
    } finally {
      setIsActionLoading(false);
      onApprovalDialogClose();
      setSelectedUserForAction(null);
      setActionType(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', status: 'error' });
    }
  };

  const calculatedStats = useMemo(() => ({
    totalPMs: pms.length,
    totalTeachers: teachers.length,
    totalStudents: students.length,
    pendingApprovals: pendingUsers.length,
  }), [pms, teachers, students, pendingUsers]);

  const menuItems = [
    { label: "Department Overview", icon: FaUniversity, path: "/hod-portal" },
  ];

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
        fetchHodData();
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

  if (isLoading) {
  return (
      <DashboardLayout title={`HOD Dashboard (Loading...)`} menuItems={menuItems} userRole="HOD" roleColor="red">
        <Flex justify="center" align="center" h="50vh"><Spinner size="xl" /></Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`HOD Dashboard (${departmentName || 'No Department Assigned'})`}
      menuItems={menuItems}
      userRole="HOD"
      roleColor={tabColorScheme}
    >
      <Stack spacing={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Heading size="lg">Department Management</Heading>
                <HStack>
            <Button as={Link} href="https://szabist-isb.edu.pk/timetable-all/" isExternal colorScheme="teal" size="sm" leftIcon={<FaExternalLinkAlt />}>View Timetable</Button>
            <Button colorScheme="purple" size="sm" leftIcon={<FaCalendarAlt />} onClick={onCalendarOpen}>Academic Calendar</Button>
                </HStack>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Program Managers</StatLabel><StatNumber>{calculatedStats.totalPMs}</StatNumber><StatHelpText>In Department</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Teachers</StatLabel><StatNumber>{calculatedStats.totalTeachers}</StatNumber><StatHelpText>In Department</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Students</StatLabel><StatNumber>{calculatedStats.totalStudents}</StatNumber><StatHelpText>In Department</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Pending Approvals</StatLabel><StatNumber>{calculatedStats.pendingApprovals}</StatNumber><StatHelpText>Students Waiting</StatHelpText></Stat></CardBody></Card>
        </SimpleGrid>

        <Tabs colorScheme={tabColorScheme} variant="enclosed" isLazy>
        <TabList>
            <Tab><Icon as={FaUserTie} mr={2}/>Program Managers</Tab>
            <Tab><Icon as={FaChalkboardTeacher} mr={2}/>Teachers</Tab>
            <Tab><Icon as={FaUserGraduate} mr={2}/>Students</Tab>
            <Tab><Icon as={FaCheck} mr={2}/>Student Approvals <Badge ml={1} colorScheme={calculatedStats.pendingApprovals > 0 ? 'red' : 'green'}>{calculatedStats.pendingApprovals}</Badge></Tab>
            <Tab><Icon as={FaBook} mr={2}/>Courses</Tab>
            <Tab><Icon as={FaEye} mr={2}/>Course View</Tab>
            <Tab><Icon as={FaListAlt} mr={2}/>Activity Log</Tab>
        </TabList>
        
          <TabPanels>
          <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}>
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Manage Program Managers</Heading>
                    <Button size="sm" colorScheme={tabColorScheme} leftIcon={<FaUserTie />} onClick={handleAddPM}>Add Program Manager</Button>
                  </Flex>
                  </CardHeader>
                  <CardBody>
                  {pms.length > 0 ? (
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                         <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Actions</Th></Tr></Thead>
                         <Tbody>{pms.map((pm) => (<Tr key={pm.id}><Td>{`${pm.first_name} ${pm.last_name}`}</Td><Td>{pm.email}</Td><Td><HStack spacing={2}><Button size="xs" colorScheme="red" variant="ghost" leftIcon={<FaTrash />} onClick={() => handleRemovePM(pm)} isLoading={isSubmittingPM}>Remove</Button></HStack></Td></Tr>))}</Tbody>
                      </Table>
                      </Box>
                  ) : (<Text>No Program Managers assigned.</Text>)}
                  </CardBody>
                </Card>
            </TabPanel>

            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}>
                   <Flex justify="space-between" align="center">
                     <Heading size="md">Manage Teachers</Heading>
                     <Button colorScheme={tabColorScheme} size="sm" leftIcon={<FaUserPlus />} onClick={onAddTeacherModalOpen}>Add Teacher</Button>
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
                                            >
                                                Assign Course
                                            </Button>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                   ) : (<Text>No teachers found.</Text>)}
                  </CardBody>
                </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}><Heading size="md">View Students</Heading></CardHeader>
                <CardBody>
                  {students.length > 0 ? (
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Status</Th><Th>Joined</Th></Tr></Thead>
                        <Tbody>{students.map(student => ( <Tr key={student.id}><Td>{student.first_name} {student.last_name}</Td><Td>{student.email}</Td><Td><Badge colorScheme={student.active ? 'green' : 'yellow'}>{student.active ? 'Active' : 'Pending'}</Badge></Td><Td>{new Date(student.created_at).toLocaleDateString()}</Td></Tr>))}</Tbody>
                      </Table>
              </Box>
                  ) : (<Text>No students found.</Text>)}
                </CardBody>
              </Card>
          </TabPanel>
          
          <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Pending Student Signup Requests</Heading></CardHeader>
                <CardBody>
                  {pendingUsers.length === 0 ? (<Text>No pending student signups.</Text>) : (
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead><Tr><Th>Name</Th><Th>Email</Th><Th>Department</Th><Th>Signup Date</Th><Th>Actions</Th></Tr></Thead>
                        <Tbody>{pendingUsers.map(pUser => (<Tr key={pUser.id}><Td>{pUser.first_name} {pUser.last_name}</Td><Td>{pUser.email}</Td><Td>{pUser.department_name || 'N/A'}</Td><Td>{new Date(pUser.created_at).toLocaleDateString()}</Td><Td><HStack spacing={2}><Button size="xs" colorScheme="green" leftIcon={<FaCheck />} onClick={() => openActionDialog(pUser, 'approve')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'approve'}>Approve</Button><Button size="xs" colorScheme="red" leftIcon={<FaTimes />} onClick={() => openActionDialog(pUser, 'reject')} isLoading={isActionLoading && selectedUserForAction?.id === pUser.id && actionType === 'reject'}>Reject</Button></HStack></Td></Tr>))}</Tbody>
                      </Table>
                    </Box>
                  )}
                </CardBody>
              </Card>
            </TabPanel>
            
            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}>
                    <Flex justify="space-between" align="center">
                     <Heading size="md">Manage Courses</Heading>
                     <Button colorScheme="green" size="sm" leftIcon={<FaPlus />} onClick={onAddCourseOpen}>Add New Course</Button>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Heading size="sm" mb={3} fontWeight="medium">Existing Courses</Heading>
                    
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
                                            <Td whiteSpace="normal">{course.description || <Text as="i" color="gray.500">N/A</Text>}</Td>
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
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}><Heading size="md">Department Course Offerings</Heading></CardHeader>
                 <CardBody>
                   {isFetchingCourses ? (
                     <Flex justify="center" align="center" p={10}><Spinner /></Flex>
                   ) : departmentCourseDetails.length === 0 ? (
                     <Text>No courses currently offered involving teachers or students from the {departmentName} department.</Text>
                   ) : (
                     <Accordion allowMultiple defaultIndex={[0]}>
                       {departmentCourseDetails.map((course) => (
                         <AccordionItem key={course.id}>
                           <h2>
                             <AccordionButton _expanded={{ bg: headerBg, color: 'inherit' }}>
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
                                     {course.teachers.map(teacher => (
                                       <ListItem key={teacher.id}>
                                         <ListIcon as={FaChalkboardTeacher} color="teal.500" />
                                         {teacher.first_name} {teacher.last_name}
                                       </ListItem>
                                     ))}
                                   </List>
                                 ) : (
                                   <Text fontSize="sm" fontStyle="italic">No teachers currently assigned from this department.</Text>
                                 )}
                               </Box>
                               <Box>
                                 <Heading size="sm" mb={2}>Enrolled Student(s)</Heading>
                                  {course.students.length > 0 ? (
                                    <List spacing={1} fontSize="sm">
                                      {course.students.map(student => (
                                        <ListItem key={student.id}>
                                           <ListIcon as={FaUserGraduate} color="purple.500" />
                                          {student.first_name} {student.last_name}
                                        </ListItem>
                                      ))}
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
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}><Heading size="md">Recent Activity Log</Heading></CardHeader>
                 <CardBody>
                   {activityLog.length === 0 ? (<Text>No recent activity.</Text>) : (
                     <VStack spacing={3} align="stretch">{activityLog.map(log => (<Card key={log.id} size="sm" variant="outline"><CardBody><Flex justify="space-between" wrap="wrap"><Text fontSize="sm" mr={2}>{log.notification}</Text><Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{new Date(log.created_at).toLocaleString()}</Text></Flex></CardBody></Card>))}</VStack>
                   )}
                 </CardBody>
               </Card>
            </TabPanel>

        </TabPanels>
      </Tabs>
      </Stack>

      <Modal isOpen={isAddPmOpen} onClose={onAddPmClose} isCentered>
         <ModalOverlay />
         <ModalContent as="form" onSubmit={handleCreatePM}>
            <ModalHeader>Add Program Manager</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
               <VStack spacing={4}>
                  <FormControl isRequired><FormLabel>First Name</FormLabel><Input value={newPM.first_name} onChange={(e) => setNewPM({ ...newPM, first_name: e.target.value })} /></FormControl>
                  <FormControl isRequired><FormLabel>Last Name</FormLabel><Input value={newPM.last_name} onChange={(e) => setNewPM({ ...newPM, last_name: e.target.value })} /></FormControl>
                  <FormControl isRequired><FormLabel>Email</FormLabel><Input type="email" value={newPM.email} onChange={(e) => setNewPM({ ...newPM, email: e.target.value })} /></FormControl>
                  <FormControl isRequired><FormLabel>Password</FormLabel><Input type="password" value={newPM.password} onChange={(e) => setNewPM({ ...newPM, password: e.target.value })} /></FormControl>
                  <FormControl><FormLabel>Department</FormLabel><Input value={departmentName} isReadOnly /></FormControl></VStack>
            </ModalBody>
            <ModalFooter><Button mr={3} onClick={onAddPmClose} variant="ghost">Cancel</Button><Button colorScheme={tabColorScheme} type="submit" isLoading={isSubmittingPM}>Create Program Manager</Button></ModalFooter>
         </ModalContent>
      </Modal>

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
                  <FormControl isReadOnly><FormLabel>Department</FormLabel><Input value={departmentName} isDisabled /></FormControl>
               </VStack>
            </ModalBody>
            <ModalFooter>
               <Button onClick={onAddTeacherModalClose} mr={3} variant="ghost">Cancel</Button>
               <Button colorScheme={tabColorScheme} type="submit" isLoading={isCreatingTeacher} leftIcon={<FaUserPlus/>}>Create Teacher</Button>
            </ModalFooter>
         </ModalContent>
       </Modal>

      <Modal isOpen={isAddCourseOpen} onClose={onAddCourseClose} isCentered>
          <ModalOverlay />
          <ModalContent as="form" onSubmit={handleCreateCourse}>
             <ModalHeader>Add New Course</ModalHeader>
             <ModalCloseButton />
             <ModalBody pb={6}>
                <VStack spacing={4}>
                    <FormControl isRequired><FormLabel>Course Code</FormLabel><Input placeholder="e.g., CS101" value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} textTransform="uppercase" /></FormControl>
                    <FormControl isRequired><FormLabel>Course Name</FormLabel><Input placeholder="e.g., Introduction to Computing" value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} /></FormControl>
                    <FormControl><FormLabel>Description</FormLabel><Input placeholder="Optional: Brief description" value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} /></FormControl>
                    <FormControl isRequired><FormLabel>Credit Hours</FormLabel><Input type="number" min="1" value={newCourse.credit_hours} onChange={(e) => setNewCourse({ ...newCourse, credit_hours: e.target.value })} /></FormControl>
              </VStack>
             </ModalBody>
             <ModalFooter><Button onClick={onAddCourseClose} mr={3} variant="ghost">Cancel</Button><Button colorScheme='green' type="submit" isLoading={isCreatingCourse} leftIcon={<FaPlus/>}>Create Course</Button></ModalFooter>
          </ModalContent>
      </Modal>

      <AlertDialog isOpen={isApprovalDialogOpen} leastDestructiveRef={cancelRef} onClose={onApprovalDialogClose} isCentered>
        <AlertDialogOverlay><AlertDialogContent>
           <AlertDialogHeader>{actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}</AlertDialogHeader>
           <AlertDialogBody>{`Are you sure you want to ${actionType} ${selectedUserForAction?.first_name || 'this user'}? ${actionType === 'reject' ? 'This removes the request.' : ''}`}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onApprovalDialogClose} isDisabled={isActionLoading}>Cancel</Button>
              <Button colorScheme={actionType === 'approve' ? 'green' : 'red'} onClick={handleUserAction} ml={3} isLoading={isActionLoading} isDisabled={!actionType}>{actionType === 'approve' ? 'Approve' : 'Reject'}</Button>
           </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>

      <Modal isOpen={isAssignCourseModalOpen} onClose={onAssignCourseModalClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
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
                        >
                            {course.code} - {course.name} {isAlreadyAssigned && <Badge ml={2} colorScheme="green">Assigned</Badge>}
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
            <Button onClick={onAssignCourseModalClose} mr={3} variant="ghost">Cancel</Button>
              <Button 
              colorScheme="teal" 
              onClick={handleAssignCourses} 
              isLoading={isAssigningCourse}
              isDisabled={coursesToAssign.length === 0}
              leftIcon={<FaCheck/>}
            >
              Save Assignments ({coursesToAssign.length})
              </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isCalendarOpen} onClose={onCalendarClose} size="3xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{academicCalendarData.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={5}>
              <Text fontWeight="bold">{academicCalendarData.duration}</Text>
              <Text fontSize="sm">Semester Dates: {academicCalendarData.semesterDates}</Text>

              <Box>
                <Heading size="sm" mb={2}>Examination Schedule</Heading>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Week</Th>
                      <Th>Dates</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {academicCalendarData.exams.map((exam, i) => (
                      <Tr key={i}>
                        <Td>{exam.type}</Td>
                        <Td>{exam.week}</Td>
                        <Td>{exam.dates}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              <Box>
                <Heading size="sm" mb={2}>Important Academic Dates</Heading>
                <List spacing={1} fontSize="sm">
                  {academicCalendarData.importantDates.map((item, i) => (
                    <ListItem key={i}>
                      <ListIcon as={FaCalendarAlt} color="green.500" />
                      <b>{item.event}:</b> {item.dates}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={2}>Course Offering / Registration</Heading>
                <List spacing={1} fontSize="sm">
                  {academicCalendarData.registrationDates.map((item, i) => (
                    <ListItem key={i}>
                      <ListIcon as={FaCalendarAlt} color="blue.500" />
                      <b>{item.activity}:</b> {item.date}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={2}>Dissertation / Thesis / IS Deadlines</Heading>
                <List spacing={1} fontSize="sm">
                  {academicCalendarData.dissertationDeadlines.map((item, i) => (
                    <ListItem key={i}>
                      <ListIcon as={FaCalendarAlt} color="orange.500" />
                      <b>{item.activity}:</b> {item.week}
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box>
                <Heading size="sm" mb={2}>Holidays</Heading>
                <List spacing={1} fontSize="sm">
                  {academicCalendarData.holidays.map((holiday, i) => (
                    <ListItem key={i}>
                      <ListIcon as={FaCalendarAlt} color="red.500" />
                      <b>{holiday.occasion}:</b> {holiday.dates}
                    </ListItem>
                  ))}
                </List>
                <Text fontSize="xs" mt={1}>
                  <i>Note: Holidays compensated on following Sunday. Ramadan dates highlighted in yellow (March/April - based on moon sighting).</i>
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onCalendarClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default HodPortal;