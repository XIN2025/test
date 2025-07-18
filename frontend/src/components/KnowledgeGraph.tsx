import React, { useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
    Box,
    Text,
    useColorModeValue,
    Spinner,
    Center,
    VStack,
    Badge,
    HStack,
    Button,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import axios from 'axios';

interface Node {
    id: string;
    label: string;
    type: string;
    color: string;
    x?: number;
    y?: number;
}

interface GraphData {
    nodes: Node[];
    links: {
        source: string | Node;
        target: string | Node;
        label: string;
    }[];
}

interface ApiGraphData {
    nodes: Node[];
    links: {
        source: string;
        target: string;
        label: string;
    }[];
}

export const KnowledgeGraph: React.FC = () => {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [isClearing, setIsClearing] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const cancelRef = React.useRef<HTMLButtonElement>(null);
    const toast = useToast();

    const bgColor = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.800', 'white');
    const linkColor = useColorModeValue('#718096', '#A0AEC0');
    const linkTextColor = useColorModeValue('gray.600', 'gray.400');

    // Function to deduplicate links
    const deduplicateLinks = (links: GraphData['links']) => {
        const seen = new Set();
        return links.filter(link => {
            const key = `${link.source}-${link.label}-${link.target}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const fetchGraphData = async () => {
        try {
            const response = await axios.get<ApiGraphData>('http://localhost:8000/graph');
            // Convert string IDs to actual node references for the links
            const data: GraphData = {
                nodes: response.data.nodes,
                links: deduplicateLinks(response.data.links.map(link => ({
                    ...link,
                    source: response.data.nodes.find(node => node.id === link.source) || link.source,
                    target: response.data.nodes.find(node => node.id === link.target) || link.target
                })))
            };
            setGraphData(data);
        } catch (err) {
            setError('Failed to load graph data');
            console.error(err);
        }
    };

    const handleClearDatabase = async () => {
        try {
            setIsClearing(true);
            await axios.post('http://localhost:8000/clear-database');
            await fetchGraphData(); // Refresh the graph
            toast({
                title: 'Database cleared',
                description: 'The knowledge graph has been cleared successfully.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to clear the database. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsClearing(false);
            setIsAlertOpen(false);
        }
    };

    useEffect(() => {
        // Set initial dimensions
        const updateDimensions = () => {
            const container = document.getElementById('graph-container');
            if (container) {
                setDimensions({
                    width: container.clientWidth,
                    height: Math.max(500, window.innerHeight * 0.6)
                });
            }
        };

        fetchGraphData();
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const handleNodeClick = useCallback((node: Node) => {
        console.log('Clicked node:', node);
    }, []);

    if (error) {
        return (
            <Center p={8}>
                <Text color="red.500">{error}</Text>
            </Center>
        );
    }

    if (!graphData) {
        return (
            <Center p={8}>
                <Spinner size="xl" />
            </Center>
        );
    }

    return (
        <Box position="relative" id="graph-container" bg={bgColor} borderRadius="lg" overflow="hidden">
            {/* Header with Clear button */}
            <Box 
                position="absolute" 
                top={4} 
                right={4} 
                zIndex={1}
            >
                <Button
                    leftIcon={<FiTrash2 />}
                    colorScheme="red"
                    variant="solid"
                    size="sm"
                    onClick={() => setIsAlertOpen(true)}
                    isLoading={isClearing}
                    loadingText="Clearing..."
                >
                    Clear Database
                </Button>
            </Box>

            {/* Graph visualization */}
            <ForceGraph2D
                graphData={graphData}
                nodeLabel="label"
                width={dimensions.width}
                height={dimensions.height}
                onNodeClick={handleNodeClick}
                nodeColor={node => (node as Node).color}
                linkDirectionalArrowLength={5}
                linkDirectionalArrowRelPos={1}
                linkDirectionalArrowColor={() => linkColor}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                linkColor={() => linkColor}
                backgroundColor={bgColor}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    const label = node.label;
                    const fontSize = 11/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.fillStyle = textColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, node.x, node.y + 10);
                }}
                linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    // Draw the line
                    const start = link.source;
                    const end = link.target;
                    ctx.strokeStyle = linkColor;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.stroke();

                    // Draw the label
                    const label = link.label.toLowerCase();
                    const middleX = (start.x + end.x) / 2;
                    const middleY = (start.y + end.y) / 2;
                    
                    const fontSize = 30/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.fillStyle = linkTextColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, middleX, middleY);
                }}
                linkCanvasObjectMode={() => "after"}
            />

            {/* Confirmation Dialog */}
            <AlertDialog
                isOpen={isAlertOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setIsAlertOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent bg={bgColor}>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Clear Database
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure? This will permanently delete all nodes and relationships in the knowledge graph.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setIsAlertOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleClearDatabase} ml={3}>
                                Clear Database
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}; 