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
  useToast,
  CircularProgress,
  CircularProgressLabel,
  Badge
} from '@chakra-ui/react';
import { chatService } from '../services/chatService';
import '../styles/blog.css';
import { FaMicrophone, FaStop, FaPaperPlane, FaVolumeMute } from 'react-icons/fa';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const recordingTimerRef = useRef(null);
  const MAX_RECORDING_TIME = 10; // in seconds
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

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
  }, [messages, streamingResponse]); // Also scroll when streaming response updates

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handlePlay = () => setIsPlaying(true);
      const handleEnded = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('pause', handlePause);
      
      return () => {
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('pause', handlePause);
      };
    }
  }, [audioRef.current]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);
    
    try {
      // Add user message immediately
      const userMessage = {
        text: inputMessage,
        sender: 'user',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      
      // Use regular non-streaming functionality since streaming isn't working properly
      const response = await chatService.sendMessage(userMessage.text);
      
      // Add bot response
      setMessages(prev => [...prev, {
        text: response,
        sender: 'bot',
        timestamp: new Date()
      }]);
      
      // Optional: Generate speech response
      try {
        const ttsAudio = await chatService.generateSpeech(response);
        if (ttsAudio && audioRef.current) {
          audioRef.current.src = ttsAudio;
          await audioRef.current.play();
        }
      } catch (error) {
        console.error('TTS error:', error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      setRecordingProgress(0);
      
      // Request microphone access with specific constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      // Check browser support for different audio formats
      let mimeType = 'audio/webm';
      
      // Create a MediaRecorder with supported format and good bitrate
      try {
        // Try to detect what formats are supported
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else {
          // Fall back to default
          console.warn('No preferred MIME type supported, using default');
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000
        });
        
        console.log(`Using MIME type: ${mimeType}`);
      } catch (recorderError) {
        console.warn('Error creating MediaRecorder with specific MIME type:', recorderError);
        // Fallback to default options
        mediaRecorderRef.current = new MediaRecorder(stream);
        console.log('Using default MediaRecorder');
      }
      
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

      // Collect audio data more frequently for better quality
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
          
          // Get the MIME type that was actually used
          const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          console.log(`Creating blob with MIME type: ${actualMimeType}`);
          
          // Create blob with the correct MIME type
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: actualMimeType
          });
          
          // Make sure we have valid audio data
          if (audioBlob.size < 100) { // Arbitrary small size check
            throw new Error('Audio recording too short');
          }
          
          console.log(`Audio blob created, size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          
          const formData = new FormData();
          const filename = `recording.${actualMimeType.includes('webm') ? 'webm' : actualMimeType.includes('mp4') ? 'm4a' : 'ogg'}`;
          formData.append('audio', audioBlob, filename);
          
          // Show a loading indicator for voice processing
          const tempUserMessageId = Date.now();
          setMessages(prev => [...prev, 
            { id: tempUserMessageId, text: "Processing your voice message...", sender: 'user', timestamp: new Date(), isTemp: true }
          ]);

          // Call the API with better error handling
          try {
            const { transcription, response } = await chatService.transcribeAudio(formData);
            
            // Check if we got valid responses
            if (!transcription) {
              throw new Error('No transcription returned from server');
            }
            
            console.log("Received transcription:", transcription);
            console.log("Received response:", response);
            
            // First, replace the temporary user message with the actual transcription
            setMessages(prev => prev.map(msg => 
              msg.id === tempUserMessageId
                ? { ...msg, id: undefined, text: transcription, isTemp: false }
                : msg
            ));
            
            // Then, after a small delay (to ensure UI updates in sequence), add the bot response
            setTimeout(() => {
              setMessages(prev => [...prev, 
                { text: response, sender: 'bot', timestamp: new Date() }
              ]);
              
              // Optional: Generate speech response
              try {
                const ttsAudio = chatService.generateSpeech(response)
                  .then(audioSrc => {
                    if (audioSrc && audioRef.current) {
                      audioRef.current.src = audioSrc;
                      audioRef.current.play().catch(err => console.warn('Audio playback failed:', err));
                    }
                  })
                  .catch(err => console.warn('TTS generation failed:', err));
              } catch (ttsError) {
                console.warn('TTS playback failed:', ttsError);
                // Non-critical error, don't show to user
              }
            }, 100);
            
          } catch (apiError) {
            console.error('API error during voice processing:', apiError);
            
            // Show error message and remove temporary message
            setMessages(prev => [
              ...prev.filter(msg => msg.id !== tempUserMessageId),
              { 
                text: "Sorry, I couldn't process your voice message. Please try again or type your question.", 
                sender: 'bot', 
                timestamp: new Date(),
                isError: true
              }
            ]);
            
            toast({
              title: "Voice Processing Failed",
              description: apiError.message || "Please try again or type your question",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          
          // Show an appropriate error message
          const errorMessage = error.message.includes('timed out') 
            ? "The request timed out. Please check your internet connection and try again."
            : "Voice processing failed. Please try again or type your question.";
          
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

      // Add the progress timer
      let secondsElapsed = 0;
      recordingTimerRef.current = setInterval(() => {
        secondsElapsed++;
        const progress = (secondsElapsed / MAX_RECORDING_TIME) * 100;
        setRecordingProgress(progress);
        
        if (secondsElapsed >= MAX_RECORDING_TIME) {
          stopRecording();
        }
      }, 1000);

      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Auto-stop after MAX_RECORDING_TIME seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, MAX_RECORDING_TIME * 1000);
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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setIsSpeaking(false);
      setRecordingProgress(0);
      
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const stopAudioPlayback = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Box h="65vh" maxH="700px" w="full" maxW="3xl" mx="auto" borderRadius="lg" boxShadow="lg" overflow="hidden">
      <Box
        display="flex"
        flexDirection="column"
        h="full"
        overflow="hidden"
        bgColor="white"
      >
        {/* Header */}
        <Box bg="gray.700" p={3} color="white">
          <Flex alignItems="center">
            <Avatar
              size="sm"
              name="ZABBOT"
              bg="blue.500"
              color="white"
              mr={2}
            />
            <Text fontWeight="bold">ZABBOT Assistant</Text>
            <Flex ml="auto">
              <Badge colorScheme="green" variant="subtle" px={2} py={1} borderRadius="full">Online</Badge>
            </Flex>
          </Flex>
        </Box>
        
        {/* Messages Container */}
        <Box
          flex="1"
          overflowY="auto"
          p={4}
          ref={chatContainerRef}
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c5c5c5',
              borderRadius: '24px',
            },
          }}
          bg="gray.50"
        >
          <VStack spacing={4} align="stretch">
            {messages.map((message, index) => (
              <Flex
                key={message.id || index}
                justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                mb={2}
              >
                {message.sender === 'bot' && (
                  <Avatar
                    size="sm"
                    name="ZABBOT"
                    bg="gray.700"
                    color="white"
                    mr={2}
                    alignSelf="flex-end"
                    mb={1}
                  />
                )}
                <Box
                  bg={message.sender === 'user' ? 'blue.600' : 'white'}
                  color={message.sender === 'user' ? 'white' : 'gray.800'}
                  borderRadius="lg"
                  p={3}
                  maxW="75%"
                  boxShadow="sm"
                  borderWidth={message.sender === 'bot' ? '1px' : '0'}
                  borderColor="gray.200"
                >
                  <Text fontWeight="medium" fontSize="sm">
                    {message.isTemp ? (
                      <Spinner size="sm" mr={2} color="gray.400" />
                    ) : message.isError ? (
                      <Text color="red.500">{message.text}</Text>
                    ) : message.text}
                  </Text>
                  <Text
                    fontSize="xs"
                    opacity={0.7}
                    textAlign="right"
                    mt={1}
                  >
                    {formatTimestamp(message.timestamp)}
                  </Text>
                </Box>
                {message.sender === 'user' && (
                  <Avatar
                    size="sm"
                    name="User"
                    bg="gray.500"
                    color="white"
                    ml={2}
                    alignSelf="flex-end"
                    mb={1}
                  />
                )}
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Input Area */}
        <Box
          bg="white"
          p={3}
          borderTop="1px"
          borderColor="gray.200"
        >
          <Flex gap={2} w="full">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask ZABBOT anything about SZABIST..."
              size="md"
              borderRadius="full"
              borderColor="gray.300"
              _hover={{ borderColor: "gray.400" }}
              _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)" }}
              disabled={isLoading || isProcessingVoice || isRecording}
              bg="white"
              flex="1"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <HStack spacing={2}>
              {/* Voice Recording Button with CircularProgress */}
              <Box position="relative">
                <CircularProgress
                  value={recordingProgress}
                  color="blue.400"
                  size="40px"
                  thickness="4px"
                  trackColor={isSpeaking ? "green.100" : "red.100"}
                  capIsRound
                  display={isRecording ? "block" : "none"}
                >
                  <CircularProgressLabel fontSize="xs" fontWeight="bold">
                    {Math.ceil((recordingProgress * MAX_RECORDING_TIME) / 100)}s
                  </CircularProgressLabel>
                </CircularProgress>
                
                <IconButton
                  icon={isRecording ? <FaStop /> : <FaMicrophone />}
                  onClick={isRecording ? stopRecording : startRecording}
                  isRound
                  size="md"
                  position={isRecording ? "absolute" : "static"}
                  top={isRecording ? "50%" : "auto"}
                  left={isRecording ? "50%" : "auto"}
                  transform={isRecording ? "translate(-50%, -50%)" : "none"}
                  colorScheme={isSpeaking ? "green" : isRecording ? "red" : "gray"}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                  isDisabled={isLoading || isProcessingVoice}
                  sx={{
                    ...(isSpeaking && {
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: isRecording ? 'translate(-50%, -50%) scale(1)' : 'scale(1)' },
                        '50%': { transform: isRecording ? 'translate(-50%, -50%) scale(1.1)' : 'scale(1.1)' },
                        '100%': { transform: isRecording ? 'translate(-50%, -50%) scale(1)' : 'scale(1)' }
                      }
                    })
                  }}
                />
                
                {/* Processing indicator */}
                {isProcessingVoice && (
                  <Badge 
                    position="absolute" 
                    top="-10px" 
                    right="-10px" 
                    colorScheme="orange" 
                    borderRadius="full" 
                    px={2}
                    fontSize="xs"
                  >
                    Processing...
                  </Badge>
                )}
              </Box>

              {/* Stop Audio Playback Button */}
              {isPlaying && (
                <IconButton
                  icon={<FaVolumeMute />}
                  onClick={stopAudioPlayback}
                  isRound
                  size="md"
                  colorScheme="teal"
                  aria-label="Stop audio playback"
                />
              )}
              
              {/* Send Button */}
              <IconButton
                icon={<FaPaperPlane />}
                onClick={sendMessage}
                isLoading={isLoading}
                isRound
                size="md"
                isDisabled={!inputMessage.trim() || isLoading || isProcessingVoice || isRecording}
                colorScheme="blue"
                aria-label="Send message"
              />
            </HStack>
          </Flex>
        </Box>

        {/* Audio element for TTS */}
        <audio
          ref={audioRef}
          onEnded={() => console.log('Audio playback completed')}
          onError={(e) => console.error('Audio playback error:', e)}
        />
      </Box>
    </Box>
  );
}

export default EnhancedChatbot;
