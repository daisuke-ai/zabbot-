import React, { useAuth } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import Portal from './Portal';

export default function StudentDashboard() {
  const { user } = useAuth();
  // Uses existing Portal.jsx implementation
  return <Portal />;
} 