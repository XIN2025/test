import { useState } from 'react';
import {
    Container,
    VStack,
    Heading,
    Button,
    Box,
    Text,
    useColorModeValue,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
} from '@chakra-ui/react';
import { FiTrash2, FiMessageSquare, FiShare2 } from 'react-icons/fi';
import { Chat } from './components/Chat';
import { FileUpload } from './components/FileUpload';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import type { Message, QueryResponse } from './types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const bgColor = useColorModeValue('gray.50', 'gray.900');
    const containerBg = useColorModeValue('white', 'gray.800');
    const headingColor = useColorModeValue('gray.800', 'white');

    const showError = (message: string) => {
        setError(message);
        setTimeout(() => setError(null), 5000);
    };

    const showSuccess = (message: string) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleSendMessage = async (content: string) => {
        // Add user message
        const userMessage: Message = {
            id: uuidv4(),
            type: 'user',
            content,
        };
        setMessages((prev) => [...prev, userMessage]);

        try {
            // Send query to backend
            const response = await axios.post<QueryResponse>('http://localhost:8000/query', {
                question: content,
            });

            // Add assistant message with context
            const assistantMessage: Message = {
                id: uuidv4(),
                type: 'assistant',
                content: response.data.answer,
                context: response.data.context,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            showError(error instanceof Error ? error.message : 'Failed to get response');
        }
    };

    const handleClearDatabase = async () => {
        try {
            await axios.delete('http://localhost:8000/clear');
            setMessages([]);
            showSuccess('Knowledge graph cleared successfully');
        } catch (error) {
            showError('Failed to clear knowledge graph');
        }
    };

    const handleUploadSuccess = () => {
        // Optionally add a system message about successful upload
        const systemMessage: Message = {
            id: uuidv4(),
            type: 'assistant',
            content: 'Text file processed successfully. You can now ask questions about the content.',
        };
        setMessages((prev) => [...prev, systemMessage]);
    };

    return (
        <Box minH="100vh" bg={bgColor}>
            <Container maxW="container.xl" py={8}>
                <VStack gap={8} align="stretch">
                    <Heading textAlign="center" color={headingColor}>
                        Knowledge Graph QA System
                    </Heading>
                    {error && (
                        <Box p={4} bg={useColorModeValue('red.50', 'red.900')} borderRadius="md" color={useColorModeValue('red.600', 'red.200')}>
                            <Text fontWeight="bold">Error:</Text>
                            <Text>{error}</Text>
                        </Box>
                    )}
                    {success && (
                        <Box p={4} bg={useColorModeValue('green.50', 'green.900')} borderRadius="md" color={useColorModeValue('green.600', 'green.200')}>
                            <Text>{success}</Text>
                        </Box>
                    )}
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                    <Button
                        colorScheme="red"
                        variant="outline"
                        onClick={handleClearDatabase}
                    >
                        <FiTrash2 style={{ marginRight: '8px' }} />
                        Clear Knowledge Graph
                    </Button>
                    <Box
                        flex="1"
                        bg={containerBg}
                        borderRadius="lg"
                        boxShadow="sm"
                        overflow="hidden"
                    >
                        <Tabs isFitted variant="enclosed">
                            <TabList>
                                <Tab>
                                    <FiMessageSquare style={{ marginRight: '8px' }} />
                                    Chat Interface
                                </Tab>
                                <Tab>
                                    <FiShare2 style={{ marginRight: '8px' }} />
                                    Knowledge Graph
                                </Tab>
                            </TabList>

                            <TabPanels>
                                <TabPanel p={0}>
                                    <Box p={6} minH="500px">
                                        <Chat messages={messages} onSendMessage={handleSendMessage} />
                                    </Box>
                                </TabPanel>
                                <TabPanel p={6}>
                                    <KnowledgeGraph />
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
}

export default App;
