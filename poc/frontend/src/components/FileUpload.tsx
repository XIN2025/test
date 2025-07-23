import React, { useRef, useState } from 'react';
import {
    Box,
    Button,
    Input,
    Text,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';
import axios from 'axios';
import type { UploadResponse } from '../types';

interface FileUploadProps {
    onUploadSuccess: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Color mode values
    const borderColor = useColorModeValue('gray.200', 'gray.600');
    const progressTrackBg = useColorModeValue('gray.100', 'gray.700');
    const textColor = useColorModeValue('gray.800', 'white');

    const handleUpload = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsUploading(true);
            setUploadProgress(0);

            const response = await axios.post<UploadResponse>(
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
        <Box 
            p={4} 
            borderWidth={1} 
            borderRadius="lg" 
            borderColor={borderColor}
            bg={useColorModeValue('white', 'gray.800')}
        >
            <VStack gap={4}>
                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    Upload Text File
                </Text>
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
        </Box>
    );
}; 