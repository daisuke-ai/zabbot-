import React, { useState, useEffect } from "react";
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
  Progress,
  Spinner,
  Link,
  List,
  ListItem,
  ListIcon,
} from "@chakra-ui/react";
import {
  FaUniversity,
  FaUserTie,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaCalendarAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseService";

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
  const { user } = useAuth();
  const [departmentName, setDepartmentName] = useState('');
  const [pms, setPMs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [newPM, setNewPM] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [stats, setStats] = useState({ totalPMs: 0, totalTeachers: 0, totalStudents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    isOpen: isAddPmOpen,
    onOpen: onAddPmOpen,
    onClose: onAddPmClose,
  } = useDisclosure();

  const { isOpen: isCalendarOpen, onOpen: onCalendarOpen, onClose: onCalendarClose } = useDisclosure();

  const toast = useToast();

  // Colors
  const cardBg = useColorModeValue("white", "gray.700");
  const headerBg = useColorModeValue("red.50", "gray.800");
  const borderColor = useColorModeValue("red.500", "red.400");

  useEffect(() => {
    if (user) {
      fetchHodData();
    }
  }, [user]);

  const fetchHodData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch HOD's department name
      const { data: hodData, error: hodError } = await supabase
        .from('users')
        .select('department_name')
        .eq('id', user.id)
        .single();

      if (hodError || !hodData) {
        throw new Error(hodError?.message || 'HOD department not found.');
      }

      const deptName = hodData.department_name;
      setDepartmentName(deptName);

      // Fetch PMs in this department
      const { data: pmsData, error: pmsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, user_id')
        .eq('role', 'pm')
        .eq('department_name', deptName)
        .order('created_at', { ascending: false });

      if (pmsError) throw pmsError;
      setPMs(pmsData || []);

      // Fetch teachers in this department
      const { data: teachersData, error: teachersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("role", "teacher")
        .eq("department_name", deptName)
        .order('created_at', { ascending: false });

      if (teachersError) {
        toast({
          title: "Error fetching teachers",
          description: teachersError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw teachersError;
      }

      setTeachers(teachersData || []);

      // Fetch students in this department
      const { data: studentsData, error: studentsError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("role", "student")
        .eq("department_name", deptName)
        .order('created_at', { ascending: false });

      if (studentsError) {
        toast({
          title: "Error fetching students",
          description: studentsError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw studentsError;
      }

      setStudents(studentsData || []);

      // Update statistics based on fetched data
      setStats({
        totalPMs: pmsData?.length || 0,
        totalTeachers: teachersData?.length || 0,
        totalStudents: studentsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching HOD data:', error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setDepartmentName('');
      setPMs([]);
      setTeachers([]);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPM = () => {
    onAddPmOpen();
  };

  const handleCreatePM = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (
      !newPM.email ||
      !newPM.password ||
      !newPM.first_name ||
      !newPM.last_name
    ) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPM.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Password validation
    if (newPM.password.length < 6) {
      toast({
        title: "Weak password",
        description: "Password must be at least 6 characters long",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newPM.email,
        password: newPM.password,
        options: {
          data: {
            first_name: newPM.first_name,
            last_name: newPM.last_name,
            role: "pm",
          },
        },
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

      // Create user profile directly under the department
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          user_id: authData.user.id,
          email: newPM.email,
          first_name: newPM.first_name,
          last_name: newPM.last_name,
          role: "pm",
          department_name: departmentName,
        });

      if (userError) {
        toast({
          title: "Profile Creation Error",
          description: userError.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw userError;
      }

      toast({
        title: "Program Manager created",
        description: `${newPM.first_name} ${newPM.last_name} has been added to your department`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      // Reset form and refresh data
      setNewPM({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
      });

      onAddPmClose();
      fetchHodData();
    } catch (error) {
      console.error("Error creating PM:", error);
      toast({
        title: "Error creating Program Manager",
        description: error.message || "An unexpected error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add function to remove a PM from the department
  const handleRemovePM = async (pmUserId) => {
    if (!pmUserId) {
      toast({
        title: "Error",
        description: "PM User ID missing.",
        status: "error",
      });
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to remove this PM? This action is permanent."
      )
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Delete the user from the users table
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("user_id", pmUserId);

      if (error) {
        toast({
          title: "Error removing PM",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        throw error;
      }

      toast({
        title: "PM Removed",
        description: "Program Manager has been removed from your department",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      fetchHodData();
    } catch (error) {
      console.error("Error removing PM:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Menu items for the sidebar
  const menuItems = [
    { label: "Department Overview", icon: FaUniversity, path: "/hod-portal" },
    {
      label: "Program Managers",
      icon: FaUserTie,
      path: "/hod-portal/program-managers",
    },
    {
      label: "Teachers",
      icon: FaChalkboardTeacher,
      path: "/hod-portal/teachers",
    },
    { label: "Students", icon: FaUserGraduate, path: "/hod-portal/students" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout
        title={`HOD Dashboard (${departmentName || 'No Department'})`}
        menuItems={menuItems}
        userRole="HOD"
        roleColor="red"
      >
        <Flex justify="center" align="center" h="50vh">
          <Spinner size="xl" />
        </Flex>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`HOD Dashboard (${departmentName || 'No Department'})`}
      menuItems={menuItems}
      userRole="HOD"
      roleColor="red"
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
          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Program Managers</StatLabel>
                <StatNumber>{stats.totalPMs}</StatNumber>
                <StatHelpText>In Department</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Teachers</StatLabel>
                <StatNumber>{stats.totalTeachers}</StatNumber>
                <StatHelpText>In Department</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} boxShadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Students</StatLabel>
                <StatNumber>{stats.totalStudents}</StatNumber>
                <StatHelpText>In Department</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Department Members */}
        <Card
          bg={cardBg}
          boxShadow="md"
          borderTop="4px solid"
          borderColor={borderColor}
        >
          <CardHeader bg={headerBg} py={3}>
            <Flex align="center" justify="space-between">
              <Heading size="md">
                <Flex align="center">
                  <Icon as={FaUsers} mr={2} />
                  Department Staff
                </Flex>
              </Heading>
              <Button
                size="sm"
                colorScheme="red"
                leftIcon={<FaUserTie />}
                onClick={handleAddPM}
              >
                Add Program Manager
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="red" isLazy>
              <TabList>
                <Tab>Program Managers</Tab>
                <Tab>Teachers</Tab>
                <Tab>Students</Tab>
              </TabList>

              <TabPanels>
                {/* Program Managers Tab */}
                <TabPanel>
                  {pms.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {pms.map((pm) => (
                          <Tr key={pm.id}>
                            <Td>{`${pm.first_name} ${pm.last_name}`}</Td>
                            <Td>{pm.email}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <Button
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  leftIcon={<FaTrash />}
                                  onClick={() => handleRemovePM(pm.user_id)}
                                  isLoading={isSubmitting}
                                >
                                  Remove
                                </Button>
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>
                      No Program Managers assigned to this department yet.
                    </Text>
                  )}
                </TabPanel>

                {/* Teachers Tab */}
                <TabPanel>
                  {teachers.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {teachers.map((teacher) => (
                          <Tr key={teacher.id}>
                            <Td>{`${teacher.first_name} ${teacher.last_name}`}</Td>
                            <Td>{teacher.email}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No teachers found in this department.</Text>
                  )}
                </TabPanel>

                {/* Students Tab */}
                <TabPanel>
                  {students.length > 0 ? (
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Email</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {students.map((student) => (
                          <Tr key={student.id}>
                            <Td>{`${student.first_name} ${student.last_name}`}</Td>
                            <Td>{student.email}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text>No students enrolled in this department yet.</Text>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>

        {/* Classes List */}
        <Card
          bg={cardBg}
          boxShadow="md"
          borderTop="4px solid"
          borderColor={borderColor}
        >
          <CardHeader bg={headerBg} py={3}>
            <Flex align="center" justify="space-between">
              <Heading size="md">
                <Flex align="center">
                  <Icon as={FaUsers} mr={2} />
                  Department Classes
                </Flex>
              </Heading>
              <Button size="sm" colorScheme="red" leftIcon={<FaPlus />}>
                Add Class
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <Tabs colorScheme="red" isLazy>
              <TabList>
                <Tab>Active Classes</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <Text mb={4}>Total Classes: {stats.totalClasses}</Text>

                  {/* Placeholder for classes - in a real implementation, we would fetch and display classes */}
                  <Text>Class management functionality coming soon.</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>

      {/* Add Program Manager Modal */}
      <Modal isOpen={isAddPmOpen} onClose={onAddPmClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleCreatePM}>
          <ModalHeader>Add Program Manager</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={newPM.first_name}
                  onChange={(e) =>
                    setNewPM({ ...newPM, first_name: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={newPM.last_name}
                  onChange={(e) =>
                    setNewPM({ ...newPM, last_name: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={newPM.email}
                  onChange={(e) =>
                    setNewPM({ ...newPM, email: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={newPM.password}
                  onChange={(e) =>
                    setNewPM({ ...newPM, password: e.target.value })
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onAddPmClose} variant="ghost">
              Cancel
            </Button>
            <Button
              colorScheme="red"
              type="submit"
              isLoading={isSubmitting}
            >
              Create Program Manager
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