# Agentic Context Retrieval with LangGraph

This document describes the new agentic context retrieval system that uses LangGraph to implement intelligent graph exploration and context gathering.

## Overview

The agentic context retrieval system replaces the previous simple context retrieval with a sophisticated workflow that can:

1. **Similarity Search**: Extract keywords from queries and find similar nodes in the graph database
2. **Intelligent Node Exploration**: Choose which nodes to explore based on query relevance
3. **Relationship Traversal**: Explore relationships between nodes and discover new connections
4. **Iterative Context Gathering**: Continue exploring until sufficient context is found
5. **Context Synthesis**: Rank and synthesize the most relevant information

## Architecture

### LangGraph Workflow

The system uses LangGraph to create a stateful workflow with the following nodes:

```
similarity_search → node_exploration → relationship_exploration → decision_maker
                                                                    ↓
                                                              context_synthesis → END
```

### State Management

The `AgentState` dataclass tracks:

- **Query**: The original user question
- **Discovered Nodes**: All nodes found during similarity search
- **Explored Nodes**: Nodes that have been fully explored
- **Explored Relationships**: Relationships that have been processed
- **Context Pieces**: Collected context information
- **Current Focus**: Currently exploring node
- **Exploration Depth**: How deep the exploration has gone
- **Should Continue**: Whether to continue exploring

## Key Features

### 1. Similarity Search

- Uses LLM to extract relevant keywords from queries
- Performs fuzzy matching against graph nodes
- Calculates similarity scores for better matching

### 2. Intelligent Node Prioritization

- Uses LLM to rank nodes by relevance to the query
- Focuses exploration on the most promising nodes first
- Avoids exploring irrelevant parts of the graph

### 3. Relationship Exploration

- Discovers all relationships for a given node
- Uses LLM to filter relevant relationships
- Automatically adds newly discovered nodes to the exploration set

### 4. Adaptive Exploration

- Decides whether to continue exploring based on current context
- Respects maximum exploration depth limits
- Stops when sufficient context is found

### 5. Context Synthesis

- Removes redundant information
- Ranks context pieces by relevance
- Resolves contradictions in the data

## Usage

### Basic Usage

```python
from agentic_context_langgraph import agentic_context_retrieval
from graph_db import Neo4jDatabase
from langchain_google_genai import ChatGoogleGenerativeAI

# Initialize components
llm = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.1)
db = Neo4jDatabase()

# Retrieve context
context = await agentic_context_retrieval(
    question="Tell me about Apple and its acquisitions",
    llm=llm,
    db=db,
    max_depth=3
)
```

### Advanced Usage

```python
from agentic_context_langgraph import AgenticContextRetrieval

# Create agent instance
agent = AgenticContextRetrieval(llm, db)

# Customize exploration
context = await agent.retrieve_context(
    query="What companies has Google acquired?",
    max_depth=5  # Deeper exploration
)
```

## Configuration

### Exploration Parameters

- **max_depth**: Maximum number of relationship hops to explore (default: 3)
- **similarity_threshold**: Minimum similarity score for node matching (default: 0.6)

### LLM Configuration

The system works with any LangChain-compatible LLM. Recommended settings:

- **Temperature**: 0.1-0.3 for consistent decision making
- **Model**: Use models with good reasoning capabilities (e.g., Gemini Pro, GPT-4)

## Workflow Steps

### 1. Similarity Search Node

- Extracts keywords from the query using LLM
- Performs fuzzy matching against all graph nodes
- Populates the discovered_nodes set

### 2. Node Exploration Node

- Prioritizes unexplored nodes by relevance
- Selects the most relevant node to explore
- Adds node information to context

### 3. Relationship Exploration Node

- Finds all relationships for the current node
- Filters relationships by relevance to the query
- Adds relevant relationships to context
- Discovers new nodes through relationships

### 4. Decision Maker Node

- Evaluates whether to continue exploring
- Considers exploration depth and context sufficiency
- Routes to either continue exploration or synthesize

### 5. Context Synthesis Node

- Synthesizes and ranks collected context
- Removes redundancy and contradictions
- Returns final context list

## Benefits Over Previous System

1. **Intelligent Exploration**: Instead of exploring all nodes, focuses on relevant ones
2. **Adaptive Depth**: Stops when sufficient context is found
3. **Relationship Discovery**: Automatically finds new relevant nodes through relationships
4. **Context Quality**: Better filtering and ranking of context pieces
5. **Scalability**: Can handle larger graphs more efficiently

## Error Handling

The system includes robust error handling:

- Falls back to simple keyword extraction if LLM fails
- Continues exploration even if some nodes fail
- Gracefully handles missing relationships or nodes
- Provides meaningful error messages

## Performance Considerations

- **Caching**: LangGraph provides built-in state caching
- **Parallel Processing**: Can be extended to explore multiple nodes in parallel
- **Memory Management**: Efficient state management prevents memory leaks
- **Database Optimization**: Uses efficient Neo4j queries

## Future Enhancements

1. **Parallel Exploration**: Explore multiple nodes simultaneously
2. **Context Memory**: Remember previous explorations for similar queries
3. **Dynamic Depth**: Adjust exploration depth based on query complexity
4. **Relationship Weighting**: Weight relationships by importance
5. **Multi-hop Reasoning**: Enable complex multi-step reasoning chains

## Integration

The system is designed to be a drop-in replacement for the previous `agentic_context_retrieval` function, maintaining backward compatibility while providing enhanced capabilities.
