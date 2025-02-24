import React, { useState } from 'react';
import { 
  Box, Container, Heading, VStack, FormControl, FormLabel, Input, Button, Text, useToast, useColorModeValue 
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student' // Default role
          }
        }
      });

      if (error) throw error;

      // Insert additional user data into public.users
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email,
          full_name: fullName,
          roll_number: rollNumber,
          role: 'student'
        }]);

      if (dbError) throw dbError;

      toast({
        title: 'Signup successful!',
        description: 'Please check your email to verify your account',
        status: 'success',
        duration: 5000,
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Signup Error',
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
        <Box bg={cardBg} p={8} borderRadius="xl" boxShadow="2xl">
          <VStack spacing={6} align="stretch">
            <Heading textAlign="center" color="szabist.700">Create Account</Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Full Name</FormLabel>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Roll Number</FormLabel>
                  <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
                </FormControl>
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
                <Button
                  type="submit"
                  colorScheme="szabist"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                >
                  Create Account
                </Button>
              </VStack>
            </form>
            <Text textAlign="center">
              Already have an account?{' '}
              <Button variant="link" color="szabist.600" onClick={() => navigate('/login')}>
                Login here
              </Button>
            </Text>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default Signup; 