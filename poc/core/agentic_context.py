from typing import List
from langchain_core.messages import SystemMessage, HumanMessage
from poc.core.graph_db import Neo4jDatabase

# You may need to pass llm and db from your main app
async def agentic_context_retrieval(
    question: str,
    llm,
    db: Neo4jDatabase
) -> List[str]:
    """
    Agentic workflow to retrieve context from the graph database.
    Expands entities with synonyms, finds similar nodes, explores relationships, and synthesizes relevant context.
    """
    # 1. Extract entities from query
    async def extract_entities_with_llm(text: str) -> List[str]:
        messages = [
            SystemMessage(content="You are an entity extraction expert. For the given input text, return ONLY a comma-separated list of potential entity names, including variations and common nicknames. No explanation, just the names."),
            HumanMessage(content=f"Extract entities from: {text}")
        ]
        try:
            response = llm.invoke(messages)
            return [e.strip() for e in response.content.split(',') if e.strip()]
        except Exception:
            return []

    entity_names = await extract_entities_with_llm(question)
    if not entity_names:
        return []

    # 2. Expand entities with synonyms using LLM
    async def get_synonyms(entity: str) -> List[str]:
        messages = [
            SystemMessage(content="You are a helpful assistant. List synonyms, aliases, and related terms for the following entity. Return a comma-separated list. No explanation."),
            HumanMessage(content=f"Entity: {entity}")
        ]
        try:
            response = llm.invoke(messages)
            return [e.strip() for e in response.content.split(',') if e.strip()]
        except Exception:
            return [entity]

    expanded_entities = set(entity_names)
    for name in entity_names:
        synonyms = await get_synonyms(name)
        expanded_entities.update(synonyms)
    expanded_entities = list(expanded_entities)

    # 3. Find similar nodes in Neo4j (fuzzy match)
    all_entities = db.get_all_entities()
    matched_nodes = []
    for candidate in expanded_entities:
        for ent in all_entities:
            ent_name_lower = ent["name"].lower()
            candidate_lower = candidate.lower()
            if candidate_lower in ent_name_lower or ent_name_lower in candidate_lower:
                matched_nodes.append(ent["name"])
    matched_nodes = list(set(matched_nodes))

    # 4. Explore relationships for matched nodes
    raw_context = db.get_context(matched_nodes)

    # 5. Compare relationships to query intent using LLM
    async def get_context_with_llm(entities: List[str], db_context: List[str]) -> List[str]:
        messages = [
            SystemMessage(content="You are a context filtering expert. Given entities and context statements:\n1. Remove redundant or contradictory information\n2. Keep only the most relevant statements\n3. Order from most to least relevant\n4. Return ONLY the statements, one per line, no explanations."),
            HumanMessage(content=f"Filter and rank these context statements about: {', '.join(entities)}\n\nContext statements:\n{chr(10).join(db_context)}")
        ]
        try:
            response = llm.invoke(messages)
            return [line.strip() for line in response.content.split('\n') if line.strip()]
        except Exception:
            return db_context

    context = await get_context_with_llm(entity_names, raw_context)

    # 6. Attach entity descriptions to context
    entity_descriptions = []
    for name in matched_nodes:
        for ent in all_entities:
            if ent["name"].lower() == name.lower():
                desc = ent.get("description")
                if desc is not None:
                    entity_descriptions.append(f"Description of {ent['name']}: {desc}")
    referenced_entities = set()
    for ctx_item in context:
        match = None
        if isinstance(ctx_item, str):
            match = ctx_item.split(' ')[0] if ctx_item else None
        if match:
            referenced_entities.add(match)
    for ent in all_entities:
        ent_name = ent["name"]
        desc = ent.get("description")
        if desc is not None:
            for ref_name in referenced_entities:
                ent_name_lower = ent_name.lower()
                ref_name_lower = ref_name.lower()
                if ref_name_lower in ent_name_lower or ent_name_lower in ref_name_lower:
                    desc_str = f"Description of {ent_name}: {desc}"
                    if desc_str not in entity_descriptions:
                        entity_descriptions.append(desc_str)
    full_context = entity_descriptions + context
    return full_context
