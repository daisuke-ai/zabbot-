import React, { useState } from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Link as ChakraLink,
  Input,
  Button,
  Heading,
  useToast,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaYoutube, FaLinkedin } from 'react-icons/fa';
import emailjs from 'emailjs-com';

function Footer() {
  const [email, setEmail] = useState('');
  const toast = useToast();

  // A simple regex-based email validation
  const isValidEmail = (emailAddress) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailAddress.trim());
  };

  const handleSubscribe = (e) => {
    e.preventDefault();

    // Check if email is not empty
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check if email is valid
    if (!isValidEmail(email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Now proceed with sending the email
    emailjs
      .send(
        'service_gz1qrqr', // Your Service ID
        'template_13g4nsm', // Your Template ID
        { to_email: email }, // Matches {{to_email}} in your template
        '5rsOKGdYkY3SpKzqB' // Your Public Key (User ID)
      )
      .then(() => {
        toast({
          title: 'Success',
          description: 'You have successfully subscribed to the newsletter!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        setEmail('');
      })
      .catch((error) => {
        toast({
          title: 'Error',
          description: 'Failed to subscribe. Please try again later.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
  };

  return (
    <Box bg="szabist.900" color="white">
      <Container as={Stack} maxW={'6xl'} py={10}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={8}>
          {/* Navigation */}
          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>
              Navigation
            </Heading>
            <ChakraLink as={RouterLink} to="/">
              Home
            </ChakraLink>
            <ChakraLink as={RouterLink} to="/about">
              About Us
            </ChakraLink>
            <ChakraLink as={RouterLink} to="/blog">
              Blog
            </ChakraLink>
            <ChakraLink as={RouterLink} to="/portal">
              Portal
            </ChakraLink>
            <ChakraLink as={RouterLink} to="/chatbot">
              AI Assistant
            </ChakraLink>
          </Stack>

          {/* Support */}
          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>
              Support
            </Heading>
            <ChakraLink href="https://szabist-isb.edu.pk/" isExternal>
              Help Center
            </ChakraLink>
            <ChakraLink href="https://szabist-isb.edu.pk/contact/" isExternal>
              Safety Center
            </ChakraLink>
            <ChakraLink href="https://szabist-isb.edu.pk/faqs/" isExternal>
              Community Guidelines
            </ChakraLink>
          </Stack>

          {/* Newsletter Subscription */}
          <Stack align={'flex-start'}>
            <Heading as="h4" size="md" mb={3}>
              Stay up to date
            </Heading>
            <form onSubmit={handleSubscribe}>
              <Stack direction={'row'}>
                <Input
                  placeholder="Your email address"
                  bg="white"
                  color="gray.800"
                  border={0}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  _focus={{ bg: 'white' }}
                />
                <Button
                  type="submit"
                  bg="szabist.500"
                  color="white"
                  _hover={{ bg: 'szabist.600' }}
                >
                  Subscribe
                </Button>
              </Stack>
            </form>
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
          <Text>© 2025 SZABIST University. All rights reserved</Text>
          <Stack direction={'row'} spacing={6}>
            <ChakraLink
              href="https://www.facebook.com/SZABIST.Islamabad.Official/"
              isExternal
              _hover={{ color: 'szabist.500' }}
            >
              <FaFacebook size={20} />
            </ChakraLink>
            <ChakraLink
              href="https://twitter.com/szabistofficial"
              isExternal
              _hover={{ color: 'szabist.500' }}
            >
              <FaTwitter size={20} />
            </ChakraLink>
            <ChakraLink
              href="https://www.youtube.com/channel/UCk380f87fnnKe7yB7sHpwIA"
              isExternal
              _hover={{ color: 'szabist.500' }}
            >
              <FaYoutube size={20} />
            </ChakraLink>
            <ChakraLink
              href="https://www.linkedin.com/company/szabist-islamabad/"
              isExternal
              _hover={{ color: 'szabist.500' }}
            >
              <FaLinkedin size={20} />
            </ChakraLink>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default Footer;