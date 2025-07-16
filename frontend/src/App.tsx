import React, { useState } from 'react';
import {
    Box,
    Grid,
    GridItem,
    useColorMode,
    IconButton,
    useColorModeValue,
    VStack,
    HStack,
    Heading,
} from '@chakra-ui/react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { Chat } from './components/Chat';
import type { Message } from './types';
import axios from 'axios';

export const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const { colorMode, toggleColorMode } = useColorMode();
    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    const handleSendMessage = async (content: string) => {
        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            content,
            type: 'user',
        };
        setMessages((prev: Message[]) => [...prev, userMessage]);

        try {
            // Get response from backend
            const response = await axios.post('http://localhost:8000/query', {
                question: content,
            });

            // Add assistant message with context
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: response.data.answer,
                type: 'assistant',
                context: response.data.context,
            };
            setMessages((prev: Message[]) => [...prev, assistantMessage]);
        } catch (error) {
            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: 'Sorry, there was an error processing your request.',
                type: 'assistant',
            };
            setMessages((prev: Message[]) => [...prev, errorMessage]);
        }
    };

    const handleUploadSuccess = () => {
        // Clear messages when new data is uploaded
        setMessages([]);
    };

    return (
        <Box h="100vh" bg={bgColor}>
            {/* Header with theme toggle */}
            <Box 
                py={4} 
                px={6} 
                borderBottom="1px" 
                borderColor={borderColor}
                position="fixed"
                top={0}
                left={0}
                right={0}
                zIndex={10}
                bg={bgColor}
            >
                <HStack justify="space-between" align="center">
                    <Heading size="md">Knowledge Graph RAG</Heading>
                    <IconButton
                        aria-label="Toggle color mode"
                        icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                        onClick={toggleColorMode}
                        variant="ghost"
                        size="lg"
                    />
                </HStack>
            </Box>

            {/* Main content */}
            <Grid
                templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
                gap={4}
                p={4}
                mt="72px" // Account for fixed header
                h="calc(100vh - 72px)" // Subtract header height
            >
                {/* Left column - Graph */}
                <GridItem 
                    colSpan={1}
                    bg={useColorModeValue('white', 'gray.800')}
                    borderRadius="lg"
                    shadow="sm"
                    overflow="hidden"
                    position="relative"
                >
                    <KnowledgeGraph />
                </GridItem>

                {/* Right column - Chat */}
                <GridItem colSpan={1}>
                    <Box 
                        h="100%"
                        bg={useColorModeValue('white', 'gray.800')}
                        borderRadius="lg"
                        shadow="sm"
                        overflow="hidden"
                    >
                        <Chat 
                            messages={messages} 
                            onSendMessage={handleSendMessage} 
                            onUploadSuccess={handleUploadSuccess}
                        />
                    </Box>
                </GridItem>
            </Grid>
        </Box>
    );
};

export default App;
