import React, { useState, useEffect, useMemo } from 'react';
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
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Checkbox,
  Progress,
  Tag,
  HStack
} from '@chakra-ui/react';
import { 
  FaBook, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaUserGraduate, 
  FaChartLine, 
  FaDownload,
  FaInfoCircle,
  FaPlusSquare,
  FaCalculator,
  FaPercentage
} from 'react-icons/fa';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

// --- Helper Function for Grade Point Calculation ---
const getGradePoint = (obtained, total) => {
  if (total === null || total === 0 || obtained === null) return 0; // Handle invalid data
  const percentage = (obtained / total) * 100;
  if (percentage >= 90) return 4.0;
  if (percentage >= 85) return 3.7;
  if (percentage >= 80) return 3.3;
  if (percentage >= 75) return 3.0;
  if (percentage >= 70) return 2.7;
  if (percentage >= 65) return 2.3;
  if (percentage >= 60) return 2.0;
  if (percentage >= 55) return 1.7;
  if (percentage >= 50) return 1.0;
  return 0.0; // Failing grade
};

const getLetterGrade = (obtained, total) => {
    if (total === null || total === 0 || obtained === null) return 'N/A';
    const percentage = (obtained / total) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 85) return 'A-';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'B-';
    if (percentage >= 65) return 'C+';
    if (percentage >= 60) return 'C';
    if (percentage >= 55) return 'C-';
    if (percentage >= 50) return 'D';
    return 'F';
};
// --- End Helper Functions ---

// --- New Helper to Extract Specific Mark ---
const findMark = (marks, courseId, type) => {
    return marks.find(mark => mark.course_id === courseId && mark.type === type);
};
// --- End Helper ---

