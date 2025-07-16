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

    // Function to deduplicate links
    const deduplicateLinks = (links: any[]): Link[] => {
        const seen = new Set<string>();
        return links.filter(link => {
            // Create a unique key for each relationship
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            const key = `${source}-${link.label}-${target}`;
            const reverseKey = `${target}-${link.label}-${source}`;
            
            if (seen.has(key) || seen.has(reverseKey)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    };

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
                    linkDirectionalArrowLength={0}  // Disable built-in arrow
                    linkDirectionalArrowRelPos={1}
                    linkCurvature={0.25}
                    linkWidth={0.5}
                    linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D) => {
                        const sourcePos = { x: (link.source as any).x, y: (link.source as any).y };
                        const targetPos = { x: (link.target as any).x, y: (link.target as any).y };
                        
                        // Calculate the angle of the line
                        const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
                        
                        // Calculate the radius of the target node circle (matching the nodeCanvasObject)
                        const nodeRadius = 5;
                        
                        // Adjust end point to be outside the circle
                        const adjustedTargetX = targetPos.x - (nodeRadius * Math.cos(angle));
                        const adjustedTargetY = targetPos.y - (nodeRadius * Math.sin(angle));
                        
                        // Draw the line
                        ctx.strokeStyle = linkColor;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(sourcePos.x, sourcePos.y);
                        ctx.lineTo(adjustedTargetX, adjustedTargetY);
                        ctx.stroke();

                        // Draw the arrow
                        const arrowLength = 5;
                        const arrowAngle = Math.PI / 6;
                        
                        ctx.fillStyle = linkColor;
                        ctx.beginPath();
                        ctx.moveTo(adjustedTargetX, adjustedTargetY);
                        ctx.lineTo(
                            adjustedTargetX - arrowLength * Math.cos(angle - arrowAngle),
                            adjustedTargetY - arrowLength * Math.sin(angle - arrowAngle)
                        );
                        ctx.lineTo(
                            adjustedTargetX - arrowLength * Math.cos(angle + arrowAngle),
                            adjustedTargetY - arrowLength * Math.sin(angle + arrowAngle)
                        );
                        ctx.closePath();
                        ctx.fill();

                        // Draw the label
                        const label = (link as Link).label;
                        if (label) {
                            const midX = (sourcePos.x + targetPos.x) / 2;
                            const midY = (sourcePos.y + targetPos.y) / 2;

                            // Calculate offset based on link index to prevent overlaps
                            const linkIndex = graphData?.links.indexOf(link as Link) || 0;
                            const offset = (linkIndex % 2 === 0 ? 1 : -1) * 12;  // Alternate between above and below
                            
                            // Apply offset perpendicular to the line
                            const labelX = midX - Math.sin(angle) * offset;
                            const labelY = midY + Math.cos(angle) * offset;

                            ctx.font = '6px Sans-Serif';
                            ctx.fillStyle = linkTextColor;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(label.toLowerCase(), labelX, labelY);
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