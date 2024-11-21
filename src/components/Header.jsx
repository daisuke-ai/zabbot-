import React from 'react';
import { Box, Flex, Heading, Spacer, Button, HStack, Image, Container } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  return (
    <Box 
      bg="white" 
      py={4}
      position="sticky" 
      top={0} 
      zIndex={1000} 
      boxShadow="lg"
      borderBottom="4px solid"
      borderColor="szabist.500"
    >
      <Container maxW="container.xl">
        <Flex alignItems="center" height="70px">
          <Link to="/" style={{ textDecoration: 'none' }} onClick={() => window.scrollTo(0, 0)}>
            <Heading 
              color="szabist.700" 
              size="xl"
              display={{ base: 'none', md: 'block' }}
              _hover={{ opacity: 0.9 }}
              cursor="pointer"
              fontWeight="bold"
              letterSpacing="tight"
            >
              SZABIST University
            </Heading>
          </Link>
          <Spacer />
          <HStack spacing={3}>
            <Button 
              onClick={() => handleNavigation('/')}
              variant="ghost" 
              colorScheme="szabist" 
              size="lg"
              fontWeight="500"
              px={4}
            >
              Home
            </Button>
            <Button 
              onClick={() => handleNavigation('/about')}
              variant="ghost" 
              colorScheme="szabist" 
              size="lg"
              fontWeight="500"
              px={4}
            >
              About
            </Button>
            <Button 
              onClick={() => handleNavigation('/academics')}
              variant="ghost" 
              colorScheme="szabist" 
              size="lg"
              fontWeight="500"
              px={4}
            >
              Academics
            </Button>
            <Button 
              onClick={() => handleNavigation('/admissions')}
              variant="ghost" 
              colorScheme="szabist" 
              size="lg"
              fontWeight="500"
              px={4}
            >
              Admissions
            </Button>
            <Button 
              onClick={() => handleNavigation('/research')}
              variant="ghost" 
              colorScheme="szabist" 
              size="lg"
              fontWeight="500"
              px={4}
            >
              Research
            </Button>
            <Button 
              onClick={() => handleNavigation('/portal')}
              colorScheme="szabist"
              variant="solid"
              size="lg"
              fontWeight="500"
              px={6}
              _hover={{ 
                transform: 'translateY(-2px)', 
                shadow: 'lg' 
              }}
              transition="all 0.2s"
            >
              Portal
            </Button>
            <Button 
              onClick={() => handleNavigation('/chatbot')}
              colorScheme="szabist"
              variant="solid"
              size="lg"
              fontWeight="500"
              px={6}
              bg="szabist.600"
              _hover={{ 
                bg: 'szabist.700',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              leftIcon={
                <Box 
                  as="span" 
                  fontSize="1.4em"
                  role="img" 
                  aria-label="AI"
                >
                  🤖
                </Box>
              }
              transition="all 0.2s"
            >
              ZABBOT
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}

export default Header;