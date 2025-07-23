import React, { useState, useCallback } from 'react';
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
    const [graphKey, setGraphKey] = useState(0); // Add key to force graph refresh

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
            return response.data; // Return backend response
        } catch (error) {
            // Add error message
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: 'Sorry, there was an error processing your request.',
                type: 'assistant',
            };
            setMessages((prev: Message[]) => [...prev, errorMessage]);
            return error; // Return error
        }
    };

    // Handle successful file upload
    const handleUploadSuccess = useCallback(() => {
        // Increment key to force graph component to remount and fetch fresh data
        setGraphKey(prevKey => prevKey + 1);
    }, []);

    return (
        <Box minH="100vh" bg={bgColor}>
            {/* Header */}
            <Box
                position="fixed"
                top={0}
                left={0}
                right={0}
                borderBottom="1px"
                borderColor={borderColor}
                bg={useColorModeValue('white', 'gray.800')}
                zIndex={10}
            >
                <HStack justify="space-between" p={4} maxW="container.xl" mx="auto">
                    <Heading size="md">Knowledge Graph RAG</Heading>
                    <IconButton
                        aria-label="Toggle color mode"
                        icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                        onClick={toggleColorMode}
                    />
                </HStack>
            </Box>

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
                    <KnowledgeGraph key={graphKey} />
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
