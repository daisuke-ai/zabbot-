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
  Select
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('student');
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login, user } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');

  // Redirect if already logged in
  useEffect(() => {
    console.log('Login useEffect - User state changed:', user);
    
    if (user) {
      console.log('Login useEffect - User role:', user.role);
      
      // Convert role to lowercase for case-insensitive comparison
      const userRole = user.role?.toLowerCase();
      console.log('Login useEffect - Normalized user role:', userRole);
      
      // Map of roles to their redirect paths
      const redirectMap = {
        'hod': '/hod-portal',
        'student': '/student-dashboard',
        'teacher': '/teacher-dashboard',
        'program_manager': '/pm-dashboard',
        'pm': '/pm-dashboard',
        'admin': '/admin-tools'
      };
      
      // Get the redirect path or default to home
      const redirectPath = redirectMap[userRole] || '/';
      
      console.log('Login useEffect - Redirecting to:', redirectPath);
      
      // Add a slight delay to ensure the AuthContext has fully updated
      setTimeout(() => {
        console.log('Login useEffect - Executing redirect now');
        navigate(redirectPath, { replace: true });
      }, 100);
    }
  }, [user, navigate]);

  // Clear admin flag on component mount
  useEffect(() => {
    console.log('Login page mounted - clearing admin flags');
    localStorage.removeItem('is_admin');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use the updated login function from AuthContext
      const user = await login(email, password);

      // Log successful login and retrieved user
      console.log('Login successful, retrieved user:', user);
      console.log('User role after login:', user.role);

      // Don't redirect here - it will happen in the useEffect
      console.log('Login successful, waiting for redirect...');
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: error.message,
        status: 'error',
        duration: 3000,
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
            <Text textAlign="center" color="gray.600">
              For demo, use: test@szabist.edu.pk / password
            </Text>
            <Text textAlign="center" mt={4}>
              Don't have an account?{' '}
              <Button 
                variant="link" 
                color="szabist.600" 
                onClick={() => navigate('/signup')}
              >
                Create Account
              </Button>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default Login;