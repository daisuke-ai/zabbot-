import React from 'react';
import { 
  Box, 
  Container, 
  Flex, 
  HStack, 
  Button, 
  Image,
  useColorModeValue,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { HamburgerIcon } from '@chakra-ui/icons';
import szabistLogo from '../public/images/szabist-logo2.png';

function Header() {
  const navigate = useNavigate();
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('szabist.500', 'szabist.400');

  const handleNavigation = (path) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  const NavButton = ({ to, children, ...props }) => (
    <Button
      as={Link}
      to={to}
      variant="ghost"
      colorScheme="szabist"
      size="lg"
      fontWeight="500"
      px={4}
      fontFamily="'Poppins', sans-serif"
      fontSize="md"
      _hover={{
        bg: 'szabist.50',
        transform: 'translateY(-2px)',
        transition: 'all 0.2s'
      }}
      {...props}
    >
      {children}
    </Button>
  );

  return (
    <Box 
      bg={headerBg}
      py={2}
      position="sticky"
      top={0}
      zIndex={1000}
      boxShadow="lg"
      borderBottom="4px solid"
      borderColor={borderColor}
      transition="all 0.2s"
    >
      <Container maxW="container.xl">
        <Flex alignItems="center" height="80px" justify="space-between">
          <Link to="/">
            <Image
              src={szabistLogo}
              alt="SZABIST Logo"
              height="60px"
              objectFit="contain"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.05)' }}
              cursor="pointer"
            />
          </Link>

          {/* Desktop Navigation */}
          <HStack spacing={1} display={{ base: 'none', lg: 'flex' }}>
            <NavButton to="/about">About</NavButton>
            <NavButton to="/academics">Academics</NavButton>
            <NavButton to="/admissions">Admissions</NavButton>
            <NavButton to="/research">Research</NavButton>
            <NavButton to= "/blog">Blog</NavButton>
            
            <Button
              onClick={() => handleNavigation('/chatbot')}
              colorScheme="szabist"
              variant="solid"
              size="lg"
              fontWeight="500"
              px={6}
              bg="szabist.600"
              fontFamily="'Poppins', sans-serif"
              _hover={{ 
                bg: 'szabist.700',
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              leftIcon={
                <Box as="span" fontSize="1.3em" role="img" aria-label="AI">
                  🤖
                </Box>
              }
              transition="all 0.2s"
            >
              AI Assistant
            </Button>
            
            <Button
              as={Link}
              to="/portal"
              colorScheme="szabist"
              variant="solid"
              size="lg"
              fontWeight="500"
              px={6}
              fontFamily="'Poppins', sans-serif"
              _hover={{ 
                transform: 'translateY(-2px)',
                shadow: 'lg'
              }}
              transition="all 0.2s"
            >
              Portal
            </Button>
          </HStack>

          {/* Mobile Navigation */}
          <Box display={{ base: 'block', lg: 'none' }}>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<HamburgerIcon />}
                variant="ghost"
                aria-label="Navigation Menu"
                size="lg"
              />
              <MenuList>
                <MenuItem as={Link} to="/">Home</MenuItem>
                <MenuItem as={Link} to="/about">About</MenuItem>
                <MenuItem as={Link} to="/academics">Academics</MenuItem>
                <MenuItem as={Link} to="/admissions">Admissions</MenuItem>
                <MenuItem as={Link} to="/research">Research</MenuItem>
                <MenuItem as={Link} to="/blog">University Blog</MenuItem>
                <MenuItem as={Link} to="/chatbot">AI Assistant</MenuItem>
                <MenuItem as={Link} to="/portal">Portal</MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}

export default Header;