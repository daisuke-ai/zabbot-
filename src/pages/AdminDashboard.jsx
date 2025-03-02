import React, { useEffect } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  return (
    <Box p={4}>
      <Heading>Admin Console</Heading>
      {/* User management, system settings */}
    </Box>
  );
} 