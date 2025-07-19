import React, { useState, useRef, useEffect } from "react";
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
} from "@chakra-ui/react";
import {
  FiSend,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiUpload,
} from "react-icons/fi";
import type { Message } from "../types";
import axios from "axios";

// --- Agent Steps Streaming Hook ---
function useAgentSteps(question: string | null) {
  const [steps, setSteps] = useState<any[]>([]);
  useEffect(() => {
    if (!question) return;
    setSteps([]);
    const eventSource = new EventSource(
      `http://localhost:8000/query-stream?question=${encodeURIComponent(
        question
      )}`,
      {
        withCredentials: true,
      }
    );
    eventSource.onmessage = (event) => {
      try {
        setSteps((prev) => [...prev, JSON.parse(event.data)]);
      } catch {
        setSteps((prev) => [...prev, event.data]);
      }
    };
    return () => eventSource.close();
  }, [question]);
  return steps;
}

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onUploadSuccess: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  onUploadSuccess,
}) => {
  // State hooks
  const [input, setInput] = useState("");
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  // Ref hooks
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Disclosure hook
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Color mode hooks
  const userMessageBg = useColorModeValue("blue.100", "blue.900");
  const assistantMessageBg = useColorModeValue("green.100", "green.900");
  const contextBg = useColorModeValue("gray.100", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const contextTextColor = useColorModeValue("gray.600", "gray.300");
  const badgeBg = useColorModeValue("blue.500", "blue.200");
  const badgeColor = useColorModeValue("white", "gray.800");
  const modalBg = useColorModeValue("white", "gray.800");
  const progressTrackBg = useColorModeValue("gray.100", "gray.700");
  const scrollbarTrackBg = useColorModeValue("gray.100", "gray.700");
  const scrollbarThumbBg = useColorModeValue("gray.300", "gray.600");
  const scrollbarThumbHoverBg = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const messageContextBg = useColorModeValue("white", "gray.800");

  // Effect hooks
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      const messageToSend = input;
      setInput("");
      setCurrentQuestion(messageToSend); // Start streaming steps
      // If onSendMessage is async and returns the backend response, log it
      const result = await onSendMessage(messageToSend);
      console.log("Backend response:", result);
    }
  };

  const toggleContext = (messageId: string) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await axios.post(
        "http://localhost:8000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        }
      );

      alert(
        `Upload successful! Processed ${response.data.entities} entities and ${response.data.relationships} relationships`
      );
      onUploadSuccess();
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "An error occurred during upload"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "text/plain") {
        handleUpload(file);
      } else {
        alert("Please upload a text file (.txt)");
      }
    }
  };

  // --- Agent Steps ---
  const agentSteps = useAgentSteps(currentQuestion);

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* --- Agent Steps Live View --- */}
      <Box
        maxH="200px"
        overflowY="auto"
        mb={2}
        p={2}
        bg={contextBg}
        borderRadius="md"
        border="1px solid"
        borderColor={borderColor}
      >
        <Text fontWeight="bold" mb={1} color={contextTextColor}>
          Agent Steps (Live):
        </Text>
        <VStack align="stretch" spacing={1} fontSize="sm">
          {agentSteps.length === 0 && (
            <Text color={contextTextColor}>No steps yet.</Text>
          )}
          {agentSteps.map((step, idx) => (
            <Box
              key={idx}
              bg={messageContextBg}
              p={2}
              borderRadius="sm"
              fontFamily="mono"
            >
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {typeof step === "string"
                  ? step
                  : JSON.stringify(step, null, 2)}
              </pre>
            </Box>
          ))}
        </VStack>
      </Box>
      {/* --- End Agent Steps Live View --- */}
      <VStack
        ref={chatContainerRef}
        flex="1"
        maxH="calc(100vh - 200px)"
        overflowY="scroll"
        p={4}
        alignItems="stretch"
        gap={4}
        css={{
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: scrollbarTrackBg,
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: scrollbarThumbBg,
            borderRadius: "4px",
            "&:hover": {
              background: scrollbarThumbHoverBg,
            },
          },
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            bg={message.type === "user" ? userMessageBg : assistantMessageBg}
            p={4}
            borderRadius="lg"
            shadow="md"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={2}>
              <HStack spacing={2}>
                <Text fontWeight="bold">
                  {message.type === "user" ? "You" : "Assistant"}
                </Text>
                {message.type === "assistant" &&
                  message.context &&
                  message.context.length > 0 && (
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
                      <FiInfo style={{ marginRight: "4px" }} />
                      {message.context.length} Context Items
                    </Badge>
                  )}
              </HStack>
              {message.type === "assistant" &&
                message.context &&
                message.context.length > 0 && (
                  <IconButton
                    aria-label="Toggle context"
                    onClick={() => toggleContext(message.id)}
                    variant="ghost"
                    size="sm"
                    icon={
                      expandedMessage === message.id ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      )
                    }
                  />
                )}
            </Flex>
            <Text
              fontSize="md"
              mb={message.context && expandedMessage === message.id ? 4 : 0}
            >
              {message.content}
            </Text>
            {message.context && message.context.length > 0 && (
              <Collapse in={expandedMessage === message.id}>
                <Divider my={4} borderColor={borderColor} />
                <Box>
                  <Text
                    fontWeight="bold"
                    mb={2}
                    fontSize="sm"
                    color={contextTextColor}
                  >
                    Medical Knowledge Context:
                  </Text>
                  <VStack
                    align="stretch"
                    spacing={2}
                    bg={contextBg}
                    p={3}
                    borderRadius="md"
                    fontSize="sm"
                  >
                    {/* Display description for all entities referenced in context, even if not present in context array */}
                    {(() => {
                      // Render all description items at the top
                      const rendered: React.ReactNode[] = [];
                      message.context.forEach((ctx, idx) => {
                        if (ctx.startsWith("Description of ")) {
                          const match = ctx.match(
                            /^Description of ([^:]+):\s*(.*)$/
                          );
                          const entityName = match ? match[1] : "";
                          const description = match ? match[2] : ctx;
                          rendered.push(
                            <Box
                              key={`desc-${entityName}`}
                              p={2}
                              borderRadius="sm"
                              borderLeft="3px solid"
                              borderLeftColor="green.400"
                              bg={messageContextBg}
                              mb={1}
                            >
                              <Badge colorScheme="green" mr={2}>
                                {entityName}
                              </Badge>
                              <Text
                                as="span"
                                fontWeight="bold"
                                color={contextTextColor}
                                mr={1}
                              >
                                Description:
                              </Text>
                              <Text as="span" color={contextTextColor}>
                                {description}
                              </Text>
                            </Box>
                          );
                        }
                      });
                      // Render other context items below descriptions
                      message.context.forEach((ctx, idx) => {
                        if (!ctx.startsWith("Description of ")) {
                          rendered.push(
                            <Text
                              key={idx}
                              color={contextTextColor}
                              p={2}
                              borderRadius="sm"
                              borderLeft="3px solid"
                              borderLeftColor="blue.400"
                              bg={messageContextBg}
                            >
                              {ctx}
                            </Text>
                          );
                        }
                      });
                      return rendered;
                    })()}
                  </VStack>
                </Box>
              </Collapse>
            )}
          </Box>
        ))}
      </VStack>

      <Box p={4} borderTop="1px" borderColor={borderColor}>
        <form onSubmit={handleSubmit}>
          <Flex gap={2}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a medical question..."
              bg={inputBg}
            />
            <IconButton
              aria-label="Send message"
              icon={<FiSend />}
              colorScheme="blue"
              onClick={handleSubmit}
              disabled={!input.trim()}
              h="40px"
              w="40px"
            />
            <IconButton
              aria-label="Upload file"
              icon={<FiUpload />}
              colorScheme="green"
              onClick={onOpen}
              h="40px"
              w="40px"
            />
          </Flex>
        </form>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>Upload Medical Text File</ModalHeader>
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
                <FiUpload style={{ marginRight: "8px" }} />
                {isUploading ? "Uploading..." : "Choose File"}
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
