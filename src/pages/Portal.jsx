import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  VStack, 
  FormControl, 
  FormLabel, 
  Input, 
  Button, 
  Text, 
  useToast,
  useColorModeValue,
  Image,
  Card,
  CardBody,
  CardHeader,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  Flex,
  Select
} from '@chakra-ui/react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import szabistLogo from '../public/images/images.png';

function Portal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const toast = useToast();
  const { user, login } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardHeaderBg = useColorModeValue('red.50', 'gray.700');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const userRole = user.role?.toLowerCase();
      const redirectMap = {
        'hod': '/hod-portal',
        'student': '/student-dashboard',
        'teacher': '/teacher-dashboard',
        'program_manager': '/pm-dashboard',
        'pm': '/pm-dashboard',
        'admin': '/admin-tools'
      };
      const redirectPath = redirectMap[userRole] || '/';
      setTimeout(() => navigate(redirectPath, { replace: true }), 100);
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Get user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      if (userError) throw userError;

      // Redirect based on role
      const redirectMap = {
        'hod': '/hod-portal',
        'student': '/student-dashboard',
        'teacher': '/teacher-dashboard',
        'program_manager': '/pm-dashboard',
        'pm': '/pm-dashboard',
        'admin': '/admin-tools'
      };

      const redirectPath = redirectMap[userData.role.toLowerCase()] || '/';
      navigate(redirectPath);

    } catch (error) {
      setErrorMessage(error.message);
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
            <Heading textAlign="center" color="szabist.700">Login to Portal</Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@szabist.edu.pk"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormControl>
                <Select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Select role"
                >
                  <option value='student'>Student</option>
                  <option value='teacher'>Teacher</option>
                  <option value='program_manager'>Program Manager</option>
                  <option value='hod'>Head of Department</option>
                </Select>
                <Button
                  type="submit"
                  colorScheme="szabist"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                >
                  Login
                </Button>
              </VStack>
            </form>

            <Text textAlign="center" mt={4}>
              Don't have an account?{' '}
              <Button
                as={Link}
                to="/signup"
                variant="link"
                colorScheme="blue"
              >
                Sign Up
              </Button>
            </Text>

            {errorMessage && (
              <Alert status="error" mt={4}>
                <AlertIcon />
                <Text>{errorMessage}</Text>
              </Alert>
            )}
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default Portal;