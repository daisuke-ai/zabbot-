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
  useColorModeValue
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { getDepartments } from '../services/supabaseService';

function AdminTools() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('white', 'gray.700');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'pm',
    departmentName: ''
  });
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Verify admin role on mount
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You must be an admin to access this page',
        status: 'error',
        duration: 5000,
      });
      navigate('/admin-login');
    }
  }, [user, navigate, toast]);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
      } catch (error) {
        toast({
          title: 'Error loading departments',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      }
    };
    fetchDepartments();
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading>Admin Tools</Heading>
          <Button 
            colorScheme="red" 
            onClick={handleLogout}
            leftIcon={<FaSignOutAlt />}
          >
            Logout
          </Button>
        </Flex>

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
      </VStack>
    </Container>
  );
}

export default AdminTools; 