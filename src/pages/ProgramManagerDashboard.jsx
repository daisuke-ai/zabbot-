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
  Stack as ChakraStack
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
  FaLink
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
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [departmentCourseDetails, setDepartmentCourseDetails] = useState([]);
  const [isFetchingCourses, setIsFetchingCourses] = useState(false);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);
  
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
  
  // Define fetchPmData outside useEffect, wrapped in useCallback
  const fetchPmData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch PM Department
      const { data: pmData, error: pmError } = await supabase
        .from('users')
        .select('department_name')
        .eq('id', user.id)
        .single();
      if (pmError || !pmData?.department_name)
        throw new Error(pmError?.message || 'PM department not found.');
      const departmentName = pmData.department_name;
      setPmDepartmentName(departmentName);

      // Fetch Teachers in Dept
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at')
        .eq('role', 'teacher')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Fetch Students in Dept
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, created_at, active')
        .eq('role', 'student')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch Pending Student Approvals (for PM's dept)
      const { data: pending, error: pendingError } = await supabase
        .from('users')
        .select('*')
        .eq('active', false)
        .eq('role', 'student')
        .eq('department_name', departmentName)
        .order('created_at', { ascending: false });
      if (pendingError) throw pendingError;
      setPendingUsers(pending || []);

      // Fetch Activity Log (Global)
      const { data: logs, error: logError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (logError) throw logError;
      setActivityLog(logs || []);

      // Fetch All Courses
      const { data: allCoursesData, error: allCoursesError } = await supabase
        .from('courses')
        .select('id, code, name, description, credit_hours')
        .order('code');
      if (allCoursesError) {
        console.error("Error fetching all courses:", allCoursesError);
        toast({ title: 'Error Loading Courses', description: allCoursesError.message, status: 'error' });
      }
      setAllCourses(allCoursesData || []);

      // Fetch Department Specific Course Details
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
    // Call fetchPmData when user changes
    fetchPmData();

    // Cleanup function (if needed)
    return () => {};
  }, [fetchPmData]); // Now fetchPmData is a dependency
  
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
             if (authError.message.includes("User already registered")) {
                toast({ title: "User Exists", description: "This email is already registered.", status: "error" });
             } else {
                toast({ title: "Auth Error", description: authError.message, status: "error", duration: 5000 });
             }
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
            if (error.code === '23505') { // Handle unique constraint violation
                 toast({ title: 'Course Code Exists', description: `A course with code ${newCourse.code.toUpperCase().trim()} already exists.`, status: 'error' });
            } else {
                throw error;
            }
        } else {
            toast({ title: 'Course Created', description: `Course ${data.code} - ${data.name} added successfully.`, status: 'success' });
            setNewCourse({ code: '', name: '', description: '', credit_hours: 3 }); // Reset form
            onAddCourseModalClose(); // Close modal
            fetchPmData(); // Refresh data including courses after creation
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
        // First, try to delete the auth user (requires admin or service role)
        // This might fail if run from client-side without proper setup.
        // Consider moving this to a secure backend function if needed.
        try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(selectedUserForAction.user_id);
            if (authDeleteError && authDeleteError.message !== 'User not found') { // Ignore if auth user already gone
                console.warn("Could not delete auth user:", authDeleteError.message);
                // Don't block profile deletion if auth deletion fails, just warn
            }
        } catch (adminError) {
             console.warn("Admin action (delete auth user) failed:", adminError.message);
        }

        // Then delete the profile from users table
        const { error: profileDeleteError } = await supabase.from('users').delete().eq('id', selectedUserForAction.id);
        if (profileDeleteError) throw profileDeleteError;

        notificationMessage = `Rejected and removed ${selectedUserForAction.first_name}.`;
        toastStatus = 'warning';
        toastTitle = 'User Rejected & Removed';
      }
      // Log the action
      await supabase.from('notifications').insert({ notification: notificationMessage });

      toast({ title: toastTitle, description: notificationMessage, status: toastStatus });

      // Update local state immediately for UI responsiveness
      setPendingUsers(prev => prev.filter(u => u.id !== selectedUserForAction.id));
      if (actionType === 'approve') {
          // Optionally, re-fetch all data if the approved student should appear in the main list immediately
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

  // --- Function to open Assign Course Modal (Copied from HOD, uses PM context) --- 
  const openAssignCourseModal = async (teacher) => {
    setSelectedTeacherForAssignment(teacher);
    setCoursesToAssign([]); // Reset selection
    setTeacherAssignedCourses([]); // Reset assigned courses
    
    // Fetch courses already assigned to this teacher
    try {
        const { data, error } = await supabase
            .from('teacher_courses')
            .select('course_id')
            .eq('teacher_id', teacher.id);
            
        if (error) throw error;
        setTeacherAssignedCourses(data.map(item => item.course_id)); // Store just the IDs
    } catch (error) {
        console.error("Error fetching assigned courses:", error);
        toast({ title: 'Error', description: 'Could not fetch currently assigned courses.', status: 'error' });
    }
    
    onAssignCourseModalOpen();
  };
  
  // --- Function to handle saving course assignments (Copied from HOD) ---
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
        // Upsert allows inserting new or ignoring if composite key (teacher_id, course_id) exists
        const { error } = await supabase
            .from('teacher_courses')
            .upsert(assignments, { onConflict: 'teacher_id, course_id', ignoreDuplicates: true }); 
            
        if (error) throw error;
        
        toast({ title: 'Courses Assigned', description: `Successfully assigned ${assignments.length} course(s) to ${selectedTeacherForAssignment.first_name}.`, status: 'success'});
        onAssignCourseModalClose();
        fetchPmData(); // Refresh data to update course view
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
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Teachers</StatLabel><StatNumber>{calculatedStats.totalTeachers}</StatNumber><StatHelpText>In {pmDepartmentName || 'Dept.'}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Students</StatLabel><StatNumber>{calculatedStats.totalStudents}</StatNumber><StatHelpText>In {pmDepartmentName || 'Dept.'}</StatHelpText></Stat></CardBody></Card>
          <Card bg={cardBg} boxShadow="md"><CardBody><Stat><StatLabel>Pending Approvals</StatLabel><StatNumber>{calculatedStats.pendingApprovals}</StatNumber><StatHelpText>Dept. Students Waiting</StatHelpText></Stat></CardBody></Card>
        </SimpleGrid>
        
        {/* Main Content Tabs */}
        <Tabs colorScheme="blue" variant="enclosed" isLazy>
        <TabList>
            <Tab><Icon as={FaUserGraduate} mr={2}/>Students</Tab>
            <Tab><Icon as={FaChalkboardTeacher} mr={2}/>Teachers</Tab>
            <Tab><Icon as={FaCheck} mr={2}/>Student Approvals <Badge ml={1} colorScheme={calculatedStats.pendingApprovals > 0 ? 'red' : 'green'}>{calculatedStats.pendingApprovals}</Badge></Tab>
            <Tab><Icon as={FaBook} mr={2}/>Courses</Tab>
            <Tab><Icon as={FaEye} mr={2}/>Course View</Tab>
            <Tab><Icon as={FaListAlt} mr={2}/>Activity Log</Tab>
        </TabList>
        
        <TabPanels>
            {/* Students Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}><Heading size="md">Students in {pmDepartmentName || 'Department'}</Heading></CardHeader>
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
                    <Heading size="md">Teachers in {pmDepartmentName || 'Department'}</Heading>
                    <Button colorScheme="blue" size="sm" leftIcon={<FaUserPlus />} onClick={onAddTeacherModalOpen}>
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

            {/* Student Approvals Tab Panel */}
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
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
          
            {/* --- Courses Tab Panel (Modified) --- */}
            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
                 <CardHeader bg={headerBg} py={3}>
                    <Flex justify="space-between" align="center">
                       <Heading size="md">Manage Courses</Heading>
                        <Button
                          colorScheme="green"
                          size="sm"
                          leftIcon={<FaPlus />}
                          onClick={onAddCourseModalOpen}
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
            {/* --- End Courses Tab Panel --- */}

            {/* --- Department Course View Tab Panel (Added) --- */}
            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
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
            {/* --- End Department Course View Tab Panel --- */}

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

      {/* Add Course Modal */}
      <Modal isOpen={isAddCourseModalOpen} onClose={onAddCourseModalClose} isCentered>
          <ModalOverlay />
          <ModalContent as="form" onSubmit={handleCreateCourse}>
            <ModalHeader>Add New Course</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                  <FormControl isRequired><FormLabel>Course Code</FormLabel><Input placeholder='e.g., CS101' value={newCourse.code} onChange={(e) => setNewCourse({...newCourse, code: e.target.value})} /></FormControl>
                  <FormControl isRequired><FormLabel>Course Name</FormLabel><Input placeholder='e.g., Introduction to Computing' value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} /></FormControl>
                  <FormControl>
                     <FormLabel>Description</FormLabel>
                     <Input
                        placeholder="Optional: Brief description of the course"
                        value={newCourse.description}
                        onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                     />
                  </FormControl>
                  <FormControl isRequired>
                     <FormLabel>Credit Hours</FormLabel>
                     <Input
                        type="number"
                        min="1"
                        value={newCourse.credit_hours}
                        onChange={(e) => setNewCourse({ ...newCourse, credit_hours: e.target.value })}
                     />
                  </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onAddCourseModalClose} mr={3} variant="ghost">Cancel</Button>
              <Button colorScheme='green' type="submit" isLoading={isCreatingCourse} leftIcon={<FaPlus/>}>Create Course</Button>
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
                ? `Reject signup for ${selectedUserForAction?.first_name || 'this user'}? This deletes the user and their request.`
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
                 {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject & Remove' : 'Confirm'}
              </Button>
           </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>

      {/* --- Assign Course Modal (New - Copied from HOD) --- */}
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