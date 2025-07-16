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
} from '@chakra-ui/react';
import axios from 'axios';

interface Node {
    id: string;
    label: string;
    type: string;
    color: string;
    x?: number;
    y?: number;
}

interface Link {
    source: string | Node;
    target: string | Node;
    label: string;
    __lineObj?: {
        offset: number;
    };
}

interface GraphData {
    nodes: Node[];
    links: Link[];
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
    const [time, setTime] = useState(0);

    const bgColor = useColorModeValue('white', 'gray.800');
    const textColor = useColorModeValue('gray.800', 'white');
    const linkColor = useColorModeValue('#000000', '#FFFFFF');
    const linkTextColor = useColorModeValue('gray.600', 'gray.300');

    // Animation loop
    useEffect(() => {
        const animationFrame = requestAnimationFrame(() => {
            setTime(time => time + 1);
        });
        return () => cancelAnimationFrame(animationFrame);
    }, [time]);

    // Initialize line objects
    useEffect(() => {
        if (graphData) {
            graphData.links.forEach(link => {
                if (!link.__lineObj) {
                    link.__lineObj = {
                        offset: Math.random()
                    };
                }
            });
        }
    }, [graphData]);

    const nodeTypes = graphData?.nodes.reduce((types, node) => {
        if (!types.includes(node.type)) {
            types.push(node.type);
        }
        return types;
    }, [] as string[]) || [];

    useEffect(() => {
        const fetchGraphData = async () => {
            try {
                const response = await axios.get<ApiGraphData>('http://localhost:8000/graph');
                // Convert string IDs to actual node references for the links
                const data: GraphData = {
                    nodes: response.data.nodes,
                    links: response.data.links.map(link => ({
                        ...link,
                        source: response.data.nodes.find(node => node.id === link.source) || link.source,
                        target: response.data.nodes.find(node => node.id === link.target) || link.target
                    }))
                };
                setGraphData(data);
            } catch (err) {
                setError('Failed to load graph data');
                console.error(err);
            }
        };

        fetchGraphData();

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

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const handleNodeClick = useCallback((node: Node) => {
        // Handle node click - could zoom in or show details
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
        <VStack spacing={4} w="100%" align="stretch">
            <Box p={4} bg={bgColor} borderRadius="lg" shadow="sm">
                <Text fontSize="lg" fontWeight="bold" mb={4} color={textColor}>
                    Knowledge Graph Visualization
                </Text>
                <HStack spacing={2} mb={4} wrap="wrap">
                    {nodeTypes.map(type => (
                        <Badge
                            key={type}
                            px={2}
                            py={1}
                            borderRadius="full"
                            bg={graphData.nodes.find(n => n.type === type)?.color || 'gray.500'}
                            color="white"
                        >
                            {type}: {graphData.nodes.filter(n => n.type === type).length}
                        </Badge>
                    ))}
                </HStack>
                <Text fontSize="sm" color={textColor} mb={2}>
                    Nodes: {graphData.nodes.length} | Relationships: {graphData.links.length}
                </Text>
            </Box>
            <Box 
                id="graph-container" 
                bg={bgColor} 
                borderRadius="lg" 
                shadow="sm" 
                overflow="hidden"
            >
                <ForceGraph2D
                    graphData={graphData}
                    nodeLabel="label"
                    nodeColor={node => (node as Node).color}
                    linkColor={() => linkColor}
                    linkLabel={link => (link as Link).label}
                    width={dimensions.width}
                    height={dimensions.height}
                    onNodeClick={handleNodeClick}
                    linkDirectionalArrowLength={6}
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    linkWidth={1.5}
                    linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                        const sourcePos = { x: (link.source as any).x, y: (link.source as any).y };
                        const targetPos = { x: (link.target as any).x, y: (link.target as any).y };
                        
                        // Draw the main line
                        ctx.strokeStyle = linkColor;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(sourcePos.x, sourcePos.y);
                        ctx.lineTo(targetPos.x, targetPos.y);
                        ctx.stroke();

                        // Draw animated particle
                        const particleSpeed = 0.01;
                        const particleSize = 3;
                        const offset = ((link as Link).__lineObj?.offset || 0);
                        const t = (time * particleSpeed + offset) % 1;
                        
                        const x = sourcePos.x + (targetPos.x - sourcePos.x) * t;
                        const y = sourcePos.y + (targetPos.y - sourcePos.y) * t;
                        
                        ctx.fillStyle = linkColor;
                        ctx.beginPath();
                        ctx.arc(x, y, particleSize, 0, 2 * Math.PI);
                        ctx.fill();

                        // Draw the label
                        const label = (link as Link).label;
                        if (label) {
                            const midX = (sourcePos.x + targetPos.x) / 2;
                            const midY = (sourcePos.y + targetPos.y) / 2;
                            ctx.font = '8px Sans-Serif';
                            ctx.fillStyle = linkTextColor;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(label, midX, midY);
                        }
                    }}
                    nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                        const label = (node as Node).label;
                        const fontSize = 12/globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.fillStyle = (node as Node).color;
                        ctx.beginPath();
                        ctx.arc(node.x!, node.y!, 5, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.fillStyle = textColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, node.x!, node.y! + 10);
                    }}
                    linkVisibility={true}
                />
            </Box>
        </VStack>
    );
}; 