import React from 'react';
import { Box, Heading, Text, Container, Button, VStack, HStack, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';

function Admissions() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={4}>Admissions</Heading>
      <Text mb={8}>
        Join SZABIST and embark on a journey of academic excellence and personal growth. 
        We welcome applications from motivated individuals who are ready to challenge themselves 
        and make a positive impact on society.
      </Text>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="md" mb={4}>Application Process</Heading>
          <HStack spacing={4}>
            <Button colorScheme="blue">Apply Online</Button>
            <Button colorScheme="green">Download Application Form</Button>
          </HStack>
        </Box>
        <Box>
          <Heading size="md" mb={4}>Admission Requirements</Heading>
          <Accordion allowMultiple>
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Undergraduate Programs
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <Text>- Completed Higher Secondary School Certificate (HSSC) or equivalent</Text>
                <Text>- Minimum 60% marks in HSSC</Text>
                <Text>- Passing score on SZABIST Admission Test</Text>
              </AccordionPanel>
            </AccordionItem>
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    Graduate Programs
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <Text>- Completed Bachelor's degree or equivalent</Text>
                <Text>- Minimum 2.5 CGPA or 60% marks in last degree</Text>
                <Text>- Passing score on SZABIST Graduate Admission Test</Text>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      </VStack>
    </Container>
  );
}

export default Admissions;