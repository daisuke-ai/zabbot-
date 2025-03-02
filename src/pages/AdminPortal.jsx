import { useState, useEffect } from 'react';
import { 
  Box, Heading, FormControl, FormLabel, Input, Button, Select, 
  Table, Thead, Tbody, Tr, Th, Td, useToast, Tab, Tabs, TabList, TabPanels, TabPanel, 
  Flex, IconButton, AlertDialog, AlertDialogOverlay, AlertDialogContent, 
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useDisclosure
} from '@chakra-ui/react';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { supabase } from '../services/supabaseService';

export default function AdminPortal() {
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // User creation state
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'program_manager',
    program: ''
  });

  // New program state
  const [newProgram, setNewProgram] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const loadData = async () => {
      const [usersData, programsData, logsData] = await Promise.all([
        supabase.from('users').select(`
          id, email, role, created_at,
          user_roles!inner ( roles!inner ( name ) )
        `),
        supabase.from('programs').select('*'),
        supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      
      setUsers(usersData.data || []);
      setPrograms(programsData.data || []);
      setSystemLogs(logsData.data || []);
    };
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        email_confirm: true
      });

      if (error) throw error;

      // Update public users table
      await supabase.from('users').update({
        role: newUser.role
      }).eq('id', data.user.id);

      // Add role mapping
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('name', newUser.role)
        .single();

      await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role_id: roleData.id
      });

      // If program manager, add to program_managers table
      if (newUser.role === 'program_manager') {
        await supabase.from('program_managers').insert({
          user_id: data.user.id,
          program_name: newUser.program
        });
      }

      toast({
        title: 'User created successfully',
        status: 'success',
        duration: 5000
      });
      setNewUser({ email: '', role: 'program_manager', program: '' });
    } catch (error) {
      toast({
        title: 'Creation failed',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    }
  };

  // Delete user handler
  const handleDeleteUser = async (userId) => {
    try {
      await supabase.from('users').delete().eq('id', userId);
      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: 'User deleted successfully',
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  // Update user role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await supabase.from('users').update({ role: newRole }).eq('id', userId);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      toast({
        title: 'Role updated successfully',
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  // Add program
  const handleAddProgram = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('programs')
        .insert([newProgram])
        .select()
        .single();

      if (error) throw error;

      setPrograms([...programs, data]);
      setNewProgram({ name: '', description: '' });
      toast({
        title: 'Program added successfully',
        status: 'success',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Failed to add program',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  return (
    <Box p={8} maxW="1400px" mx="auto">
      <Heading mb={8}>Admin Dashboard</Heading>
      
      <Tabs variant="enclosed">
        <TabList>
          <Tab>User Management</Tab>
          <Tab>Programs</Tab>
          <Tab>System Logs</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Box mb={8}>
              <Heading size="lg" mb={4}>Create New User</Heading>
              <form onSubmit={handleCreateUser}>
                <Flex gap={4} mb={4}>
                  <FormControl flex="1">
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </FormControl>
                  
                  <FormControl flex="1">
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    >
                      <option value="program_manager">Program Manager</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </FormControl>

                  {newUser.role === 'program_manager' && (
                    <FormControl flex="1">
                      <FormLabel>Program</FormLabel>
                      <Select
                        value={newUser.program}
                        onChange={(e) => setNewUser({...newUser, program: e.target.value})}
                      >
                        {programs?.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Flex>
                <Button type="submit" colorScheme="blue">Create User</Button>
              </form>
            </Box>

            <Box>
              <Heading size="lg" mb={4}>User List</Heading>
              <Table variant="striped">
                <Thead>
                  <Tr>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map(user => (
                    <Tr key={user.id}>
                      <Td>{user.email}</Td>
                      <Td>
                        <Select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="program_manager">Program Manager</option>
                          <option value="admin">Administrator</option>
                        </Select>
                      </Td>
                      <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <IconButton
                          icon={<FaTrash />}
                          colorScheme="red"
                          onClick={() => {
                            setSelectedUser(user);
                            onOpen();
                          }}
                          aria-label="Delete user"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>

          <TabPanel>
            <Box mb={8}>
              <Heading size="lg" mb={4}>Add New Program</Heading>
              <form onSubmit={handleAddProgram}>
                <Flex gap={4} mb={4}>
                  <FormControl>
                    <FormLabel>Program Name</FormLabel>
                    <Input
                      value={newProgram.name}
                      onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={newProgram.description}
                      onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
                    />
                  </FormControl>
                  <Button type="submit" colorScheme="blue" alignSelf="flex-end">
                    Add Program
                  </Button>
                </Flex>
              </form>
            </Box>

            <Box>
              <Heading size="lg" mb={4}>Program List</Heading>
              <Table variant="striped">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Description</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {programs.map(program => (
                    <Tr key={program.id}>
                      <Td>{program.name}</Td>
                      <Td>{program.description}</Td>
                      <Td>
                        <IconButton
                          icon={<FaTrash />}
                          colorScheme="red"
                          onClick={() => handleDeleteProgram(program.id)}
                          aria-label="Delete program"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>

          <TabPanel>
            <Heading size="lg" mb={4}>System Logs</Heading>
            <Table variant="striped">
              <Thead>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Action</Th>
                  <Th>User</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <Tbody>
                {systemLogs.map(log => (
                  <Tr key={log.id}>
                    <Td>{new Date(log.created_at).toLocaleString()}</Td>
                    <Td>{log.action}</Td>
                    <Td>{log.user_email}</Td>
                    <Td>{log.details}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete User</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" ml={3} onClick={() => {
                handleDeleteUser(selectedUser.id);
                onClose();
              }}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 