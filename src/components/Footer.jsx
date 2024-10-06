import React from 'react';
import { Box, Container, SimpleGrid, Stack, Text, Link, Input, Button, Heading } from '@chakra-ui/react';

function Footer() {
  return (
    <Box bg="szabist.900" color="white">
      <Container as={Stack} maxW={'6xl'} py={10}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8}>
          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>Company</Heading>
            <Link href={'#'}>About Us</Link>
            <Link href={'#'}>Blog</Link>
            <Link href={'#'}>Careers</Link>
            <Link href={'#'}>Contact Us</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>Support</Heading>
            <Link href={'#'}>Help Center</Link>
            <Link href={'#'}>Safety Center</Link>
            <Link href={'#'}>Community Guidelines</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>Legal</Heading>
            <Link href={'#'}>Cookies Policy</Link>
            <Link href={'#'}>Privacy Policy</Link>
            <Link href={'#'}>Terms of Service</Link>
            <Link href={'#'}>Law Enforcement</Link>
          </Stack>

          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>Stay up to date</Heading>
            <Stack direction={'row'}>
              <Input
                placeholder={'Your email address'}
                bg="white"
                border={0}
                _focus={{
                  bg: 'whiteAlpha.300',
                }}
              />
              <Button bg="szabist.500" color="white" _hover={{ bg: 'szabist.600' }}>
                Subscribe
              </Button>
            </Stack>
          </Stack>
        </SimpleGrid>
      </Container>

      <Box borderTopWidth={1} borderStyle={'solid'} borderColor="szabist.700">
        <Container
          as={Stack}
          maxW={'6xl'}
          py={4}
          direction={{ base: 'column', md: 'row' }}
          spacing={4}
          justify={{ md: 'space-between' }}
          align={{ md: 'center' }}
        >
          <Text>© 2023 SZABIST Pakistan. All rights reserved</Text>
          <Stack direction={'row'} spacing={6}>
            <Link href={'#'}>Facebook</Link>
            <Link href={'#'}>Twitter</Link>
            <Link href={'#'}>YouTube</Link>
            <Link href={'#'}>Instagram</Link>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default Footer;