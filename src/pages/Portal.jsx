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
  Center,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import szabistLogo from '../public/images/images.png';

function Portal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.500', 'red.400');

  // If user is already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (user) {
      const userRole = determineUserRole(user);
      navigate(getDashboardForRole(userRole));
    }
  }, [user, navigate]);

  // Helper function to determine user role from email or metadata
  const determineUserRole = (user) => {
    // Try to get role from user metadata
    if (user.user_metadata?.role) {
      return user.user_metadata.role;
    }
    
    // Otherwise try email pattern
    if (user.email) {
      const email = user.email.toLowerCase();
      
      if (email.includes('hod') || email.includes('head')) {
        return 'hod';
      } else if (email.includes('pm') || email.includes('program_manager')) {
        return 'program_manager';
      } else if (email.includes('teacher') || email.includes('faculty')) {
        return 'teacher';
      } else if (email.includes('student')) {
        return 'student';
      }
    }
    
    // Default role
    return 'student';
  };

  // Get dashboard URL for a role
  const getDashboardForRole = (role) => {
    const roleMap = {
      'hod': '/hod-portal',
      'program_manager': '/pm-dashboard', 
      'teacher': '/teacher-dashboard',
      'student': '/student-dashboard'
    };
    
    return roleMap[role.toLowerCase()] || '/';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simplified login approach
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });
      
      if (error) {
        console.error('Login error:', error);
        setErrorMessage(error.message || 'Invalid email or password');
        setIsLoading(false);
        return;
      }
      
      toast({
        title: 'Login Successful',
        description: 'Redirecting to your dashboard...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Redirect will be handled by useEffect when user state updates
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
      setIsLoading(false);
    }
  };

  return (
    <Box py={8}>
      <Container maxW="md">
        <Center mb={8}>
          <Image
            src={szabistLogo}
            alt="SZABIST Logo"
            height="120px"
            objectFit="contain"
          />
        </Center>
        
        <Card 
          bgColor={cardBg} 
          boxShadow="lg" 
          borderRadius="lg"
          borderTop="4px solid"
          borderColor={borderColor}
          mb={6}
        >
          <CardBody p={6}>
            <Heading as="h1" size="xl" textAlign="center" mb={6}>
              University Portal
            </Heading>
            
            {errorMessage && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin}>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Email Address</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    size="lg"
                  />
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    size="lg"
                  />
                </FormControl>
                
                <Button
                  type="submit"
                  colorScheme="red"
                  size="lg"
                  width="100%"
                  mt={2}
                  isLoading={isLoading}
                  loadingText="Logging in..."
                >
                  Sign In
                </Button>
              </VStack>
            </form>
            
            <Text mt={4} fontSize="sm" color="gray.500" textAlign="center">
              Your role will be determined based on your email address
            </Text>
          </CardBody>
        </Card>
        
        <Center>
          <Button as={Link} to="/" variant="ghost" colorScheme="gray">
            Back to Homepage
          </Button>
        </Center>
      </Container>
    </Box>
  );
}

export default Portal;