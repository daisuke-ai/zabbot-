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
      // Check for admin credentials
      const isAdminLogin = email === 'ammarv67@gmail.com' && password === '12345678';
      
      if (isAdminLogin) {
        console.log('Admin login detected - special handling');
        
        // Set admin flag before login attempt
        localStorage.setItem('is_admin', 'true');
        
        try {
          // Normal Supabase login
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) {
            console.error('Error during admin login:', error);
            toast({
              title: 'Login Error',
              description: error.message,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            
            // Remove flag on error
            localStorage.removeItem('is_admin');
            setIsLoading(false);
            return;
          }
          
          console.log('Admin login successful, redirecting to admin tools');
          
          // Wait briefly for state updates to propagate
          setTimeout(() => {
            navigate('/admin-tools', { replace: true });
          }, 300);
          
          return;
        } catch (adminError) {
          console.error('Exception during admin login:', adminError);
          setIsLoading(false);
          return;
        }
      }
      
      // Regular login process for non-admin users
      // Login and let AuthContext handle user data
      console.log(`Attempting to login with email: ${email} and role: ${role}`);
      
      // Special handling for test accounts - use role from dropdown
      const isTestAccount = email.includes('@example.com') || email.includes('test');
      
      if (isTestAccount) {
        console.log('Test account detected, will apply selected role:', role);
      }
      
      const result = await login(email, password);
      
      // For test accounts, override the role if it doesn't match what was selected
      if (isTestAccount && result?.user && result.user.role !== role) {
        console.log(`Overriding role from ${result.user.role} to ${role} for test account`);
        // This won't update the context directly, but the useEffect will redirect correctly
        result.user.role = role;
      }
      
      // Log successful login and retrieved user
      console.log('Login successful, retrieved user:', result?.user);
      console.log('User role after login:', result?.user?.role);
      
      // Force redirect for HOD users with test accounts
      if (isTestAccount && (role === 'hod' || email.includes('hod'))) {
        console.log('HOD test account detected, redirecting to HOD portal directly');
        setTimeout(() => {
          navigate('/hod-portal', { replace: true });
        }, 100);
        return;
      }
      
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