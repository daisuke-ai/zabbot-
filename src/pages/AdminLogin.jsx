import React, { useState } from 'react';
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
  Flex
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import szabistLogo from '../public/images/images.png';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const toast = useToast();
  const { login } = useAuth();  // Use the login function from AuthContext
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardHeaderBg = useColorModeValue('red.50', 'gray.700');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      // First, authenticate the user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      // Then fetch user role from users table using user_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', authData.user.id)  // Changed to use user_id
        .maybeSingle();

      if (userError) throw userError;

      // Verify admin role
      if (!userData) {
        await supabase.auth.signOut();
        throw new Error('User not found in database');
      }

      if (userData.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access restricted to admin users only');
      }

      toast({
        title: 'Admin Login Successful',
        description: 'Welcome to Admin Tools',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin-tools');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message || 'Login failed. Please try again.');
      toast({
        title: 'Login Error',
        description: error.message || 'Login failed. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <Center>
        <Card maxW="md" w="full" bg={cardBg} boxShadow="md">
          <CardHeader bg={cardHeaderBg} borderTopRadius="md">
            <Flex direction="column" align="center">
              <Image src={szabistLogo} alt="SZABIST Logo" maxW="150px" mb={4} />
              <Heading size="lg">Admin Login</Heading>
              <Text mt={2} color="gray.600">Access restricted to authorized personnel only</Text>
            </Flex>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@szabist.edu.pk"
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

                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  isLoading={isLoading}
                >
                  Login
                </Button>
              </VStack>
            </form>

            {errorMessage && (
              <Alert status="error" mt={4}>
                <AlertIcon />
                <Text>{errorMessage}</Text>
              </Alert>
            )}
          </CardBody>
        </Card>
      </Center>
    </Container>
  );
}

export default AdminLogin; 