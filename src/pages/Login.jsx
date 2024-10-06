import React, { useState } from 'react';
import { Box, Heading, Input, Button, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    // In a real app, you would validate credentials here
    if (username && password) {
      navigate('/portal');
    }
  };

  return (
    <Box maxWidth="400px" margin="auto" mt={8}>
      <Heading mb={4}>Login to Educational Portal</Heading>
      <VStack spacing={4}>
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button colorScheme="blue" onClick={handleLogin}>Login</Button>
      </VStack>
    </Box>
  );
}

export default Login;