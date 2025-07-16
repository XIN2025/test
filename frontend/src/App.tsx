import { useState } from 'react';
import {
    Container,
    VStack,
    Heading,
    Button,
    Box,
    Text,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import { Chat } from './components/Chat';
import { FileUpload } from './components/FileUpload';
import type { Message, QueryResponse } from './types';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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
        <Box minH="100vh" bg="gray.50">
            <Container maxW="container.lg" py={8}>
                <VStack gap={8} align="stretch">
                    <Heading textAlign="center">Knowledge Graph QA System</Heading>
                    {error && (
                        <Box p={4} bg="red.50" borderRadius="md" color="red.600">
                            <Text fontWeight="bold">Error:</Text>
                            <Text>{error}</Text>
                        </Box>
                    )}
                    {success && (
                        <Box p={4} bg="green.50" borderRadius="md" color="green.600">
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
                        bg="white"
                        p={6}
                        borderRadius="lg"
                        boxShadow="sm"
                        minH="500px"
                    >
                        <Chat messages={messages} onSendMessage={handleSendMessage} />
                    </Box>
                </VStack>
            </Container>
        </Box>
    );
}

export default App;
