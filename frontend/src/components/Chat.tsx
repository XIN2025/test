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
} from '@chakra-ui/react';
import { FiSend, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { Message } from '../types';

interface ChatProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
    const [input, setInput] = useState('');
    const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userMessageBg = useColorModeValue('blue.100', 'blue.900');
    const assistantMessageBg = useColorModeValue('green.100', 'green.900');
    const contextBg = useColorModeValue('gray.100', 'gray.700');
    const borderColor = useColorModeValue('gray.200', 'gray.600');

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
                        <Flex justifyContent="space-between" alignItems="center">
                            <Text fontWeight="bold" mb={2}>
                                {message.type === 'user' ? 'You' : 'Assistant'}
                            </Text>
                            {message.context && message.context.length > 0 && (
                                <IconButton
                                    aria-label="Toggle context"
                                    onClick={() => toggleContext(message.id)}
                                    variant="ghost"
                                    icon={expandedMessage === message.id ? <FiChevronUp /> : <FiChevronDown />}
                                />
                            )}
                        </Flex>
                        <Text>{message.content}</Text>
                        {message.context && expandedMessage === message.id && (
                            <Box 
                                mt={4} 
                                p={4} 
                                bg={contextBg}
                                borderRadius="md"
                                transition="all 0.2s"
                            >
                                <Text fontWeight="bold" mb={2}>Context:</Text>
                                <VStack align="stretch" gap={2}>
                                    {message.context.map((ctx, idx) => (
                                        <Text key={idx} fontSize="sm">{ctx}</Text>
                                    ))}
                                </VStack>
                            </Box>
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
                    </Flex>
                </form>
            </Box>
        </Box>
    );
}; 