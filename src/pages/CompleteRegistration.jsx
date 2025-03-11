import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  FormHelperText,
  Progress,
  useColorModeValue,
  Spinner,
  Center,
  VStack
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabaseService';
import { WarningIcon, CheckCircleIcon } from '@chakra-ui/icons';

function CompleteRegistration() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('initializing'); // 'initializing', 'ready', 'success', 'error'
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    console.log("CompleteRegistration: Component mounted");
    
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");
    
    console.log("CompleteRegistration: URL parameters:", { type, accessTokenExists: !!accessToken });
    
    if (type === 'signup' && accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data, error }) => {
        if (error) {
          console.error("CompleteRegistration: Error setting session:", error);
          setVerificationStatus('error');
          setError("Failed to validate your email verification. Please try again or contact support.");
          return;
        }
        
        if (!data.session || !data.user) {
          console.error("CompleteRegistration: No session or user data");
          setVerificationStatus('error');
          setError("Could not retrieve your account information. Please try again.");
          return;
        }
        
        console.log("CompleteRegistration: Session set successfully, user:", data.user.email);
        setUserInfo(data.user);
        setVerifiedEmail(data.user.email);
        setVerificationStatus('ready');
      });
    } else {
      console.log("CompleteRegistration: Missing access token or wrong verification type");
      setVerificationStatus('error');
      setError("This link appears to be invalid or has expired. Please request a new verification email.");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError("");
    
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("CompleteRegistration: Updating password");
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }
      
      console.log("CompleteRegistration: Password updated successfully");
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        throw new Error("Could not retrieve user information");
      }
      
      console.log("CompleteRegistration: Current user:", userData.user.email);
      
      const { error: dbError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          pending_verification: false
        })
        .eq('id', userData.user.id);
      
      if (dbError) {
        console.error("CompleteRegistration: Error updating user verification status:", dbError);
      }
      
      try {
        const { error: pmError } = await supabase
          .from('program_managers')
          .update({
            status: 'active'
          })
          .eq('user_id', userData.user.id);
          
        if (pmError) {
          console.warn("Could not update program_manager status:", pmError.message);
        }
      } catch (pmErr) {
        console.warn("Error updating program_manager status:", pmErr.message);
      }
      
      setVerificationStatus('success');
      setIsPasswordSet(true);
      
      setTimeout(() => {
        console.log("CompleteRegistration: Redirecting to login");
        navigate("/login");
      }, 5000);
      
    } catch (error) {
      console.error("CompleteRegistration: Error during registration completion:", error);
      setError(error.message || "An unknown error occurred. Please try again.");
      setVerificationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case 'initializing':
        return (
          <Center p={8}>
            <Spinner size="xl" />
            <Text ml={4}>Verifying your email...</Text>
          </Center>
        );
        
      case 'error':
        return (
          <VStack spacing={4}>
            <WarningIcon boxSize="50px" color="red.500" />
            <Heading size="lg">Verification Failed</Heading>
            <Text color="red.500">{error}</Text>
            <Button colorScheme="blue" onClick={() => navigate("/login")}>
              Return to Login
            </Button>
          </VStack>
        );
        
      case 'success':
        return (
          <VStack spacing={4}>
            <CheckCircleIcon boxSize="50px" color="green.500" />
            <Heading size="lg">Registration Complete!</Heading>
            <Text>Your account has been verified and your password has been set successfully.</Text>
            <Text>You will be redirected to the login page in a few seconds...</Text>
            <Button colorScheme="blue" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </VStack>
        );
        
      default:
        return (
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Complete Your Registration</Heading>
              <Text>Your email {verifiedEmail} has been verified. Please set your password to complete the registration.</Text>
              
              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </InputRightElement>
                </InputGroup>
                <FormHelperText>
                  Password must be at least 8 characters
                </FormHelperText>
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isLoading}
                loadingText="Completing Registration..."
              >
                Complete Registration
              </Button>
            </VStack>
          </form>
        );
    }
  };

  return (
    <Box bg="gray.50" minH="calc(100vh - 200px)" py={16}>
      <Container maxW="container.sm">
        <Box
          bg={cardBg}
          p={8}
          borderRadius="xl"
          boxShadow="2xl"
          transition="all 0.3s"
        >
          <Heading textAlign="center" color="blue.700" mb={6}>
            Complete Your Registration
          </Heading>
          
          {renderContent()}
        </Box>
      </Container>
    </Box>
  );
}

export default CompleteRegistration; 