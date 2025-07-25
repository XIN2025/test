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
  Spinner,
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
import { CSSTransition, TransitionGroup } from "react-transition-group";
import "./AgentStepFade.css"; // You will need to create this CSS for fade animations
import ImageResults from "./ImageResults";
import type { ImageResult } from "./ImageResults";

// Map step keys to user-friendly thinking messages
const stepMessages: Record<string, string> = {
  similarity_search: "Searching similarities...",
  node_exploration: "Exploring relevant nodes...",
  relationship_exploration: "Exploring relationships...",
  decision_maker: "Deciding next step...",
  context_synthesis: "Synthesizing the most relevant medical context...",
  final_context: "Finalizing answer...",
};

// --- Agent Steps Streaming Hook ---
function useAgentSteps(
  question: string | null,
  onFinalContext?: (context: any, steps: any[]) => void
) {
  const [steps, setSteps] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState<any | null>(null);
  const [lastStepTime, setLastStepTime] = useState<number>(0);

  useEffect(() => {
    if (!question) return;
    setSteps([]);
    setActiveStep(null);
    setLastStepTime(0);
    let allSteps: any[] = [];
    let lastStartedStep: string | null = null;
    let stepTimeout: ReturnType<typeof setTimeout> | null = null;

    const eventSource = new EventSource(
      `http://localhost:8000/query-stream?question=${encodeURIComponent(
        question
      )}`,
      {
        withCredentials: true,
      }
    );

    eventSource.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        parsed = event.data;
      }
      allSteps = [...allSteps, parsed];
      setSteps((prev) => [...prev, parsed]);

      // Show bubble on started, keep until next started or final_context
      if (parsed && parsed.status === "started" && parsed.step) {
        console.log("Setting activeStep to:", parsed.step);
        lastStartedStep = parsed.step;
        setActiveStep({ step: parsed.step });
        setLastStepTime(Date.now());

        // Clear any existing timeout
        if (stepTimeout) {
          clearTimeout(stepTimeout);
        }
      } else if (parsed && parsed.step === "final_context") {
        console.log(
          "Final context received, but keeping activeStep until assistant message appears"
        );
        // Don't clear activeStep here - let it stay visible until assistant message appears
        if (stepTimeout) {
          clearTimeout(stepTimeout);
        }
      }

      // If this is the final context, call the callback with all steps
      if (parsed && parsed.step === "final_context" && onFinalContext) {
        onFinalContext(parsed.context, allSteps);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      if (stepTimeout) {
        clearTimeout(stepTimeout);
      }
      eventSource.close();
    };
    // eslint-disable-next-line
  }, [question]);

  return { steps, activeStep };
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
  const [thinkingLog, setThinkingLog] = useState<any[] | null>(null);
  const [thinkingLogOpen, setThinkingLogOpen] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [thinkingStart, setThinkingStart] = useState<number | null>(null);
  // Add state for images
  const [images, setImages] = useState<ImageResult[]>([]);

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
  const entityDescBg = useColorModeValue("green.100", "green.400");
  const entityDescText = useColorModeValue("gray.900", "white");
  const entityNameColor = useColorModeValue("green.800", "green.100");

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
      setThinkingLog(null);
      setPendingMessageId(null);
      await onSendMessage(messageToSend);
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

      const { entities, relationships, images } = response.data;
      let msg = `Upload successful! Processed ${entities} entities and ${relationships} relationships`;
      if (images !== undefined && images > 0) {
        msg += `, and ${images} images`;
      }
      alert(msg);
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
      if (file.type === "text/plain" || file.type === "application/pdf") {
        handleUpload(file);
      } else {
        alert("Please upload a text file (.txt) or PDF file (.pdf)");
      }
    }
  };

  // --- Agent Steps ---
  const { steps: agentSteps, activeStep } = useAgentSteps(
    currentQuestion,
    (finalContext, steps) => {
      setThinkingLog(steps);
      setThinkingLogOpen(false);
      // setCurrentQuestion(null); // <-- moved to useEffect below
      setPendingMessageId(Date.now().toString());
    }
  );

  // Clear currentQuestion only after assistant message is rendered
  useEffect(() => {
    if (
      currentQuestion &&
      messages.length > 0 &&
      messages[messages.length - 1].type === "assistant"
    ) {
      setCurrentQuestion(null);
    }
  }, [messages, currentQuestion]);

  // Keep thinking bubble visible until assistant message appears
  const shouldShowThinkingBubble = activeStep && currentQuestion;

  // Ensure thinking bubble stays visible for at least 1 second
  const [minDisplayTime, setMinDisplayTime] = useState<number>(0);

  useEffect(() => {
    if (activeStep) {
      setMinDisplayTime(Date.now() + 1000); // Show for at least 1 second
    }
  }, [activeStep]);

  const shouldShowWithMinTime =
    activeStep && currentQuestion && Date.now() < minDisplayTime;

  // Show placeholder when waiting for assistant but no specific step is active
  // This includes: after steps finish but before assistant responds, or when steps are very fast
  const shouldShowPlaceholder = currentQuestion && !activeStep;

  // Show any thinking bubble if we have a current question and either active step or placeholder condition
  const shouldShowAnyThinkingBubble =
    currentQuestion && (shouldShowWithMinTime || shouldShowPlaceholder);

  console.log(
    "shouldShowThinkingBubble:",
    shouldShowThinkingBubble,
    "shouldShowWithMinTime:",
    shouldShowWithMinTime,
    "shouldShowPlaceholder:",
    shouldShowPlaceholder,
    "shouldShowAnyThinkingBubble:",
    shouldShowAnyThinkingBubble,
    "activeStep:",
    activeStep,
    "currentQuestion:",
    currentQuestion,
    "agentSteps.length:",
    agentSteps.length,
    "minDisplayTime:",
    minDisplayTime
  );

  useEffect(() => {
    if (shouldShowAnyThinkingBubble) {
      setThinkingStart(Date.now());
    } else {
      setThinkingStart(null);
    }
  }, [shouldShowAnyThinkingBubble]);
  const thinkingAge = thinkingStart ? Date.now() - thinkingStart : 0;

  // --- View Thinking Log Modal ---
  const openThinkingLog = (log: any[]) => {
    setThinkingLog(log);
    setThinkingLogOpen(true);
  };
  const closeThinkingLog = () => setThinkingLogOpen(false);

  // Function to search images after a question is asked
  const searchImages = async (query: string) => {
    try {
      const response = await axios.get<ImageResult[]>(
        "http://localhost:8000/search-images",
        { params: { query } }
      );
      setImages(response.data);
    } catch (error) {
      setImages([]);
    }
  };

  // Helper type guard
  function isImageContext(
    ctx: any
  ): ctx is { type: string; base64: string; summary?: string; name?: string } {
    return (
      ctx &&
      typeof ctx === "object" &&
      ctx.type === "image" &&
      typeof ctx.base64 === "string"
    );
  }

  return (
    <Box h="100%" display="flex" flexDirection="column">
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
        {messages.map((msg, idx) => (
          <Box key={msg.id} mb={4}>
            <Box
              key={msg.id}
              bg={msg.type === "user" ? userMessageBg : assistantMessageBg}
              p={4}
              borderRadius="lg"
              shadow="md"
              position="relative"
            >
              <Flex justifyContent="space-between" alignItems="center" mb={2}>
                <HStack spacing={2}>
                  <Text fontWeight="bold">
                    {msg.type === "user" ? "You" : "Assistant"}
                  </Text>
                  {msg.type === "assistant" &&
                    msg.context &&
                    msg.context.length > 0 && (
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
                        onClick={() => toggleContext(msg.id)}
                      >
                        <FiInfo style={{ marginRight: "4px" }} />
                        {msg.context.length} Context Items
                      </Badge>
                    )}
                </HStack>
                {msg.type === "assistant" &&
                  msg.context &&
                  msg.context.length > 0 && (
                    <IconButton
                      aria-label="Toggle context"
                      onClick={() => toggleContext(msg.id)}
                      variant="ghost"
                      size="sm"
                      icon={
                        expandedMessage === msg.id ? (
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
                mb={msg.context && expandedMessage === msg.id ? 4 : 0}
              >
                {msg.content}
              </Text>
              {/* --- Attach View Thinking Log button to assistant message if available --- */}
              {msg.type === "assistant" &&
                thinkingLog &&
                idx ===
                  messages.map((m) => m.type).lastIndexOf("assistant") && (
                  <Button
                    size="xs"
                    mt={2}
                    onClick={() => setThinkingLogOpen(true)}
                    colorScheme="yellow"
                    variant="outline"
                  >
                    View Thinking Log
                  </Button>
                )}
              {/* --- End View Thinking Log button --- */}
              {msg.context && msg.context.length > 0 && (
                <Collapse in={expandedMessage === msg.id}>
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
                        msg.context.forEach((ctx, idx) => {
                          if (ctx.startsWith("ENTITY DESCRIPTION:")) {
                            // Format: ENTITY DESCRIPTION: Name: Description
                            const match = ctx.match(
                              /^ENTITY DESCRIPTION: ([^:]+):\s*(.*)$/
                            );
                            const entityName = match ? match[1] : "";
                            const description = match ? match[2] : ctx;
                            rendered.push(
                              <Box
                                key={`entity-desc-${entityName}`}
                                p={2}
                                borderRadius="sm"
                                borderLeft="3px solid"
                                borderLeftColor="green.400"
                                bg={entityDescBg}
                                mb={1}
                              >
                                <Badge colorScheme="green" mr={2}>
                                  <Text
                                    as="span"
                                    fontWeight="bold"
                                    color={entityNameColor}
                                  >
                                    {entityName}
                                  </Text>
                                </Badge>
                                <Text
                                  as="span"
                                  fontWeight="bold"
                                  color={entityDescText}
                                  mr={1}
                                >
                                  Entity Description:
                                </Text>
                                <Text as="span" color={entityDescText}>
                                  {description}
                                </Text>
                              </Box>
                            );
                          }
                        });
                        // Render other context items below entity descriptions
                        msg.context.forEach((ctx, idx) => {
                          if (!ctx.startsWith("ENTITY DESCRIPTION:")) {
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
                      {msg.context.map(
                        (
                          ctx:
                            | string
                            | {
                                type: string;
                                base64: string;
                                summary?: string;
                                name?: string;
                              },
                          i: number
                        ) => {
                          if (typeof ctx === "string") {
                            return (
                              <Box key={i} fontSize="sm" color="gray.500">
                                {ctx}
                              </Box>
                            );
                          } else if (isImageContext(ctx)) {
                            return (
                              <Box key={i} mt={2} mb={2}>
                                <img
                                  src={`data:image/png;base64,${ctx.base64}`}
                                  alt={ctx.summary || ctx.name}
                                  style={{
                                    maxWidth: 300,
                                    maxHeight: 200,
                                    border: "1px solid #ccc",
                                  }}
                                />
                                <Box fontSize="sm" color="gray.600" mt={1}>
                                  {ctx.summary}
                                </Box>
                              </Box>
                            );
                          } else {
                            return null;
                          }
                        }
                      )}
                    </VStack>
                  </Box>
                </Collapse>
              )}
            </Box>
          </Box>
        ))}
        {/* --- Agent thinking step as a chat bubble at the end --- */}
        <TransitionGroup>
          {shouldShowAnyThinkingBubble && (
            <CSSTransition
              key={activeStep?.step || "placeholder"}
              timeout={300}
              classNames="fade"
            >
              <Flex align="center" mt={2} mb={2} pl={1}>
                <Spinner size="xs" mr={2} color="gray.500" speed="0.7s" />
                <Text fontSize="sm" fontStyle="italic" color="gray.500">
                  {activeStep
                    ? stepMessages[activeStep.step] || activeStep.step
                    : "Processing your question and preparing the best medical context..."}
                </Text>
              </Flex>
            </CSSTransition>
          )}
        </TransitionGroup>
        {/* --- End agent thinking step --- */}
        <ImageResults images={images} />
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
                accept=".txt,.pdf"
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
      {/* --- View Thinking Log Modal --- */}
      <Modal isOpen={thinkingLogOpen} onClose={closeThinkingLog} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Agent Thinking Log</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={2} maxH="60vh" overflowY="auto">
              {thinkingLog &&
                thinkingLog.map((step, idx) => (
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
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
