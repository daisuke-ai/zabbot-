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
  HStack
} from '@chakra-ui/react';
import { chatService } from '../services/chatService';
import '../styles/blog.css';
import { FaMicrophone, FaStop, FaPaperPlane } from 'react-icons/fa';

function EnhancedChatbot({ inputText }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const animationFrameRef = useRef();
  const audioContextRef = useRef();

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
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Add audio visualization
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

      mediaRecorderRef.current.ondataavailable = (e) => { 
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm; codecs=opus' 
          });
          
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          // Show loading state for voice processing
          setIsLoading(true);
          
          const { transcription, response } = await chatService.transcribeAudio(formData);
          
          console.log('EnhancedChatbot.onstop: AI response text to display:', response);

          setMessages(prev => [...prev, 
            { text: transcription, sender: 'user', timestamp: new Date() },
            { text: response, sender: 'bot', timestamp: new Date() }
          ]);

          const ttsAudio = await chatService.generateSpeech(response);
          if (audioRef.current) {
            audioRef.current.src = ttsAudio;
            await audioRef.current.play();
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          setMessages(prev => [...prev, {
            text: "Voice processing failed. Please try again or type your question.",
            sender: 'bot',
            timestamp: new Date(),
            isError: true
          }]);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      // Clean up audio analysis
      cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsSpeaking(false);
      
      // Stop recording and clean up
      mediaRecorderRef.current.stop();
      audioChunksRef.current = []; // Reset audio chunks
      setIsRecording(false); // Ensure state update
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    setIsLoading(true);
    
    try {
      // Add user message immediately
      setMessages(prev => [...prev, {
        text: inputMessage,
        sender: 'user',
        timestamp: new Date()
      }]);

      // Get bot response
      const response = await chatService.sendMessage(inputMessage);
      
      console.log('EnhancedChatbot.sendMessage: AI response text to display:', response.response);

      // Add bot response
      setMessages(prev => [...prev, {
        text: response.response,
        sender: 'bot',
        timestamp: new Date()
      }]);

      // THEN THIS!
      const ttsAudio = await chatService.generateSpeech(response.response);
      if (audioRef.current) {
        audioRef.current.src = ttsAudio;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I'm having trouble connecting. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setInputMessage('');
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
            {isLoading && (
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

        {/* Input Area - Redesigned */}
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
              disabled={isLoading || isRecording}
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
                disabled={isLoading}
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
                disabled={!inputMessage.trim() || isLoading || isRecording}
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
          onEnded={() => setIsRecording(false)}
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