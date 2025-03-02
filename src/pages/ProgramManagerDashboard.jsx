import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

export default function ProgramManagerDashboard() {
  const { user } = useAuth();

  return (
    <Box p={4}>
      <Heading mb={4}>Program Manager Dashboard</Heading>
      <Text>Welcome, {user?.full_name || 'Program Manager'}</Text>
      {/* Add PM-specific components here */}
    </Box>
  );
} 