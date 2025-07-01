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
  const borderColor = useColorModeValue('purple.600', 'purple.400'); // Set to vibrant purple
  const sidebarBg = useColorModeValue('purple.50', 'purple.900'); // Set to vibrant purple background
  
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
        borderColor={borderColor} // Apply new border color
        bg={bgColor}
        boxShadow="md" // Add shadow to header
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
        
        <Flex
          align="center"
          cursor="pointer"
          onClick={() => {
            const path = userRole === 'student' ? '/student-dashboard' :
                         userRole === 'Program Manager' ? '/pm-dashboard' :
                         userRole === 'HOD' ? '/hod-portal' : '/portal';
            navigate(path);
          }}
          _hover={{ opacity: 0.8 }}
        >
          <Text mr={2} display={{ base: 'none', md: 'block' }}>
            {user?.first_name} {user?.last_name || user?.email}
          </Text>
          <Avatar
            size="sm"
            name={user?.first_name || user?.last_name || user?.email}
          />
        </Flex>
      </Flex>

      <Flex>
        {/* Sidebar for desktop */}
        {!isMobile && (
          <Box
            as="nav"
            w="240px"
            h="calc(100vh - 60px)"
            bg={sidebarBg} // Apply new sidebar background
            p={4}
            borderRight="1px"
            borderColor={borderColor} // Apply new border color
            display={{ base: 'none', lg: 'block' }}
          >
            <VStack align="stretch" spacing={4}>
              {menuItems.map((item, index) => (
                <Button
                  key={index}
                  leftIcon={<Icon as={item.icon} />}
                  variant="ghost"
                  justifyContent="flex-start"
                  _hover={{ bg: `${roleColor}.100`, color: `${roleColor}.700` }} // Energetic hover effect
                  _active={{ bg: `${roleColor}.200` }} // Energetic active effect
                  borderRadius="md" // Slightly rounded buttons
                  onClick={item.onClick ? item.onClick : () => navigate(item.path)} // Ensure onClick is preserved
                >
                  {item.label}
                </Button>
              ))}\
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