function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [allCourses, setAllCourses] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [studentMarks, setStudentMarks] = useState([]);
  const [selectedCoursesToEnroll, setSelectedCoursesToEnroll] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [gpaInfo, setGpaInfo] = useState({ gpa: 0, totalCredits: 0, averagePercentage: 0 });

  const cardBg = useColorModeValue('white', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('purple.500', 'purple.300');
  
  useEffect(() => {
    if (user && user.id) {
      fetchDashboardData(user.id);
    } else {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (studentEnrollments.length > 0 && studentMarks.length > 0) {
      calculateGPAAndStats();
    } else {
      setGpaInfo({ gpa: 0, totalCredits: 0, averagePercentage: 0 });
    }
  }, [studentEnrollments, studentMarks]);
  
  const fetchDashboardData = async (studentId) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, code, name, description, credit_hours')
        .order('code', { ascending: true });

      if (coursesError) throw coursesError;
      setAllCourses(coursesData || []);
      console.log("Fetched all courses:", coursesData);

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_courses')
        .select(`
          id,
          enrolled_at,
          course: courses ( id, code, name, credit_hours ) {/* Fetch course details including credits */}
        `)
        .eq('student_id', studentId);

      if (enrollmentError) throw enrollmentError;
      setStudentEnrollments(enrollmentData || []);
      console.log("Fetched enrolled course IDs:", enrollmentData);

      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select('*')
        .eq('student_id', studentId);

      if (marksError) throw marksError;
      setStudentMarks(marksData || []);
      console.log("Fetched student marks:", marksData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setFetchError(error.message || 'Failed to load dashboard data.');
      setAllCourses([]);
      setStudentEnrollments([]);
      setStudentMarks([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const calculateGPAAndStats = () => {
    let totalQualityPoints = 0;
    let totalCreditsAttempted = 0;
    let totalPercentageSum = 0;
    let coursesWithFinalMark = 0;

    studentEnrollments.forEach(enrollment => {
      if (!enrollment.course) return;

      const courseId = enrollment.course.id;
      const creditHours = enrollment.course.credit_hours || 0;

      const finalMark = findMark(studentMarks, courseId, 'Final');

      if (finalMark && creditHours > 0 && finalMark.obtained_number !== null) {
        const gradePoint = getGradePoint(finalMark.obtained_number, finalMark.total_number);
        totalQualityPoints += gradePoint * creditHours;
        totalCreditsAttempted += creditHours;
        totalPercentageSum += (finalMark.obtained_number / (finalMark.total_number || 100)) * 100;
        coursesWithFinalMark++;
      }
    });

    const calculatedGpa = totalCreditsAttempted > 0 ? (totalQualityPoints / totalCreditsAttempted) : 0;
    const averagePercentage = coursesWithFinalMark > 0 ? (totalPercentageSum / coursesWithFinalMark) : 0;

    setGpaInfo({
        gpa: calculatedGpa,
        totalCredits: totalCreditsAttempted,
        averagePercentage: averagePercentage
    });
  };
  
  const handleCourseSelectionChange = (courseId, isChecked) => {
    setSelectedCoursesToEnroll(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isChecked) {
        newSelected.add(courseId);
      } else {
        newSelected.delete(courseId);
      }
      return newSelected;
    });
  };
  
  const handleEnrollment = async () => {
    if (selectedCoursesToEnroll.size === 0) {
      toast({
        title: 'No Courses Selected',
        description: 'Please select at least one course to enroll.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!user || !user.id) {
       toast({ title: 'Error', description: 'User not found.', status: 'error'});
       return;
    }

    setIsEnrolling(true);
    setFetchError(null);

    const enrollmentsToInsert = Array.from(selectedCoursesToEnroll).map(courseId => ({
      student_id: user.id,
      course_id: courseId
    }));

    console.log("Attempting to insert enrollments:", enrollmentsToInsert);

    try {
      const { error: insertError } = await supabase
        .from('student_courses')
        .insert(enrollmentsToInsert);

      if (insertError) {
        if (insertError.code === '23505') {
             toast({ title: 'Already Enrolled', description: "You might already be enrolled in one of the selected courses.", status: 'warning', duration: 5000, isClosable: true });
        } else {
            throw insertError;
        }
      } else {
        toast({
          title: 'Enrollment Successful!',
          description: `Successfully enrolled in ${enrollmentsToInsert.length} course(s).`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        fetchDashboardData(user.id);
        setSelectedCoursesToEnroll(new Set());
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Could not enroll in selected courses.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEnrolling(false);
    }
  };
  
  const menuItems = [
    { label: 'My Dashboard', icon: FaUserGraduate, path: '/student-dashboard' },
    { label: 'Register Courses', icon: FaPlusSquare, path: '/student-dashboard' },
  ];
  
  if (isLoading) {
    return (
      <DashboardLayout 
        title="Student Dashboard" 
        menuItems={menuItems}
        userRole="student"
        roleColor="purple"
      >
        <Flex justify="center" align="center" height="50vh">
          <Spinner size="xl" />
        </Flex>
      </DashboardLayout>
    );
  }
  
  if (fetchError) {
    return (
      <DashboardLayout 
        title="Student Dashboard" 
        menuItems={menuItems}
        userRole="student"
        roleColor="purple"
      >
        <Alert status='error'>
          <AlertIcon />
          Error loading dashboard data: {fetchError}
        </Alert>
      </DashboardLayout>
    );
  }
  
  const enrolledIdsSet = new Set(studentEnrollments.map(e => e.course?.id).filter(id => id));

  return (
    <DashboardLayout 
      title="Student Dashboard" 
      menuItems={menuItems}
      userRole="student"
      roleColor="purple"
    >
      <Stack spacing={6}>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel><Icon as={FaCalculator} mr={2}/>Current GPA</StatLabel>
                <StatNumber>{gpaInfo.gpa.toFixed(2)}</StatNumber>
                <StatHelpText>Based on {gpaInfo.totalCredits} credits w/ Final Marks</StatHelpText>
              </Stat>
              <Progress value={gpaInfo.gpa * 25} size='sm' colorScheme='purple' mt={2} borderRadius="md"/>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel><Icon as={FaBook} mr={2}/>Enrolled Courses</StatLabel>
                <StatNumber>{studentEnrollments.length}</StatNumber>
                <StatHelpText>Current Term</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel><Icon as={FaPercentage} mr={2}/>Average %</StatLabel>
                <StatNumber>{gpaInfo.averagePercentage.toFixed(1)}%</StatNumber>
                <StatHelpText>Courses w/ Final Mark</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        <Tabs colorScheme="purple" variant='soft-rounded'>
          <TabList>
            <Tab><Icon as={FaBook} mr={2} />My Courses & Marks</Tab>
            <Tab><Icon as={FaPlusSquare} mr={2} />Register for Courses</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}>
                  <Heading size="md">My Enrolled Courses & Marks Breakdown</Heading>
                </CardHeader>
                <CardBody>
                  {studentEnrollments.length > 0 ? (
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>Code</Th>
                            <Th>Name</Th>
                            <Th>Credits</Th>
                            <Th isNumeric>A1</Th>
                            <Th isNumeric>A2</Th>
                            <Th isNumeric>A3</Th>
                            <Th isNumeric>A4</Th>
                            <Th isNumeric>Q1</Th>
                            <Th isNumeric>Q2</Th>
                            <Th isNumeric>Q3</Th>
                            <Th isNumeric>Q4</Th>
                            <Th isNumeric>Mid</Th>
                            <Th isNumeric>Final</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {studentEnrollments.map(({ id, course }) => {
                            if (!course) return null;

                            const marksForThisCourse = studentMarks.filter(m => m.course_id === course.id);

                            const renderMark = (type) => {
                              const mark = marksForThisCourse.find(m => m.type === type);
                              return mark?.obtained_number !== null && mark?.obtained_number !== undefined
                                ? `${mark.obtained_number}/${mark.total_number ?? 100}`
                                : '-';
                            };

                            return (
                              <Tr key={id}>
                                <Td fontWeight="medium">{course.code}</Td>
                                <Td>{course.name}</Td>
                                <Td textAlign="center">{course.credit_hours ?? 'N/A'}</Td>
                                <Td isNumeric>{renderMark('Assignment 1')}</Td>
                                <Td isNumeric>{renderMark('Assignment 2')}</Td>
                                <Td isNumeric>{renderMark('Assignment 3')}</Td>
                                <Td isNumeric>{renderMark('Assignment 4')}</Td>
                                <Td isNumeric>{renderMark('Quiz 1')}</Td>
                                <Td isNumeric>{renderMark('Quiz 2')}</Td>
                                <Td isNumeric>{renderMark('Quiz 3')}</Td>
                                <Td isNumeric>{renderMark('Quiz 4')}</Td>
                                <Td isNumeric>{renderMark('Midterm')}</Td>
                                <Td isNumeric>{renderMark('Final')}</Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Text>You are not currently enrolled in any courses.</Text>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
               <Card bg={cardBg} boxShadow="md">
                <CardHeader bg={headerBg} py={3}>
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <Heading size="md">Available Courses for Registration</Heading>
                         <Button
                            colorScheme="green"
                            leftIcon={<FaPlusSquare />}
                            size="sm"
                            onClick={handleEnrollment}
                            isLoading={isEnrolling}
                            isDisabled={selectedCoursesToEnroll.size === 0}
                        >
                            Enroll in Selected ({selectedCoursesToEnroll.size})
                        </Button>
                    </Flex>
                </CardHeader>
                <CardBody>
                    {allCourses.length > 0 ? (
                    <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                            <Th>Select</Th>
                            <Th>Code</Th>
                            <Th>Name</Th>
                            <Th>Credits</Th>
                            <Th>Description</Th>
                            <Th>Status</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {allCourses.map((course) => {
                            const isEnrolled = enrolledIdsSet.has(course.id);
                            const isSelected = selectedCoursesToEnroll.has(course.id);

                            return (
                                <Tr key={course.id} opacity={isEnrolled ? 0.6 : 1}>
                                <Td>
                                    <Checkbox
                                    isChecked={isSelected}
                                    isDisabled={isEnrolled}
                                    onChange={(e) => handleCourseSelectionChange(course.id, e.target.checked)}
                                    colorScheme="green"
                                    />
                                </Td>
                                <Td>{course.code}</Td>
                                <Td>{course.name}</Td>
                                <Td textAlign="center">{course.credit_hours ?? 'N/A'}</Td>
                                <Td whiteSpace="normal">{course.description || 'N/A'}</Td>
                                <Td>
                                    {isEnrolled ? (
                                    <Badge colorScheme="green" variant="solid">Enrolled</Badge>
                                    ) : (
                                    <Badge colorScheme="gray">Available</Badge>
                                    )}
                                </Td>
                                </Tr>
                            );
                            })}
                        </Tbody>
                        </Table>
                    </Box>
                    ) : (
                    <Text>No courses available for registration at this time.</Text>
                    )}
                </CardBody>
                </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </DashboardLayout>
  );
}

export default StudentDashboard; 