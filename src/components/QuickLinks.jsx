import React from 'react';
import { Box, SimpleGrid, VStack, Text, Icon, Link } from '@chakra-ui/react';
import { FaGraduationCap, FaBook, FaChartBar, FaUsers } from 'react-icons/fa';
import { BsBuilding } from 'react-icons/bs';

const QuickLinkItem = ({ icon, text, href }) => (
  <Link href={href} _hover={{ textDecoration: 'none' }}>
    <VStack>
      <Icon as={icon} w={10} h={10} />
      <Text fontWeight="bold">{text}</Text>
    </VStack>
  </Link>
);

function QuickLinks() {
  return (
    <Box py={8}>
      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={8}>
        <QuickLinkItem icon={BsBuilding} text="University Life" href="#" />
        <QuickLinkItem icon={FaGraduationCap} text="Academics" href="/academics" />
        <QuickLinkItem icon={FaBook} text="Library" href="#" />
        <QuickLinkItem icon={FaChartBar} text="IR/QEC" href="#" />
        <QuickLinkItem icon={FaUsers} text="EDC" href="#" />
      </SimpleGrid>
    </Box>
  );
}

export default QuickLinks;