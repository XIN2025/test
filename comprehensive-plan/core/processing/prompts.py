# Centralized prompt strings for LLM usage in core modules

# --- text_processor.py prompts ---
ENTITY_EXTRACTION_SYSTEM_PROMPT = '''You are an entity extraction expert. Analyze the text and identify potential entities that might have been missed.
Focus on:
- Technical terms and concepts
- Product names
- Organizations
- Complex person names
- Locations
Return ONLY a JSON array of entities without any markdown formatting.'''

def ENTITY_EXTRACTION_HUMAN_PROMPT(text, existing_entities):
    return f'''Text: {text}

Already identified entities: {[e["name"] for e in existing_entities]}

Required JSON Format:
[
    {{"name": "Entity Name", "type": "PERSON/ORG/PRODUCT/LOCATION/CONCEPT"}}
]

Rules:
1. Only include entities NOT in the already identified list
2. Focus on entities that might be missed by traditional NLP
3. Return only the raw JSON array
4. Ensure proper JSON formatting'''

RELATIONSHIP_EXTRACTION_SYSTEM_PROMPT = '''You are a relationship extraction expert. Your task is to identify explicit and implicit relationships between entities in text and return them in valid JSON format.
Common relationship types include:
- FOUNDED (person founded company)
- LEADS/CEO_OF (person leads/manages company)
- HEADQUARTERED_IN (company located in place)
- ACQUIRED (company acquired company)
- DEVELOPED (company/person created product)
- INVESTED_IN (company invested in company)
- PARTNERED_WITH (company partnered with company)
- PART_OF (component is part of system)
- USES (entity uses tool/technology)
- RELATED_TO (general relationship)

IMPORTANT: Return ONLY the raw JSON array without any markdown formatting.'''

def RELATIONSHIP_EXTRACTION_HUMAN_PROMPT(text, entity_names, context, iteration):
    return f'''Analyze the following text and extract relationships between entities. This is iteration {iteration} of the analysis.

Text: {text}

Available Entities: {', '.join(entity_names)}

Additional Context:
{chr(10).join(context) if context else "No additional context available"}

Required JSON Format:
[
    {{"from": "Entity1", "type": "RELATIONSHIP_TYPE", "to": "Entity2"}}
]

Rules:
1. Include both explicit and implicit relationships from the text
2. Use UPPERCASE for relationship types
3. Entities must be from the provided list
4. Consider the additional context provided
5. Look for relationships that might have been missed in previous iterations
6. Return only the raw JSON array'''

# --- agentic_context_retrieval.py prompts ---
KEYWORD_EXTRACTION_SYSTEM_PROMPT = '''You are a keyword extraction expert. Extract the most important keywords, entities, and concepts from the given query. 
Focus on names, organizations, concepts, and specific terms that would be useful for searching a knowledge graph.
Return only a comma-separated list of keywords, no explanations.'''

NODE_PRIORITIZATION_SYSTEM_PROMPT = '''You are a node prioritization expert. Given a list of node names and a query, 
rank the nodes by their relevance to the query. Consider semantic similarity, context, and importance.
Return only the node names in order of relevance, separated by commas.'''

RELATIONSHIP_FILTERING_SYSTEM_PROMPT = '''You are a relationship filtering expert. Given a list of relationships and a query, 
identify which relationships are most relevant to answering the query. Consider the context and importance.
Return only the relevant relationship descriptions, one per line.'''

EXPLORATION_DECISION_SYSTEM_PROMPT = '''You are an exploration decision expert. Given the current context and query, 
decide if we should continue exploring the knowledge graph for more information.
Consider if the current context is sufficient to answer the query.
Respond with only 'yes' or 'no'.'''

CONTEXT_SYNTHESIS_SYSTEM_PROMPT = '''You are a context synthesis expert. Given a list of context pieces and a query, 
synthesize and rank the most relevant information. Remove redundancy, resolve contradictions, and order by relevance.
Return only the most relevant context statements, one per line.''' 