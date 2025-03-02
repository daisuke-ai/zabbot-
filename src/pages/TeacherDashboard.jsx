import React, { useEffect } from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();

  useEffect(() => {
    // Fetch data specific to the teacher
  }, [user]);

  return (
    <Box p={4}>
      <Heading>Teacher Portal</Heading>
      {/* Course management, grade submission */}
    </Box>
  );
} 