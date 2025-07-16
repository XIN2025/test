import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    Input,
    Button,
    Text,
    Flex,
    IconButton,
    useColorModeValue,
    Collapse,
    Badge,
    Divider,
    HStack,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
} from '@chakra-ui/react';
import { FiSend, FiChevronDown, FiChevronUp, FiInfo, FiUpload } from 'react-icons/fi';
import type { Message } from '../types';
import axios from 'axios';

interface ChatProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
    onUploadSuccess: () => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, onUploadSuccess }) => {
    const [input, setInput] = useState('');
    const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const userMessageBg = useColorModeValue('blue.100', 'blue.900');
    const assistantMessageBg = useColorModeValue('green.100', 'green.900');
    const contextBg = useColorModeValue('gray.100', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const contextTextColor = useColorModeValue('gray.600', 'gray.300');
    const badgeBg = useColorModeValue('blue.500', 'blue.200');
    const badgeColor = useColorModeValue('white', 'gray.800');
    const modalBg = useColorModeValue('white', 'gray.800');
    const progressTrackBg = useColorModeValue('gray.100', 'gray.700');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    const toggleContext = (messageId: string) => {
        setExpandedMessage(expandedMessage === messageId ? null : messageId);
    };

    const handleUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsUploading(true);
            setUploadProgress(0);

            const response = await axios.post(
                'http://localhost:8000/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = progressEvent.total
                            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                            : 0;
                        setUploadProgress(progress);
                    },
                }
            );

            alert(`Upload successful! Processed ${response.data.entities} entities and ${response.data.relationships} relationships`);
            onUploadSuccess();
            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'An error occurred during upload');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'text/plain') {
                handleUpload(file);
            } else {
                alert('Please upload a text file (.txt)');
            }
        }
    };

    return (
        <Box h="100%" display="flex" flexDirection="column">
            <VStack
                flex="1"
                overflowY="auto"
                p={4}
                alignItems="stretch"
                gap={4}
            >
                {messages.map((message) => (
                    <Box
                        key={message.id}
                        bg={message.type === 'user' ? userMessageBg : assistantMessageBg}
                        p={4}
                        borderRadius="lg"
                        shadow="md"
                    >
                        <Flex justifyContent="space-between" alignItems="center" mb={2}>
                            <HStack spacing={2}>
                                <Text fontWeight="bold">
                                    {message.type === 'user' ? 'You' : 'Assistant'}
                                </Text>
                                {message.type === 'assistant' && message.context && message.context.length > 0 && (
                                    <Badge 
                                        colorScheme="blue" 
                                        variant="solid"
                                        bg={badgeBg}
                                        color={badgeColor}
                                        borderRadius="full"
                                        px={2}
                                        display="flex"
                                        alignItems="center"
                                        cursor="pointer"
                                        onClick={() => toggleContext(message.id)}
                                    >
                                        <FiInfo style={{ marginRight: '4px' }} />
                                        {message.context.length} Context Items
                                    </Badge>
                                )}
                            </HStack>
                            {message.context && message.context.length > 0 && (
                                <IconButton
                                    aria-label="Toggle context"
                                    onClick={() => toggleContext(message.id)}
                                    variant="ghost"
                                    size="sm"
                                    icon={expandedMessage === message.id ? <FiChevronUp /> : <FiChevronDown />}
                                />
                            )}
                        </Flex>
                        <Text fontSize="md" mb={message.context && expandedMessage === message.id ? 4 : 0}>
                            {message.content}
                        </Text>
                        {message.context && message.context.length > 0 && (
                            <Collapse in={expandedMessage === message.id}>
                                <Divider my={4} borderColor={borderColor} />
                                <Box>
                                    <Text fontWeight="bold" mb={2} fontSize="sm" color={contextTextColor}>
                                        Knowledge Graph Context:
                                    </Text>
                                    <VStack 
                                        align="stretch" 
                                        spacing={2} 
                                        bg={contextBg} 
                                        p={3} 
                                        borderRadius="md"
                                        fontSize="sm"
                                    >
                                        {message.context.map((ctx, idx) => (
                                            <Text 
                                                key={idx} 
                                                color={contextTextColor}
                                                p={2}
                                                borderRadius="sm"
                                                borderLeft="3px solid"
                                                borderLeftColor="blue.400"
                                                bg={useColorModeValue('white', 'gray.800')}
                                            >
                                                {ctx}
                                            </Text>
                                        ))}
                                    </VStack>
                                </Box>
                            </Collapse>
                        )}
                    </Box>
                ))}
                <div ref={messagesEndRef} />
            </VStack>

            <Box p={4} borderTop="1px" borderColor={borderColor}>
                <form onSubmit={handleSubmit}>
                    <Flex gap={2}>
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            bg={useColorModeValue('white', 'gray.700')}
                        />
                        <Button
                            colorScheme="blue"
                            type="submit"
                            disabled={!input.trim()}
                        >
                            <FiSend style={{ marginRight: '8px' }} />
                            Send
                        </Button>
                        <IconButton
                            aria-label="Upload file"
                            icon={<FiUpload />}
                            colorScheme="green"
                            onClick={onOpen}
                        />
                    </Flex>
                </form>
            </Box>

            {/* Upload Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent bg={modalBg}>
                    <ModalHeader>Upload Text File</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4}>
                            <Input
                                type="file"
                                accept=".txt"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                display="none"
                            />
                            <Button
                                colorScheme="blue"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                w="100%"
                            >
                                <FiUpload style={{ marginRight: '8px' }} />
                                {isUploading ? 'Uploading...' : 'Choose File'}
                            </Button>
                            {isUploading && (
                                <Box
                                    w="100%"
                                    h="4px"
                                    bg={progressTrackBg}
                                    borderRadius="full"
                                    overflow="hidden"
                                >
                                    <Box
                                        w={`${uploadProgress}%`}
                                        h="100%"
                                        bg="blue.500"
                                        transition="width 0.3s ease-in-out"
                                    />
                                </Box>
                            )}
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}; 