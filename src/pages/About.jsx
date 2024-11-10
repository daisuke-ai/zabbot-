import React from 'react';
import { Box, Heading, Text, Container, Image, SimpleGrid, VStack } from '@chakra-ui/react';

function About() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={4}>About SZABIST University</Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
        <Box>
          <Text mb={4}>
            Shaheed Zulfikar Ali Bhutto Institute of Science and Technology (SZABIST University) is a highly ranked and
            fully chartered institute of Pakistan established through a Legislative Act of Sindh Assembly
            (Sindh Act No. XI of 1995). It is approved and recognized by the Higher Education Commission (HEC),
            Pakistan, as a degree-awarding institution.
          </Text>
          <Text mb={4}>
            All the programs offered at SZABIST University are consistent with the guidelines set by HEC and other
            regulatory bodies, for example, National Business Education Accreditation Council (NBEAC),
            and the National Computing Education Accreditation Council (NCEAC).
          </Text>
        </Box>
        <Box>
          <Image src="https://szabist-isb.edu.pk/wp-content/uploads/2020/05/356A8016-3.jpg" alt="SZABIST Campus" borderRadius="md" />
        </Box>
      </SimpleGrid>
      <Box mt={8}>
        <Heading size="lg" mb={4}>Our Impact</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          <VStack align="stretch">
            <Heading size="md" mb={2}>Powerful Alumni</Heading>
            <Text>
              SZABIST University is nurturing the intellect of more than 12,500 enrolled students through its five
              campuses located in Karachi, Hyderabad, Larkana, Islamabad and Dubai. Up till now, degrees
              have been awarded to almost 16,500 graduates. Our alumni are sought by national and multinational
              organizations and hold key positions in several reputable firms at national and international level.
            </Text>
          </VStack>
          <VStack align="stretch">
            <Heading size="md" mb={2}>Academic Excellence</Heading>
            <Text>
              SZABIST University is proud to offer education par excellence in the fields that are crucial for Pakistan's
              socio-economic development. Our commitment to quality education and research has made us one of
              the leading institutions in the country.
            </Text>
          </VStack>
        </SimpleGrid>
      </Box>
      <Box mt={8}>
        <Image src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80" alt="Students at SZABIST" borderRadius="md" w="100%" />
      </Box>
    </Container>
  );
}

export default About;