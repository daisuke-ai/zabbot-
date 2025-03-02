import { Center, Spinner, Text } from '@chakra-ui/react';

export default function LoadingSpinner() {
  return (
    <Center h="100vh" flexDirection="column" gap={4}>
      <Spinner size="xl" />
      <Text>Loading portal...</Text>
    </Center>
  );
} 