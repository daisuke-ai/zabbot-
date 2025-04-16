import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Button,
  Text,
  Card,
  CardHeader,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  Flex,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaEdit, FaTrash, FaUserPlus, FaUsers } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { getDepartments } from '../services/supabaseService';

function AdminTools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.700');
  const toast = useToast();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'pm',
    departmentName: ''
  });

  const [editForm, setEditForm] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    departmentName: ''
  });

  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Verify user is logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch departments and users on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        // Fetch departments
        const depts = await getDepartments();
        setDepartments(depts);
        
        // Fetch PM and HOD users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .in('role', ['pm', 'hod'])
          .order('created_at', { ascending: false });
          
        if (userError) throw userError;
        setUsers(userData);
      } catch (error) {
        toast({
          title: 'Error loading data',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsDataLoading(false);
      }
    };
    
    fetchData();
  }, [toast]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.email || !formData.password || !formData.firstName || 
          !formData.lastName || !formData.departmentName) {
        throw new Error('All fields are required');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role
          }
        }
      });

      if (authError) throw authError;

      // Create user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role,
          department_name: formData.departmentName,
          user_id: authData.user.id
        })
        .select()
        .single();

      if (userError) throw userError;

      toast({
        title: 'Account created successfully!',
        description: `${formData.firstName} ${formData.lastName} has been added as ${formData.role.toUpperCase()}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'pm',
        departmentName: ''
      });
      
      // Refresh user list
      const { data: refreshedUsers, error: refreshError } = await supabase
        .from('users')
        .select('*')
        .in('role', ['pm', 'hod'])
        .order('created_at', { ascending: false });
        
      if (!refreshError) {
        setUsers(refreshedUsers);
      }

    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error creating account',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditForm({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      departmentName: user.department_name
    });
    onEditOpen();
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsEditLoading(true);
    
    try {
      // Validate form
      if (!editForm.firstName || !editForm.lastName || !editForm.departmentName) {
        throw new Error('All fields are required');
      }
      
      // Update user profile
      const { data, error } = await supabase
        .from('users')
        .update({
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          role: editForm.role,
          department_name: editForm.departmentName
        })
        .eq('id', editForm.id)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: 'Account updated successfully!',
        description: `${editForm.firstName} ${editForm.lastName}'s information has been updated`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh user list
      const { data: refreshedUsers, error: refreshError } = await supabase
        .from('users')
        .select('*')
        .in('role', ['pm', 'hod'])
        .order('created_at', { ascending: false });
        
      if (!refreshError) {
        setUsers(refreshedUsers);
      }
      
      onEditClose();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: 'Error updating account',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const openDeleteConfirm = (user) => {
    setUserToDelete(user);
    onDeleteOpen();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleteLoading(true);
    try {
      // First get the user_id to delete from auth
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('id', userToDelete.id)
        .single();
        
      if (userError) throw userError;
      
      // Delete from users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
        
      if (deleteError) throw deleteError;
      
      toast({
        title: 'Account deleted successfully!',
        description: `${userToDelete.first_name} ${userToDelete.last_name}'s account has been deleted`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Update users list
      setUsers(users.filter(u => u.id !== userToDelete.id));
      onDeleteClose();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error deleting account',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading>Admin Dashboard</Heading>
          <Button 
            colorScheme="red" 
            onClick={handleLogout}
            leftIcon={<FaSignOutAlt />}
          >
            Logout
          </Button>
        </Flex>

        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab fontWeight="semibold" leftIcon={<FaUsers />}>Manage Users</Tab>
            <Tab fontWeight="semibold" leftIcon={<FaUserPlus />}>Create New Account</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <Card>
                <CardHeader>
                  <Heading size="md">PM & HOD Accounts</Heading>
                </CardHeader>
                <CardBody>
                  {isDataLoading ? (
                    <Text>Loading users...</Text>
                  ) : users.length === 0 ? (
                    <Text>No PM or HOD accounts found</Text>
                  ) : (
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Department</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {users.map(user => (
                            <Tr key={user.id}>
                              <Td>{user.first_name} {user.last_name}</Td>
                              <Td>{user.email}</Td>
                              <Td>
                                <Badge colorScheme={user.role === 'pm' ? 'blue' : 'purple'}>
                                  {user.role === 'pm' ? 'Program Manager' : 'Head of Department'}
                                </Badge>
                              </Td>
                              <Td>{user.department_name}</Td>
                              <Td>
                                <Flex gap={2}>
                                  <IconButton
                                    aria-label="Edit user"
                                    icon={<FaEdit />}
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={() => handleEditUser(user)}
                                  />
                                  <IconButton
                                    aria-label="Delete user"
                                    icon={<FaTrash />}
                                    size="sm"
                                    colorScheme="red"
                                    onClick={() => openDeleteConfirm(user)}
                                  />
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
            
            <TabPanel>
              <Card>
                <CardHeader>
                  <Heading size="md">Create New Account</Heading>
                </CardHeader>
                <CardBody>
                  <form onSubmit={handleCreateAccount}>
                    <VStack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>First Name</FormLabel>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Last Name</FormLabel>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Role</FormLabel>
                        <Select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                          <option value="pm">Program Manager</option>
                          <option value="hod">Head of Department</option>
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>Department</FormLabel>
                        <Select
                          value={formData.departmentName}
                          onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept.name} value={dept.name}>{dept.name}</option>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        type="submit"
                        colorScheme="blue"
                        width="full"
                        isLoading={isLoading}
                      >
                        Create Account
                      </Button>
                    </VStack>
                  </form>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Edit User Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={editForm.email}
                  isReadOnly
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="pm">Program Manager</option>
                  <option value="hod">Head of Department</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Department</FormLabel>
                <Select
                  value={editForm.departmentName}
                  onChange={(e) => setEditForm({ ...editForm, departmentName: e.target.value })}
                >
                  {departments.map(dept => (
                    <option key={dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleUpdateUser}
              isLoading={isEditLoading}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {userToDelete?.first_name} {userToDelete?.last_name}? 
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteUser} 
                ml={3}
                isLoading={isDeleteLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}

export default AdminTools; 