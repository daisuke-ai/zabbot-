import React from 'react';
import { 
  Box, 
  Flex, 
  Heading, 
  Button, 
  VStack, 
  Icon, 
  Text, 
  Spacer,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  useColorModeValue,
  useBreakpointValue,
  Badge,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast
} from '@chakra-ui/react';
import { FaHome, FaUserCircle, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DashboardLayout({ 
  children, 
  title = "Dashboard",
  menuItems = [],
  userRole = "user",
  roleColor = "blue" 
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  
  // Responsive sidebar
  const isMobile = useBreakpointValue({ base: true, lg: false });
  
  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('red.500', 'red.400');
  const sidebarBg = useColorModeValue('gray.50', 'gray.900');
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/portal');
    } catch (error) {
      console.error('Logout error:', error);
      // Add a toast notification for logout failure
      toast({ 
          title: 'Logout Failed',
          description: error.message || 'An error occurred during logout.',
          status: 'error',
          duration: 5000,
          isClosable: true,
      });
    }
  };
  
  const MobileSidebar = () => (
    <Drawer
      isOpen={isOpen}
      placement="left"
      onClose={onClose}
      size="xs"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" borderColor={borderColor}>
          {title}
        </DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={4} mt={4}>
            {menuItems.map((item, index) => (
              <Button
                key={index}
                leftIcon={<Icon as={item.icon} />}
                variant="ghost"
                justifyContent="flex-start"
                onClick={() => {
                  onClose();
                  item.onClick ? item.onClick() : navigate(item.path);
                }}
              >
                {item.label}
              </Button>
            ))}
            <Spacer />
            <Button
              leftIcon={<Icon as={FaSignOutAlt} />}
              colorScheme="red"
              variant="outline"
              onClick={handleLogout}
              mt={4}
            >
              Logout
            </Button>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
  
  return (
    <Box minH="100vh">
      {/* Top Navigation */}
      <Flex
        as="header"
        align="center"
        justify="space-between"
        w="100%"
        px={4}
        py={2}
        borderBottom="1px"
        borderColor={borderColor}
        bg={bgColor}
      >
        <Flex align="center">
          {isMobile && (
            <IconButton
              icon={<FaBars />}
              onClick={onOpen}
              variant="ghost"
              aria-label="Open Menu"
              mr={2}
            />
          )}
          <Heading size="md">{title}</Heading>
          <Badge ml={2} colorScheme={roleColor} variant="solid">
            {userRole}
          </Badge>
        </Flex>
        
        <Menu>
          <MenuButton
            as={Button}
            rounded="full"
            variant="link"
            cursor="pointer"
            minW={0}
          >
            <Flex align="center">
              <Text mr={2} display={{ base: 'none', md: 'block' }}>
                {user?.user_metadata?.first_name || user?.email}
              </Text>
              <Avatar
                size="sm"
                name={user?.user_metadata?.first_name || user?.email}
              />
            </Flex>
          </MenuButton>
          <MenuList>
            <MenuItem icon={<FaUserCircle />}>Profile</MenuItem>
            <MenuItem icon={<FaHome />} onClick={() => navigate('/')}>Home</MenuItem>
            <MenuItem icon={<FaSignOutAlt />} onClick={handleLogout}>Logout</MenuItem>
          </MenuList>
        </Menu>
      </Flex>

      <Flex>
        {/* Sidebar for desktop */}
        {!isMobile && (
          <Box
            as="nav"
            w="240px"
            h="calc(100vh - 60px)"
            bg={sidebarBg}
            p={4}
            borderRight="1px"
            borderColor="gray.200"
            display={{ base: 'none', lg: 'block' }}
          >
            <VStack align="stretch" spacing={4}>
              {menuItems.map((item, index) => (
                <Button
                  key={index}
                  leftIcon={<Icon as={item.icon} />}
                  variant="ghost"
                  justifyContent="flex-start"
                  onClick={item.onClick ? item.onClick : () => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
              <Spacer minH="20px" />
              <Button
                leftIcon={<Icon as={FaSignOutAlt} />}
                colorScheme="red"
                variant="outline"
                onClick={handleLogout}
                mt={4}
              >
                Logout
              </Button>
            </VStack>
          </Box>
        )}

        {/* Main Content */}
        <Box flex="1" p={4} overflowY="auto">
          {children}
        </Box>
      </Flex>
      
      {/* Mobile sidebar drawer */}
      {isMobile && <MobileSidebar />}
    </Box>
  );
}

export default DashboardLayout; 