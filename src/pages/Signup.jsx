import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Heading, VStack, FormControl, FormLabel, Input, Button, Text, useToast, useColorModeValue,
  Select, Spinner
} from '@chakra-ui/react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    departmentName: '',
  });
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log('Fetching departments...');
        setIsFetchingDepartments(true);
        
        const { data, error } = await supabase
          .from('departments')
          .select('*');  // Select all columns to debug

        if (error) {
          console.error('Error fetching departments:', error);
          throw error;
        }
        
        console.log('Departments fetched:', data);
        setDepartments(data || []);
      } catch (error) {
        console.error('Department fetch error:', error);
        toast({
          title: 'Error loading departments',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsFetchingDepartments(false);
      }
    };

    fetchDepartments();
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email || 
          !formData.password || !formData.departmentName) {
        throw new Error('All fields are required');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'student'  // Default role for signups
          }
        }
      });

      if (authError) throw authError;

      // Create user profile with active = false
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'student',  // Default role for signups
          department_name: formData.departmentName,
          user_id: authData.user.id,
          active: false  // Set as inactive by default
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create notification for PM
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          notification: `New user signup: ${formData.firstName} ${formData.lastName} (${formData.email})`,
          student_id: userData.id
        });

      if (notifError) throw notifError;

      toast({
        title: 'Signup successful!',
        description: 'Your account is pending approval. You will be notified when your account is activated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        departmentName: '',
      });

      // Redirect to login after successful signup
      navigate('/login');

    } catch (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box bg="gray.50" minH="calc(100vh - 200px)" py={16}>
      <Container maxW="container.sm">
        <Box
          bg={cardBg}
          p={8}
          borderRadius="xl"
          boxShadow="2xl"
          transition="all 0.3s"
        >
          <VStack spacing={6} align="stretch">
            <Heading textAlign="center" color="szabist.700">Student Signup</Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@szabist.edu.pk"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Department</FormLabel>
                  {isFetchingDepartments ? (
                    <Box textAlign="center" py={2}>
                      <Spinner size="sm" mr={2} />
                      <Text display="inline">Loading departments...</Text>
                    </Box>
                  ) : (
                    <Select
                      name="departmentName"
                      value={formData.departmentName}
                      onChange={handleChange}
                      placeholder="Select department"
                    >
                      {departments && departments.length > 0 ? (
                        departments.map((dept) => (
                          <option key={dept.id || dept.name} value={dept.name}>
                            {dept.name}
                          </option>
                        ))
                      ) : (
                        <option disabled>No departments available</option>
                      )}
                    </Select>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="szabist"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  isDisabled={isFetchingDepartments || departments.length === 0}
                >
                  Sign Up
                </Button>
              </VStack>
            </form>

            <Box textAlign="center">
              <Text>Already have an account? <Link to="/login" color="szabist.500">Login here</Link></Text>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default Signup; 