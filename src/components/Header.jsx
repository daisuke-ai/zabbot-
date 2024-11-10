import React from 'react';
import { Box, Flex, Heading, Spacer, Button, HStack, Image } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <Box bg="white" py={4} px={8} boxShadow="md">
      <Flex alignItems="center" maxW="container.xl" mx="auto">
        <Flex alignItems="center">
          <Image 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwJFS_dbw5OC93W4rA4UY0_EIKZkhA9dU7Uw&s" 
            alt="SZABIST Logo" 
            height="100px"
            mr={4}
          />
          <Heading color="szabist.700" size="lg">SZABIST University Pakistan</Heading>
        </Flex>
        <Spacer />
        <HStack spacing={4}>
          <Button as={Link} to="/" variant="ghost" colorScheme="szabist">Home</Button>
          <Button as={Link} to="/about" variant="ghost" colorScheme="szabist">About</Button>
          <Button as={Link} to="/academics" variant="ghost" colorScheme="szabist">Academics</Button>
          <Button as={Link} to="/admissions" variant="ghost" colorScheme="szabist">Admissions</Button>
          <Button as={Link} to="/research" variant="ghost" colorScheme="szabist">Research</Button>
          <Button as={Link} to="/chatbot" colorScheme="szabist">AI Assistant</Button>
          <Button as={Link} to="/portal" variant="ghost" colorScheme="szabist">Portal</Button>
        </HStack>
      </Flex>
    </Box>
  );
}

export default Header;