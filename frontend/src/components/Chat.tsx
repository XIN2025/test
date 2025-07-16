import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    Input,
    Button,
    Text,
    Flex,
    IconButton,
} from '@chakra-ui/react';
import { FiSend, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { Message } from '../types';
import axios from 'axios';

interface ChatProps {
    messages: Message[];
    onSendMessage: (message: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
    const [input, setInput] = useState('');
    const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                        bg={message.type === 'user' ? 'blue.50' : 'green.50'}
                        p={4}
                        borderRadius="lg"
                    >
                        <Flex justifyContent="space-between" alignItems="center">
                            <Text fontWeight="bold" mb={2}>
                                {message.type === 'user' ? 'You' : 'Assistant'}
                            </Text>
                            {message.context && message.context.length > 0 && (
                                <IconButton
                                    aria-label="Toggle context"
                                    onClick={() => toggleContext(message.id)}
                                >
                                    {expandedMessage === message.id ? <FiChevronUp /> : <FiChevronDown />}
                                </IconButton>
                            )}
                        </Flex>
                        <Text>{message.content}</Text>
                        {message.context && expandedMessage === message.id && (
                            <Box 
                                mt={4} 
                                p={4} 
                                bg="gray.50" 
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

            <Box p={4} borderTop="1px" borderColor="gray.200">
                <form onSubmit={handleSubmit}>
                    <Flex gap={2}>
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
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