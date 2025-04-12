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

      // 1. Authenticate user
      // Use login from context if it handles signin, otherwise use direct supabase call
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      // Or if using context: const { data: authData, error: authError } = await login(email, password);

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed.');

      // 2. Fetch user details including role and active status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, active') // Select role and active status
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (userError) throw userError;

      // 3. Check if user exists in the users table
      if (!userData) {
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact support.');
      }

      // --- Refined Check ---
      // 4. Check active status ONLY IF the user is a student
      if (userData.role === 'student') {
        if (userData.active === false) {
          // Specific case: Student is inactive
          await supabase.auth.signOut();
          throw new Error('Your account is pending approval. Please wait or contact support.');
        }
        // If student and active is true (or null/undefined), proceed normally
      }
      // --- End Refined Check ---

      // 5. Proceed with role-based navigation for:
      //    - Active students
      //    - All other roles (regardless of active status)
      toast({
        title: 'Login Successful',
        description: `Redirecting to ${userData.role} dashboard...`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      // Redirect based on role
      switch (userData.role) {
        case 'admin':
          navigate('/admin-tools');
          break;
        case 'hod':
          navigate('/hod-portal');
          break;
        case 'pm':
          navigate('/pm-dashboard');
          break;
        case 'teacher':
          navigate('/teacher-dashboard');
          break;
        case 'student':
          // Students reaching here are confirmed active
          navigate('/student-dashboard');
          break;
        default:
          await supabase.auth.signOut();
          throw new Error('Unknown user role.');
      }

    } catch (error) {
      console.error('Login error:', error);
      let displayMessage = error.message || 'Login failed. Please check credentials.';
      if (error.message === 'Invalid login credentials') {
        displayMessage = 'Invalid email or password.';
      }
      setErrorMessage(displayMessage);

      const isPendingApproval = displayMessage.includes('pending approval');
      toast({
        title: isPendingApproval ? 'Login Denied' : 'Login Error',
        description: displayMessage,
        status: isPendingApproval ? 'warning' : 'error',
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