import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Image, 
  SimpleGrid,
  Button,
  useColorModeValue,
  VStack,
  Spinner,
  Icon
} from '@chakra-ui/react';
import { Link, useParams } from 'react-router-dom';
import { createClient } from 'contentful';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { format } from 'date-fns';
import { FaArrowLeft } from 'react-icons/fa';
import '../styles/blog.css';

const client = createClient({
  space: import.meta.env.VITE_CONTENTFUL_SPACE_ID || '',
  accessToken: import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN || ''
});

function BlogPostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await client.getEntry(id, {
          include: 2,
        });
        setPost(response);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading || !post) {
    return (
      <Box minH="90vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="szabist.600" />
      </Box>
    );
  }

  return (
    <Box minH="90vh">
      <Container maxW="container.lg" py={16}>
        <Button 
          as={Link} 
          to="/blog" 
          colorScheme="szabist" 
          mb={8}
          leftIcon={<Icon as={FaArrowLeft} />}
        >
          Back to Blog
        </Button>

        <VStack spacing={8} align="stretch">
          {post.fields.featuredImage && (
            <Image
              src={post.fields.featuredImage.fields.file.url}
              alt={post.fields.title}
              borderRadius="xl"
              w="100%"
              h="400px"
              objectFit="cover"
            />
          )}

          <Heading size="2xl">{post.fields.title}</Heading>
          
          <Text color="gray.500">
            Published on {format(new Date(post.sys.createdAt), 'MMMM d, yyyy')}
          </Text>

          <Box className="blog-content">
            {documentToReactComponents(post.fields.content)}
          </Box>

          {post.fields.relatedBlogs && post.fields.relatedBlogs.length > 0 && (
            <Box mt={16}>
              <Heading size="xl" mb={8}>Related Posts</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                {post.fields.relatedBlogs.map((relatedPost) => (
                  <Link key={relatedPost.sys.id} to={`/blog/${relatedPost.sys.id}`}>
                    <Box
                      bg={cardBg}
                      p={6}
                      borderRadius="xl"
                      boxShadow="lg"
                      transition="all 0.3s"
                      _hover={{ transform: 'translateY(-4px)', shadow: '2xl' }}
                    >
                      <Heading size="md" mb={2}>{relatedPost.fields.title}</Heading>
                      <Text color="gray.500">
                        {format(new Date(relatedPost.sys.createdAt), 'MMMM d, yyyy')}
                      </Text>
                    </Box>
                  </Link>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

export default BlogPostPage; 