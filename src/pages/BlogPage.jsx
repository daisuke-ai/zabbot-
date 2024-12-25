import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  SimpleGrid, 
  Image, 
  VStack,
  useColorModeValue,
  Spinner
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { createClient } from 'contentful';
import { format } from 'date-fns';

const client = createClient({
  space: import.meta.env.VITE_CONTENTFUL_SPACE_ID || '',
  accessToken: import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN || ''
});

function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'universityBlog',
          order: '-fields.publishedDate',
          include: 2,
        });
        setPosts(response.items);
      } catch (err) {
        setError('Failed to load blog posts');
        console.error('Contentful Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <Box minH="90vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="szabist.600" />
      </Box>
    );
  }

  return (
    <Box minH="90vh">
      <Box bg="szabist.700" color="white" py={16}>
        <Container maxW="container.xl">
          <Heading size="2xl" mb={4}>SZABIST University Blog</Heading>
          <Text fontSize="xl">Latest news, research, and updates from our community</Text>
        </Container>
      </Box>

      <Container maxW="container.xl" py={16}>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {posts.map((post) => (
            <Link key={post.sys.id} to={`/blog/${post.sys.id}`}>
              <Box
                bg={cardBg}
                borderRadius="xl"
                overflow="hidden"
                boxShadow="lg"
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-4px)', shadow: '2xl' }}
              >
                {post.fields.featuredImage && (
                  <Image
                    src={post.fields.featuredImage.fields.file.url}
                    alt={post.fields.title}
                    h="200px"
                    w="100%"
                    objectFit="cover"
                  />
                )}
                <VStack align="stretch" p={6} spacing={3}>
                  <Heading size="md">{post.fields.title}</Heading>
                  <Text color="gray.500">
                    {format(new Date(post.fields.publishedDate), 'MMMM d, yyyy')}
                  </Text>
                </VStack>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default BlogPage; 