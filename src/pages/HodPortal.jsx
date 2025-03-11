import { useState, useEffect } from 'react';
import { 
  Box, Heading, FormControl, FormLabel, Input, Button, Select, 
  Table, Thead, Tbody, Tr, Th, Td, useToast, Tab, Tabs, TabList, TabPanels, TabPanel, 
  Flex, IconButton, AlertDialog, AlertDialogOverlay, AlertDialogContent, 
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useDisclosure, Text,
  Alert, AlertIcon, Badge, VStack, HStack, Container, Card, CardHeader, CardBody,
  Stat, StatLabel, StatNumber, StatHelpText, Divider, Grid, GridItem, useColorModeValue
} from '@chakra-ui/react';
import { FaTrash, FaEdit, FaEnvelope, FaUserPlus, FaGraduationCap, FaUniversity, FaChalkboardTeacher } from 'react-icons/fa';
import { supabase } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HodPortal() {
  console.log('HodPortal - Component rendering');
  
  const [users, setUsers] = useState([]);
  const [majors, setMajors] = useState([]);
  const [newMajor, setNewMajor] = useState({ name: '', code: '' });
  const [newPM, setNewPM] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    major: ''
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isAddMajorOpen, 
    onOpen: onAddMajorOpen, 
    onClose: onAddMajorClose 
  } = useDisclosure();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isMajorLoading, setIsMajorLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [departmentInfo, setDepartmentInfo] = useState(null);
  const [stats, setStats] = useState({
    pms: 0,
    majors: 0
  });
  const borderColor = useColorModeValue('red.500', 'red.400');
  const cardHeaderBg = useColorModeValue('red.50', 'gray.700');

  // Check if user is HOD
  useEffect(() => {
    console.log('HodPortal - User validation effect running');
    
    if (!user) {
      navigate('/login');
      return;
    }

    const userRole = user.role?.toLowerCase();
    const isHod = userRole === 'hod';
    const emailSuggestsHod = user.email?.includes('hod');
    
    // Accept any user with 'hod' in email or role for testing/development
    if (!isHod && !emailSuggestsHod) {
      toast({
        title: 'Access Denied',
        description: 'Only Heads of Department can access this portal.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
      return;
    }
    
    // Load department info, majors and users
    loadDepartmentInfo();
    loadMajors();
    loadUsers();
  }, [user, navigate, toast]);

  const loadDepartmentInfo = async () => {
    try {
      if (!user || !user.department_id) {
        console.error('User has no department ID');
        // Try to get department from email if possible
        if (user?.email?.includes('.')) {
          const deptCode = user.email.split('.')[1]?.split('@')[0]?.toUpperCase();
          console.log('Attempting to find department by code from email:', deptCode);
          
          if (deptCode) {
            const { data, error } = await supabase
              .from('departments')
              .select('*')
              .eq('code', deptCode)
              .single();
              
            if (data) {
              setDepartmentInfo(data);
              // Update user's department_id in database
              await supabase
                .from('users')
                .update({ department_id: data.id })
                .eq('id', user.id);
              return;
            }
          }
        }
        
        // Show alert that department needs to be set
        toast({
          title: 'Department Not Set',
          description: 'Your account is not associated with a department. Please contact the administrator.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      // Get department info
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', user.department_id)
        .single();
        
      if (error) throw error;
      
      setDepartmentInfo(data);
      console.log('Department info loaded:', data);
    } catch (error) {
      console.error('Error loading department info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load department information',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const loadMajors = async () => {
    try {
      setIsMajorLoading(true);
      
      if (!user?.department_id && !departmentInfo?.id) {
        console.log('Cannot load majors without department ID');
        return;
      }
      
      const departmentId = user?.department_id || departmentInfo?.id;
      console.log('Loading majors for department ID:', departmentId);
      
      const { data, error } = await supabase
        .from('majors')
        .select('*')
        .eq('department_id', departmentId)
        .order('name');
        
      if (error) throw error;
      
      console.log('Majors loaded:', data);
      setMajors(data || []);
      setStats(prev => ({ ...prev, majors: data?.length || 0 }));
    } catch (error) {
      console.error('Error loading majors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load majors',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMajorLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.department_id && !departmentInfo?.id) {
        console.log('Cannot load users without department ID');
        return;
      }
      
      const departmentId = user?.department_id || departmentInfo?.id;
      console.log('Loading users for department ID:', departmentId);
      
      // Get all users who are program managers in this department
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          majors:major_id (name, code)
        `)
        .eq('department_id', departmentId)
        .eq('role', 'program_manager')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log('Users loaded:', data);
      setUsers(data || []);
      setStats(prev => ({ ...prev, pms: data?.length || 0 }));
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMajor = async () => {
    try {
      setIsMajorLoading(true);
      
      if (!newMajor.name || !newMajor.code) {
        toast({
          title: 'Error',
          description: 'Please enter both major name and code',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      if (!departmentInfo?.id) {
        toast({
          title: 'Error',
          description: 'Department ID is required to create a major',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('majors')
        .insert([{
          name: newMajor.name,
          code: newMajor.code.toUpperCase(),
          department_id: departmentInfo.id
        }])
        .select();
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Major ${newMajor.name} created successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setNewMajor({ name: '', code: '' });
      loadMajors();
      onAddMajorClose();
    } catch (error) {
      console.error('Error creating major:', error);
      toast({
        title: 'Error',
        description: `Failed to create major: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsMajorLoading(false);
    }
  };

  const handleCreatePM = async (e) => {
    e.preventDefault();
    
    // Input validation
    if (!newPM.email || !newPM.password || !newPM.first_name || !newPM.last_name || !newPM.major) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (newPM.password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create the user directly using auth.signUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newPM.email,
        password: newPM.password,
        options: {
          data: {
            first_name: newPM.first_name,
            last_name: newPM.last_name
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (!data?.user?.id) {
        throw new Error('Failed to create user account');
      }
      
      // Add user to public.users table with role=program_manager
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: newPM.email,
          first_name: newPM.first_name,
          last_name: newPM.last_name,
          role: 'program_manager',
          department_id: departmentInfo.id,
          major_id: newPM.major,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        
      if (insertError) throw insertError;
      
      toast({
        title: 'Success',
        description: `Program Manager account created for ${newPM.first_name} ${newPM.last_name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form and reload users
      setNewPM({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        major: ''
      });
      
      loadUsers();
    } catch (error) {
      console.error('Error creating PM:', error);
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

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    onOpen();
  };

  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      
      // Delete from public.users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);
        
      if (deleteError) throw deleteError;
      
      // Also delete from auth.users if possible (requires admin privileges)
      try {
        await supabase.auth.admin.deleteUser(selectedUser.id);
      } catch (authError) {
        console.log('Could not delete from auth.users (requires admin privileges):', authError);
        // Continue anyway, as we've deleted from public.users
      }
      
      toast({
        title: 'Success',
        description: 'User deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      loadUsers();
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: `Failed to delete user: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="xl" mb={2}>Head of Department Portal</Heading>
      
      {departmentInfo ? (
        <Text fontSize="lg" mb={6} color="gray.600">
          Managing {departmentInfo.name} ({departmentInfo.code}) Department
        </Text>
      ) : (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <Text>Department information not available. Some features may be limited.</Text>
        </Alert>
      )}
      
      {/* Dashboard Stats */}
      <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(3, 1fr)" }} gap={6} mb={8}>
        <GridItem colSpan={1}>
          <Card boxShadow="md" borderRadius="lg">
            <CardBody>
              <Stat>
                <HStack>
                  <Box color="red.500">
                    <FaGraduationCap size="24px" />
                  </Box>
                  <StatLabel>Majors</StatLabel>
                </HStack>
                <StatNumber>{stats.majors}</StatNumber>
                <StatHelpText>Department Programs</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem colSpan={1}>
          <Card boxShadow="md" borderRadius="lg">
            <CardBody>
              <Stat>
                <HStack>
                  <Box color="red.500">
                    <FaChalkboardTeacher size="24px" />
                  </Box>
                  <StatLabel>Program Managers</StatLabel>
                </HStack>
                <StatNumber>{stats.pms}</StatNumber>
                <StatHelpText>Major Coordinators</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
      
      <Tabs colorScheme="red" variant="enclosed-colored" isFitted mb={8}>
        <TabList>
          <Tab fontWeight="semibold">
            <HStack>
              <FaUserPlus />
              <Text>Create Program Manager</Text>
            </HStack>
          </Tab>
          <Tab fontWeight="semibold">
            <HStack>
              <FaUniversity />
              <Text>Manage Majors</Text>
            </HStack>
          </Tab>
        </TabList>
        
        <TabPanels mt={4}>
          {/* Program Manager Creation Panel */}
          <TabPanel px={0}>
            <Flex direction={{ base: 'column', lg: 'row' }} gap={8}>
              {/* Create PM Form */}
              <Box flex="1">
                <Card 
                  boxShadow="md" 
                  borderRadius="lg"
                  borderTop="4px solid"
                  borderColor={borderColor}
                >
                  <CardHeader bg={cardHeaderBg} borderBottom="1px" borderColor="gray.200">
                    <Heading size="md">Create Program Manager</Heading>
                  </CardHeader>
                  <CardBody>
                    {!departmentInfo ? (
                      <Alert status="warning" mb={4}>
                        <AlertIcon />
                        <Text>You need to be associated with a department to create Program Managers.</Text>
                      </Alert>
                    ) : majors.length === 0 ? (
                      <Box>
                        <Alert status="warning" mb={4}>
                          <AlertIcon />
                          No majors found. Please create a major first.
                        </Alert>
                        <Button colorScheme="red" onClick={onAddMajorOpen} leftIcon={<FaUniversity />}>
                          Add Major
                        </Button>
                      </Box>
                    ) : (
                      <form onSubmit={handleCreatePM}>
                        <VStack spacing={4} align="stretch">
                          <FormControl isRequired>
                            <FormLabel>Major Program</FormLabel>
                            <Select 
                              placeholder="Select major"
                              value={newPM.major}
                              onChange={(e) => setNewPM({...newPM, major: e.target.value})}
                            >
                              {majors.map(major => (
                                <option key={major.id} value={major.id}>
                                  {major.name} ({major.code})
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          
                          <HStack>
                            <FormControl isRequired>
                              <FormLabel>First Name</FormLabel>
                              <Input 
                                value={newPM.first_name}
                                onChange={(e) => setNewPM({...newPM, first_name: e.target.value})}
                              />
                            </FormControl>
                            
                            <FormControl isRequired>
                              <FormLabel>Last Name</FormLabel>
                              <Input 
                                value={newPM.last_name}
                                onChange={(e) => setNewPM({...newPM, last_name: e.target.value})}
                              />
                            </FormControl>
                          </HStack>
                          
                          <FormControl isRequired>
                            <FormLabel>Email</FormLabel>
                            <Input 
                              type="email"
                              value={newPM.email}
                              onChange={(e) => setNewPM({...newPM, email: e.target.value})}
                              placeholder="e.g., pm.programname@szabist.edu.pk"
                            />
                          </FormControl>
                          
                          <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input 
                              type="password"
                              value={newPM.password}
                              onChange={(e) => setNewPM({...newPM, password: e.target.value})}
                            />
                            <Text fontSize="sm" color="gray.500">
                              Must be at least 8 characters
                            </Text>
                          </FormControl>
                          
                          <Button 
                            type="submit" 
                            colorScheme="red" 
                            isLoading={isLoading}
                            loadingText="Creating..."
                            mt={2}
                            size="lg"
                          >
                            Create Program Manager
                          </Button>
                        </VStack>
                      </form>
                    )}
                  </CardBody>
                </Card>
              </Box>
              
              {/* PM Users List */}
              <Box flex="1.5">
                <Card 
                  boxShadow="md" 
                  borderRadius="lg"
                  borderTop="4px solid"
                  borderColor={borderColor}
                >
                  <CardHeader bg={cardHeaderBg} borderBottom="1px" borderColor="gray.200">
                    <Heading size="md">Program Managers</Heading>
                  </CardHeader>
                  <CardBody>
                    {isLoading ? (
                      <Text>Loading program managers...</Text>
                    ) : users.length === 0 ? (
                      <Text>No program managers found.</Text>
                    ) : (
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Name</Th>
                              <Th>Email</Th>
                              <Th>Major</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {users.map(user => (
                              <Tr key={user.id}>
                                <Td>{user.first_name} {user.last_name}</Td>
                                <Td>{user.email}</Td>
                                <Td>
                                  {user.majors ? (
                                    <Badge colorScheme="red">{user.majors.name}</Badge>
                                  ) : (
                                    <Text color="gray.500">Not assigned</Text>
                                  )}
                                </Td>
                                <Td>
                                  <IconButton
                                    icon={<FaTrash />}
                                    colorScheme="red"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user)}
                                    aria-label="Delete User"
                                  />
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </CardBody>
                </Card>
              </Box>
            </Flex>
          </TabPanel>
          
          {/* Majors Management Panel */}
          <TabPanel px={0}>
            <Flex direction={{ base: 'column', lg: 'row' }} gap={8}>
              <Box flex="1">
                <Card 
                  boxShadow="md" 
                  borderRadius="lg"
                  borderTop="4px solid"
                  borderColor={borderColor}
                >
                  <CardHeader bg={cardHeaderBg} borderBottom="1px" borderColor="gray.200">
                    <Flex justify="space-between" align="center">
                      <Heading size="md">Majors</Heading>
                      <Button
                        size="sm"
                        colorScheme="red"
                        onClick={onAddMajorOpen}
                        leftIcon={<FaUniversity />}
                        isDisabled={!departmentInfo}
                      >
                        Add Major
                      </Button>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    {!departmentInfo ? (
                      <Alert status="warning">
                        <AlertIcon />
                        <Text>You need to be associated with a department to manage majors.</Text>
                      </Alert>
                    ) : isMajorLoading ? (
                      <Text>Loading majors...</Text>
                    ) : majors.length === 0 ? (
                      <Text>No majors found for your department.</Text>
                    ) : (
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Code</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {majors.map(major => (
                            <Tr key={major.id}>
                              <Td>{major.name}</Td>
                              <Td>
                                <Badge colorScheme="red">{major.code}</Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </CardBody>
                </Card>
              </Box>
            </Flex>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Confirmation Dialog for Deletion */}
      <AlertDialog isOpen={isOpen} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Program Manager
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {selectedUser?.first_name} {selectedUser?.last_name}? 
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isLoading}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      
      {/* Add Major Modal */}
      <AlertDialog isOpen={isAddMajorOpen} onClose={onAddMajorClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Add New Major
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Major Name</FormLabel>
                  <Input 
                    value={newMajor.name}
                    onChange={(e) => setNewMajor({...newMajor, name: e.target.value})}
                    placeholder="e.g., Computer Science"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Major Code</FormLabel>
                  <Input 
                    value={newMajor.code}
                    onChange={(e) => setNewMajor({...newMajor, code: e.target.value})}
                    placeholder="e.g., CS"
                    maxLength={5}
                  />
                </FormControl>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onAddMajorClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleAddMajor} 
                ml={3} 
                isLoading={isMajorLoading}
              >
                Add Major
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
} 