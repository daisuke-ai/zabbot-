import React, { useState, useEffect } from 'react';
import { Box, Button, Text, VStack, Code, Heading } from '@chakra-ui/react';
import { supabase } from '../services/supabaseService';

function TestSupabase() {
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [envVars, setEnvVars] = useState({
    url: import.meta.env.VITE_SUPABASE_URL ? 'defined' : 'undefined',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'defined' : 'undefined'
  });

  const testConnection = async () => {
    setTestResult(null);
    setError(null);
    
    try {
      // Simple test query that doesn't require schema
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setError(error.message);
        return;
      }
      
      setTestResult({
        success: true,
        session: data.session ? 'Active session found' : 'No active session',
        data: JSON.stringify(data, null, 2)
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box p={8}>
      <VStack spacing={6} align="stretch">
        <Heading>Supabase Connection Test</Heading>
        
        <Box>
          <Text fontWeight="bold">Environment Variables:</Text>
          <Code p={2} borderRadius="md">
            VITE_SUPABASE_URL: {envVars.url}<br />
            VITE_SUPABASE_ANON_KEY: {envVars.key}
          </Code>
        </Box>
        
        <Button colorScheme="blue" onClick={testConnection}>
          Test Supabase Connection
        </Button>
        
        {error && (
          <Box p={4} bg="red.100" borderRadius="md">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}
        
        {testResult && (
          <Box p={4} bg="green.100" borderRadius="md">
            <Text fontWeight="bold">Success: {testResult.session}</Text>
            <Text fontSize="sm" mt={2}>Response Data:</Text>
            <Code p={2} fontSize="xs" overflowX="auto" display="block" whiteSpace="pre">
              {testResult.data}
            </Code>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

export default TestSupabase; 