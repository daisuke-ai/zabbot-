import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseService';

function CustomLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting custom login for', email);

      // Check if user exists in directauth table
      const { data: authData, error: authError } = await supabase
        .from('directauth')
        .select('id, password')
        .eq('email', email)
        .single();

      if (authError) {
        console.error('Error retrieving user from directauth:', authError);
        throw new Error('Invalid email or password');
      }

      if (!authData) {
        throw new Error('User not found');
      }

      // Verify password directly (insecure, but simple for demonstration)
      if (authData.password !== password) {
        throw new Error('Invalid email or password');
      }

      console.log('Custom login successful for user ID:', authData.id);

      // Get user details from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.id)
        .single();

      if (userError) {
        console.error('Error retrieving user data:', userError);
        throw new Error('Error retrieving user data');
      }

      // Create a session object similar to what Supabase Auth would provide
      // This is a simplified approach and not secure for production
      const session = {
        user: {
          id: userData.id,
          email: userData.email,
          // Add other fields as needed
        },
        // Simplified access_token - not secure, just for demonstration
        access_token: 'direct_auth_' + Math.random().toString(36).slice(-10),
      };

      // Store session in localStorage (similar to what Supabase Auth does)
      localStorage.setItem('direct_auth_session', JSON.stringify(session));

      // Store user in localStorage
      localStorage.setItem('direct_auth_user', JSON.stringify(userData));

      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.email}!`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Redirect based on role
      if (userData.role === 'program_manager') {
        navigate('/pm-dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegularLogin = () => {
    navigate('/login');
  };

  return (
    <Container maxW="lg" py={{ base: 12, md: 24 }}>
      <Stack spacing={8}>
        <Stack align="center">
          <Heading fontSize="2xl">Custom Login for Program Managers</Heading>
          <Text fontSize="md" color="gray.600">
            This login is for Program Managers created through the HOD Portal
          </Text>
        </Stack>

        <Box rounded="lg" bg="white" boxShadow="lg" p={8}>
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle mr={2}>Login Failed!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <Stack spacing={4}>
              <FormControl id="email" isRequired>
                <FormLabel>Email address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>

              <FormControl id="password" isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                isLoading={loading}
                loadingText="Logging In"
                width="full"
                mt={4}
              >
                Sign In
              </Button>
            </Stack>
          </form>

          <Button
            variant="link"
            onClick={handleRegularLogin}
            mt={4}
            size="sm"
            width="full"
          >
            Use Regular Login
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

export default CustomLogin; 