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
  CardHeader,
  Center,
  Alert,
  AlertIcon,
  AlertDescription,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Code,
  Spinner,
  Divider
} from '@chakra-ui/react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseService';
import { getUserByAuthId, getUserByEmail, determineUserRole } from '../services/userService';
import szabistLogo from '../public/images/images.png';

function Portal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [redirectDetails, setRedirectDetails] = useState(null);
  
  const navigate = useNavigate();
  const toast = useToast();
  const { user, userRole } = useAuth();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.500', 'red.400');
  const cardHeaderBg = useColorModeValue('red.50', 'gray.700');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // If user is already logged in, redirect to appropriate dashboard
  useEffect(() => {
    console.log("Portal useEffect - user state changed:", user, "role:", userRole);
    if (user) {
      setIsRedirecting(true);
      getUserRoleAndRedirect(user);
    }
  }, [user, userRole]);

  // Get user role from database and redirect accordingly
  const getUserRoleAndRedirect = async (user) => {
    try {
      console.log("Getting user role for:", user.email, "with ID:", user.id);
      setRedirectDetails({
        status: "Fetching user role from database",
        userId: user.id,
        email: user.email
      });
      
      // Use our new userService to safely get user data
      const dbUser = await getUserByAuthId(user.id) || await getUserByEmail(user.email);
      
      console.log("Retrieved user from database:", dbUser);
      
      setRedirectDetails(prev => ({ 
        ...prev, 
        foundUser: !!dbUser,
        dbUserRole: dbUser?.role
      }));
      
      // First try to use the role from context
      let role = userRole;
      
      // If no role in context, use from database
      if (!role && dbUser?.role) {
        console.log("Using role from database:", dbUser.role);
        role = dbUser.role;
        setRedirectDetails(prev => ({ ...prev, roleSource: "database", role }));
      }
      
      // If still no role, determine it from patterns
      if (!role) {
        // Use our service to determine role
        role = await determineUserRole(user);
        console.log("Determined user role from pattern:", role);
        setRedirectDetails(prev => ({ ...prev, roleSource: "pattern", role }));
      }
      
      // Special override for HOD emails
      if (user.email && (user.email.includes('hod') || user.email.includes('head'))) {
        role = 'hod';
        console.log("Special case: Forcing HOD role for email containing 'hod' or 'head'");
        setRedirectDetails(prev => ({ ...prev, roleSource: "forced_pattern", role }));
        
        // Set a flag for the HOD login flow
        localStorage.setItem('is_hod_login', 'true');
      }
      
      // If we have a role, navigate
      if (role) {
        setRedirectDetails(prev => ({ ...prev, status: "Role found, navigating", role }));
        navigateToDashboard(role);
      } else {
        console.error("Could not determine user role");
        setRedirectDetails(prev => ({ ...prev, status: "No role found", error: "Could not determine user role" }));
        navigate('/');
      }
    } catch (error) {
      console.error("Error in getUserRoleAndRedirect:", error);
      setRedirectDetails(prev => ({ ...prev, status: "Error", error: error.message }));
      
      // If we can't determine the role, try with the role from context
      if (userRole) {
        navigateToDashboard(userRole);
      } else {
        // Or use email pattern as last resort
        const fallbackRole = user.email?.includes('hod') ? 'hod' : 'student';
        navigateToDashboard(fallbackRole);
      }
    }
  };

  // Get dashboard URL for a role
  const getDashboardForRole = (role) => {
    console.log("Getting dashboard for role:", role);
    
    const roleMap = {
      'hod': '/hod-portal',
      'program_manager': '/pm-dashboard', 
      'teacher': '/teacher-dashboard',
      'student': '/student-dashboard',
      'admin': '/admin-tools'
    };
    
    // Normalize role for case-insensitive matching
    const normalizedRole = role?.toLowerCase();
    
    // Get dashboard path or default to home
    const dashboardPath = roleMap[normalizedRole] || '/';
    console.log("Dashboard path:", dashboardPath);
    
    setRedirectDetails(prev => ({ 
      ...prev, 
      normalizedRole,
      dashboardPath,
      mappedCorrectly: !!roleMap[normalizedRole]
    }));
    
    return dashboardPath;
  };
  
  // Navigate user to their role-specific dashboard
  const navigateToDashboard = (role) => {
    const dashboardPath = getDashboardForRole(role);
    console.log(`Redirecting user with role ${role} to ${dashboardPath}`);
    
    // Direct redirect for HOD users to ensure proper routing
    if (role && role.toLowerCase() === 'hod') {
      console.log("HOD role detected, using direct navigation to HOD portal");
      setRedirectDetails(prev => ({ ...prev, status: "HOD specific redirect" }));
      
      // Immediate redirect for HOD
      navigate('/hod-portal', { replace: true });
      setIsRedirecting(false);
      return;
    }
    
    // Add a small delay to ensure the navigation works
    setTimeout(() => {
      console.log(`Executing delayed redirect to ${dashboardPath}`);
      setRedirectDetails(prev => ({ ...prev, status: "Executing redirect now" }));
      navigate(dashboardPath, { replace: true });
      setIsRedirecting(false);
    }, 100);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setDebugInfo(null);
    
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Attempting login with:', email);
      
      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });
      
      if (error) {
        console.error('Login error:', error);
        setErrorMessage(error.message || 'Invalid email or password');
        
        // Get debug info about the user
        const { data: userCheck } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('email', email.trim())
          .maybeSingle();
        
        setDebugInfo({
          error: error.message,
          userExists: !!userCheck,
          userDetails: userCheck || 'No matching user record found'
        });
        
        setIsLoading(false);
        return;
      }
      
      console.log('Login successful, user:', data.user);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome to the Education Management System',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Special handling for HOD accounts - set a flag
      if (email.toLowerCase().includes('hod') || email.toLowerCase().includes('head')) {
        console.log('HOD account detected, setting local flag');
        localStorage.setItem('is_hod_login', 'true');
        
        // If redirect doesn't work via useEffect, force it here after a delay
        setTimeout(() => {
          if (document.location.pathname !== '/hod-portal') {
            console.log('Backup HOD redirect triggered');
            navigate('/hod-portal', { replace: true });
          }
        }, 1500);
      }
      
      // The useEffect will handle the redirection when user state updates
    } catch (error) {
      console.error('Login exception:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
      setIsLoading(false);
    }
  };

  // Add a debug button to show redirect info
  const toggleDebugInfo = () => {
    setDebugInfo(redirectDetails);
    onOpen();
  };

  return (
    <Box py={8}>
      {isRedirecting ? (
        <Center h="60vh">
          <VStack spacing={6}>
            <Spinner size="xl" color="red.500" thickness="4px" />
            <Text fontSize="lg">Redirecting to your dashboard...</Text>
            <Button 
              size="sm" 
              colorScheme="gray" 
              variant="outline" 
              onClick={toggleDebugInfo}
            >
              Debug Redirect
            </Button>
          </VStack>
        </Center>
      ) : (
        <Container maxW="md">
          <Center mb={8}>
            <Image
              src={szabistLogo}
              alt="University Logo"
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
            <CardHeader bg={cardHeaderBg} borderTopRadius="lg">
              <Heading as="h2" size="lg" textAlign="center">
                Education Management System
              </Heading>
            </CardHeader>
            <CardBody p={6}>
              {errorMessage && (
                <Alert status="error" mb={4} borderRadius="md">
                  <AlertIcon />
                  <AlertDescription>{errorMessage}</AlertDescription>
                  {debugInfo && (
                    <Button 
                      size="xs" 
                      ml="auto" 
                      colorScheme="red" 
                      onClick={onOpen}
                    >
                      Debug
                    </Button>
                  )}
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
                Your role will be determined based on your account settings
              </Text>
            </CardBody>
          </Card>
          
          <Center>
            <Button as={Link} to="/" variant="ghost" colorScheme="gray">
              Back to Homepage
            </Button>
          </Center>
        </Container>
      )}
      
      {/* Debug Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Debug Information</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text mb={3}>
              This information can help diagnose issues:
            </Text>
            {debugInfo && (
              <Box 
                bg="gray.50" 
                p={4} 
                borderRadius="md"
                fontFamily="monospace"
                fontSize="sm"
                overflowX="auto"
              >
                <Code display="block" whiteSpace="pre" p={2}>
                  {JSON.stringify(debugInfo, null, 2)}
                </Code>
              </Box>
            )}
            
            <Text mt={4} fontWeight="bold">
              Common issues:
            </Text>
            <VStack align="start" mt={2} spacing={2}>
              <Text>• Account might not exist in the auth system</Text>
              <Text>• User profile might be missing from the database</Text>
              <Text>• Role might not be correctly set in the database</Text>
              <Text>• Navigation might be intercepted by another component</Text>
            </VStack>
            
            <Divider my={4} />
            
            <Text fontWeight="bold">Quick Fixes:</Text>
            <VStack align="start" mt={2} spacing={3}>
              <Button 
                colorScheme="red" 
                size="sm" 
                onClick={() => {
                  navigate('/hod-portal', { replace: true });
                  onClose();
                }}
              >
                Go to HOD Portal
              </Button>
              
              <Button 
                colorScheme="orange" 
                size="sm" 
                onClick={() => {
                  navigate('/admin-tools', { replace: true });
                  onClose();
                }}
              >
                Go to Admin Tools
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default Portal;