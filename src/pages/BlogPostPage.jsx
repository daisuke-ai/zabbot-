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
            Published on {format(new Date(post.fields.publishedDate), 'MMMM d, yyyy')}
          </Text>

          <Box className="blog-content">
            {documentToReactComponents(post.fields.content)}
          </Box>

          {/* Rest of the component stays the same as in your original code */}
        </VStack>
      </Container>
    </Box>
  );
}

export default BlogPostPage; 