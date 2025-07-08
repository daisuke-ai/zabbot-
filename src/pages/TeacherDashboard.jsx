import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  HStack,
  Spinner,
  useToast,
  InputGroup,
  InputLeftAddon
} from '@chakra-ui/react';
import { 
  FaChalkboardTeacher, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaUsers, 
  FaChartLine,
  FaPlus,
  FaEdit,
  FaEye,
  FaSave,
  FaBrain
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import DatabaseChatbot from '../components/DatabaseChatbot';

// --- Define Mark Types and Totals --- 
const MARK_TYPES = {
  'Assignment 1': 10,
  'Assignment 2': 10,
  'Assignment 3': 10,
  'Assignment 4': 10,
  'Quiz 1': 10,
  'Quiz 2': 10,
  'Quiz 3': 10,
  'Quiz 4': 10,
  'Midterm': 50,
  'Final': 100,
};
const MARK_TYPE_KEYS = Object.keys(MARK_TYPES);
// ---------------------------------

function TeacherDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  // --- State Refactoring --- 
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [teacherDepartmentName, setTeacherDepartmentName] = useState('');
  
  // State for the marks modal
  const { isOpen: isMarksModalOpen, onOpen: onMarksModalOpen, onClose: onMarksModalClose } = useDisclosure();
  const [selectedCourseForMarks, setSelectedCourseForMarks] = useState(null);
  const [studentsInCourse, setStudentsInCourse] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [isFetchingModalData, setIsFetchingModalData] = useState(false);

  // --- Colors --- 
  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('green.50', 'gray.800');
  const borderColor = useColorModeValue('green.500', 'green.400');

  const tabColorScheme = "green";

  // Define currentUserContext for the chatbot
  const currentUserContext = useMemo(() => {
    if (user && user.id && user.role) {
      return {
        userId: user.id,
        role: user.role,
        departmentName: teacherDepartmentName || 'N/A'
      };
    }
    return null;
  }, [user, teacherDepartmentName]);

  // --- Data Fetching --- 
  const fetchTeacherData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Fetch teacher's department name
      const { data: teacherProfile, error: profileError } = await supabase
        .from('users')
        .select('department_name')
        .eq('id', user.id)
        .single();

      if (profileError || !teacherProfile?.department_name) {
        console.warn('Teacher department not found or profile incomplete.', profileError);
      }
      setTeacherDepartmentName(teacherProfile?.department_name || '');

      // 1. Fetch course IDs assigned to the teacher
      const { data: courseAssignments, error: assignmentError } = await supabase
        .from('teacher_courses')
        .select('course_id')
        .eq('teacher_id', user.id);

      if (assignmentError) throw assignmentError;
      
      const courseIds = courseAssignments.map(a => a.course_id);
      
      if (courseIds.length === 0) {
        setAssignedCourses([]);
        setIsLoading(false);
        return; // No courses assigned
      }
      
      // 2. Fetch details for assigned courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, code, name, credit_hours')
        .in('id', courseIds);
        
      if (coursesError) throw coursesError;
      setAssignedCourses(coursesData || []);
      
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      toast({ title: 'Error Loading Data', description: error.message, status: 'error' });
      setAssignedCourses([]); // Reset on error
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);
  
  // --- Modal Logic --- 
  const openMarksModal = async (course) => {
    if (!course) return;
    setSelectedCourseForMarks(course);
    setIsFetchingModalData(true);
    setStudentsInCourse([]);
    setMarksData({});
    onMarksModalOpen();

    try {
      // 1. Fetch student IDs enrolled in this course
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_courses')
        .select('student_id')
        .eq('course_id', course.id);

      if (enrollmentError) throw enrollmentError;
      const studentIds = enrollments.map(e => e.student_id);

      if (studentIds.length === 0) {
        setIsFetchingModalData(false);
        return; // No students enrolled
      }

      // 2. Fetch student details
      const { data: studentsData, error: studentError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      if (studentError) throw studentError;
      setStudentsInCourse(studentsData || []);

      // 3. Fetch existing marks for these students in this course
      const { data: existingMarks, error: marksError } = await supabase
        .from('marks')
        .select('student_id, type, obtained_number, total_number')
        .eq('course_id', course.id)
        .in('student_id', studentIds);

      if (marksError) throw marksError;
      
      // 4. Process marks into the desired state structure
      const processedMarks = {};
      studentsData.forEach(student => {
          processedMarks[student.id] = {};
          MARK_TYPE_KEYS.forEach(markType => {
              const foundMark = existingMarks.find(m => m.student_id === student.id && m.type === markType);
              processedMarks[student.id][markType] = {
                  obtained: foundMark?.obtained_number ?? '',
                  total: foundMark?.total_number ?? MARK_TYPES[markType]
              };
          });
      });
      setMarksData(processedMarks);

    } catch (error) {
        console.error('Error fetching modal data:', error);
        toast({ title: 'Error Loading Students/Marks', description: error.message, status: 'error' });
        onMarksModalClose();
    } finally {
        setIsFetchingModalData(false);
    }
  };
  
  // --- Handle Input Change in Modal --- 
  const handleMarkChange = (studentId, markType, value) => {
      const numericValue = value === '' ? '' : Number(value);
      
      const total = marksData[studentId]?.[markType]?.total ?? MARK_TYPES[markType];
      if (numericValue !== '' && (isNaN(numericValue) || numericValue < 0 || numericValue > total)) {
           toast({ title: 'Invalid Input', description: `Mark must be between 0 and ${total}.`, status: 'warning', duration: 2000 });
           return;
      }

      setMarksData(prev => ({
          ...prev,
          [studentId]: {
              ...prev[studentId],
              [markType]: {
                  ...prev[studentId]?.[markType],
                  obtained: numericValue
              }
          }
      }));
  };

  // --- Handle Saving Marks --- 
  const handleSaveMarks = async () => {
      if (!selectedCourseForMarks) return;
      setIsSavingMarks(true);

      const marksToUpsert = [];
      Object.keys(marksData).forEach(studentId => {
          Object.keys(marksData[studentId]).forEach(markType => {
              const mark = marksData[studentId][markType];
              if (mark.obtained !== '' && !isNaN(Number(mark.obtained))) {
                  marksToUpsert.push({
                      student_id: studentId,
                      course_id: selectedCourseForMarks.id,
                      teacher_id: user.id,
                      type: markType,
                      obtained_number: Number(mark.obtained),
                      total_number: mark.total ?? MARK_TYPES[markType]
                  });
              }
          });
      });

      if (marksToUpsert.length === 0) {
          toast({ title: 'No Marks Entered', description: 'Please enter marks before saving.', status: 'info' });
          setIsSavingMarks(false);
          return;
      }

      try {
          console.log("Upserting marks:", marksToUpsert);
          const { error } = await supabase
              .from('marks')
              .upsert(marksToUpsert, { onConflict: 'student_id, course_id, type' });

          if (error) throw error;

          toast({ title: 'Marks Saved Successfully', status: 'success' });
          onMarksModalClose();

      } catch (error) {
          console.error('Error saving marks:', error);
          toast({ title: 'Error Saving Marks', description: error.message, status: 'error' });
      } finally {
          setIsSavingMarks(false);
      }
  };

  // --- Menu Items (Adjust as needed) --- 
  const menuItems = [
    { label: 'DB Assistant', icon: FaBrain, path: '#db-assistant' },
    { label: 'My Courses', icon: FaChalkboardTeacher, path: '/teacher-dashboard' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Teacher Dashboard" menuItems={menuItems} userRole="teacher" roleColor="green">
        <Flex justify="center" align="center" h="50vh"><Spinner size="xl" /></Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Teacher Dashboard" 
      menuItems={menuItems}
      userRole="teacher"
      roleColor="green"
    >
      <Stack spacing={6}>
        <Tabs colorScheme={tabColorScheme} variant="enclosed" isLazy>
          <TabList>
              <Tab><Icon as={FaBrain} mr={2} fontSize="xl"/> DB Assistant</Tab>
              <Tab><Icon as={FaChalkboardTeacher} mr={2}/>My Assigned Courses</Tab>
          </TabList>
          
          <TabPanels>
              <TabPanel px={0}>
                  <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
                      <CardHeader bg={headerBg} py={3}>
                          <Heading size="md">
                              <Flex align="center">
                                  <Icon as={FaBrain} mr={2}/> My Database Assistant
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
                  <Card bg={cardBg} boxShadow="md" borderTop="4px solid" borderColor={borderColor}>
                      <CardHeader bg={headerBg} py={3}>
                          <Heading size="md">
                              <Flex align="center">
                                  <Icon as={FaChalkboardTeacher} mr={2} />
                                  My Assigned Courses
                              </Flex>
                          </Heading>
                      </CardHeader>
                      <CardBody>
                          {assignedCourses.length > 0 ? (
                              <Box overflowX="auto">
                                  <Table variant="simple" size="sm">
                                      <Thead>
                                          <Tr>
                                              <Th>Code</Th>
                                              <Th>Name</Th>
                                              <Th>Credits</Th>
                                              <Th>Actions</Th>
                                          </Tr>
                                      </Thead>
                                      <Tbody>
                                          {assignedCourses.map((course) => (
                                              <Tr key={course.id}>
                                                  <Td fontWeight="bold">{course.code}</Td>
                                                  <Td>{course.name}</Td>
                                                  <Td textAlign="center">{course.credit_hours}</Td>
                                                  <Td>
                                                      <Button 
                                                          size="xs" 
                                                          colorScheme="blue" 
                                                          variant="outline"
                                                          leftIcon={<FaUsers />}
                                                          onClick={() => openMarksModal(course)}
                                                      >
                                                          Manage Students & Marks
                                                      </Button>
                                                  </Td>
                                              </Tr>
                                          ))}
                                      </Tbody>
                                  </Table>
                              </Box>
                          ) : (
                              <Text>You are not currently assigned to any courses.</Text>
                          )}
                      </CardBody>
                  </Card>
              </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
      
      {/* Marks Modal */}
      <Modal isOpen={isMarksModalOpen} onClose={onMarksModalClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Manage Marks for {selectedCourseForMarks?.code} - {selectedCourseForMarks?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isFetchingModalData ? (
                <Flex justify="center" align="center" h="200px"><Spinner size="xl" /></Flex>
            ) : studentsInCourse.length === 0 ? (
                <Text>No students enrolled in this course.</Text>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Student Name</Th>
                      {MARK_TYPE_KEYS.map(type => (
                        <Th key={type} isNumeric>{type} (/{MARK_TYPES[type]})</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {studentsInCourse.map((student) => (
                      <Tr key={student.id}>
                        <Td>{student.first_name} {student.last_name}</Td>
                        {MARK_TYPE_KEYS.map(markType => (
                          <Td key={markType} isNumeric>
                            <Input 
                              type="number" 
                              size="xs"
                              w="60px" 
                              textAlign="right"
                              value={marksData[student.id]?.[markType]?.obtained ?? ''}
                              onChange={(e) => handleMarkChange(student.id, markType, e.target.value)}
                              placeholder="-"
                              max={marksData[student.id]?.[markType]?.total ?? MARK_TYPES[markType]}
                              min={0}
                            />
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              colorScheme="green" 
              mr={3}
              leftIcon={<FaSave />}
              onClick={handleSaveMarks}
              isLoading={isSavingMarks}
              isDisabled={isFetchingModalData || studentsInCourse.length === 0}
            >
              Save Marks
            </Button>
            <Button variant="ghost" onClick={onMarksModalClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default TeacherDashboard; 