import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Flex,
  Avatar,
  Spinner,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Center,
  HStack,
  useToast
} from '@chakra-ui/react';
import { chatService } from '../services/chatService';
import '../styles/blog.css';
import { FaMicrophone, FaStop, FaPaperPlane } from 'react-icons/fa';

function EnhancedChatbot({ inputText }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationFrameRef = useRef();
  const audioContextRef = useRef();
  const toast = useToast();

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (inputText) {
      setInputMessage(inputText);
    }
  }, [inputText]);
  
  useEffect(() => {
    // initial welcome message
    setMessages([
      {
        text: "Hello! I'm ZABBOT, your SZABIST University AI assistant. How can I help you today?",
        sender: 'bot',
        timestamp: new Date()
      },
    ]);
    
    // Clean up function to ensure we stop any recording on unmount
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Set up audio visualization if browser supports it
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 32;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = Math.max(...dataArray);
          setIsSpeaking(volume > 20); // Adjust threshold as needed
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      } catch (visualizerError) {
        console.warn('Audio visualization not supported:', visualizerError);
        // Fallback - just set speaking to true so user gets some feedback
        setIsSpeaking(true);
      }

      // Collect audio data
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      // Handle recording stop
      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsProcessingVoice(true);
          
          // Make sure we got some audio data
          if (audioChunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm; codecs=opus' 
          });
          
          // Make sure we have valid audio data
          if (audioBlob.size < 100) { // Arbitrary small size check
            throw new Error('Audio recording too short');
          }
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          // Show user message even before API call completes
          const tempUserMessageId = Date.now();
          setMessages(prev => [...prev, 
            { id: tempUserMessageId, text: "Processing your voice message...", sender: 'user', timestamp: new Date(), isTemp: true }
          ]);

          // Call the API
          const { transcription, response } = await chatService.transcribeAudio(formData);
          
          // Replace temporary message and add bot response
          setMessages(prev => [
            ...prev.filter(msg => msg.id !== tempUserMessageId),
            { text: transcription, sender: 'user', timestamp: new Date() },
            { text: response, sender: 'bot', timestamp: new Date() }
          ]);

          // Optional: Generate speech response
          try {
            const ttsAudio = await chatService.generateSpeech(response);
            if (ttsAudio && audioRef.current) {
              audioRef.current.src = ttsAudio;
              await audioRef.current.play();
            }
          } catch (ttsError) {
            console.warn('TTS playback failed:', ttsError);
            // Non-critical error, don't show to user
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          
          // Show an appropriate error message
          const errorMessage = error.message.includes('timed out') 
            ? "The request timed out. Please check your internet connection and try again."
            : "Voice processing failed. Please try again or type your question.";
          
          setMessages(prev => [...prev.filter(m => !m.isTemp), {
            text: errorMessage,
            sender: 'bot',
            timestamp: new Date(),
            isError: true
          }]);
          
          toast({
            title: "Voice Processing Failed",
            description: errorMessage,
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        } finally {
          // Clean up stream tracks
          stream.getTracks().forEach(track => track.stop());
          setIsProcessingVoice(false);
          
          // Clear audio data
          audioChunksRef.current = [];
        }
      };

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 10000); // 10 second maximum
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Check for permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice input.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Recording Failed",
          description: "Could not start recording. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      // Clean up audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(err => console.error('Error closing audio context:', err));
      }
      setIsSpeaking(false);
      
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMsg = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // Add user message immediately
      setMessages(prev => [...prev, {
        text: userMsg,
        sender: 'user',
        timestamp: new Date()
      }]);

      // Get bot response
      const response = await chatService.sendMessage(userMsg);
      
      // Add bot response
      setMessages(prev => [...prev, {
        text: response,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error:', error);
      
      let errorMessage = "Sorry, I'm having trouble connecting. Please try again.";
      
      if (error.message && error.message.includes('Network')) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      setMessages(prev => [...prev, {
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Box h="55vh" maxH="600px" w="full" maxW="2xl" mx="auto">
      <Box
        display="flex"
        flexDirection="column"
        h="full"
        overflow="hidden"
      >
        {/* Messages Container */}
        <Box
          ref={chatContainerRef}
          flex="1"
          overflowY="auto"
          p={4}
          className='no-scrollbar no-scrollbar::-webkit-scrollbar'
        >
          <VStack spacing={4} align="stretch">
            {messages.map((msg, index) => (
              <Flex
                key={index}
                justify={msg.sender === 'user' ? 'flex-end' : 'flex-start'}
                align="start"
                gap={2}
                opacity={msg.isTemp ? 0.7 : 1}
              >
                {msg.sender === 'bot' && (
                  <Avatar
                    size="sm"
                    name="ZABBOT"
                    bg="blue.600"
                    color="white"
                  />
                )}
                <Box
                  maxW="80%"
                  bg={msg.sender === 'user'
                    ? 'blue.500'
                    : msg.isError
                      ? 'red.50'
                      : 'gray.100'}
                  color={msg.sender === 'user'
                    ? 'white'
                    : msg.isError
                      ? 'red.800'
                      : 'black'}
                  p={3}
                  borderRadius="lg"
                  boxShadow="sm"
                >
                  <Text fontSize="sm" whiteSpace="pre-wrap">
                    {msg.text}
                  </Text>
                  <Text fontSize="xs" opacity={0.7} mt={1}>
                    {formatTimestamp(msg.timestamp)}
                  </Text>
                </Box>
                {msg.sender === 'user' && (
                  <Avatar
                    size="sm"
                    name="User"
                    bg="green.500"
                    color="white"
                  />
                )}
              </Flex>
            ))}
            {(isLoading || isProcessingVoice) && (
              <Flex align="center" p={2}>
                <Avatar
                  size="sm"
                  name="ZABBOT"
                  bg="blue.600"
                  color="white"
                  mr={2}
                />
                <Spinner size="sm" color="blue.600" />
              </Flex>
            )}
          </VStack>
        </Box>

        {/* Input Area */}
        <Box
          bg="white"
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          p={4}
          m={4}
          w={{ base: "90%", md: 800 }}
          shadow="2xl"
          position={'fixed'}
          bottom={4}
          left="48%"
          transform="translateX(-50%)"
        >
          <Flex direction={{ base: "column", md: "row" }} gap={2} w="full">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask ZABBOT anything about SZABIST..."
              size="md"
              p={{base: 2, md: 4}}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading || isProcessingVoice || isRecording}
              bg="white"
              flex="1"
            />
            <HStack spacing={2}>
              {/* Voice Recording Button */}
              <IconButton
                icon={isRecording ? <FaStop /> : <FaMicrophone />}
                onClick={isRecording ? stopRecording : startRecording}
                isRound
                size="md"
                colorScheme={isSpeaking ? "green" : isRecording ? "red" : "blue"}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                isDisabled={isLoading || isProcessingVoice}
                sx={{
                  ...(isSpeaking && {
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.1)' },
                      '100%': { transform: 'scale(1)' }
                    }
                  })
                }}
              />
              
              {/* Send Button */}
              <Button
                leftIcon={<FaPaperPlane />}
                onClick={sendMessage}
                isLoading={isLoading}
                loadingText="Sending..."
                size="md"
                px={4}
                isDisabled={!inputMessage.trim() || isLoading || isProcessingVoice || isRecording}
                colorScheme="blue"
              >
                Send
              </Button>
            </HStack>
          </Flex>
        </Box>

        {/* Audio element for TTS */}
        <audio
          ref={audioRef}
          onEnded={() => console.log('Audio playback completed')}
          onError={(e) => console.error('Audio playback error:', e)}
        />

        {/* Recording Modal */}
        <Modal isOpen={isRecording} onClose={stopRecording} isCentered>
          <ModalOverlay />
          <ModalContent bg="transparent" boxShadow="none">
            <ModalBody>
              <Center>
                <Box
                  animation={isSpeaking ? "pulse 0.5s infinite" : "pulse 1.5s infinite"}
                  p={4}
                  borderRadius="full"
                  bg="rgba(255, 255, 255, 0.9)"
                >
                  <FaMicrophone 
                    size="40px" 
                    color={isSpeaking ? "green" : "red"} 
                  />
                </Box>
              </Center>
              <Text
                textAlign="center"
                color="white"
                fontWeight="bold"
                mt={2}
                textShadow="0px 0px 3px rgba(0,0,0,0.8)"
              >
                {isSpeaking ? "Listening..." : "Waiting for speech..."}
              </Text>
              <Button 
                mt={4} 
                colorScheme="red" 
                onClick={stopRecording}
                mx="auto"
                display="block"
              >
                Done
              </Button>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
}

export default EnhancedChatbot;
