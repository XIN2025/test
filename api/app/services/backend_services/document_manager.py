from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId
import logging
from .db import get_db
from ..miscellaneous.graph_db import get_graph_db
from ..miscellaneous.vector_store import get_vector_store

logger = logging.getLogger(__name__)

class DocumentManager:
    def __init__(self):
        self.db = get_db()
        self.graph_db = get_graph_db()
        self.vector_store = get_vector_store()
        self.files_collection = self.db.get_collection("uploaded_files")
    
    def create_document_record(self, upload_id: str, filename: str, size: int, 
                             extension: str, user_email: str) -> str:
        """Create a new document record in MongoDB"""
        try:
            document = {
                "upload_id": upload_id,
                "filename": filename,
                "size": size,
                "extension": extension,
                "status": "processing",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "entities": [],
                "relationships": [],
                "user_email": user_email,
                "graph_nodes": [],  # Track nodes created in graph DB
                "graph_relationships": []  # Track relationships created in graph DB
            }
            
            result = self.files_collection.insert_one(document)
            logger.info(f"Created document record: {result.inserted_id} for {filename}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Error creating document record: {e}")
            raise
    
    def update_document_processing_result(self, upload_id: str, entities: List[Dict], 
                                        relationships: List[Dict], graph_nodes: List[str] = None,
                                        graph_relationships: List[str] = None) -> bool:
        """Update document record with processing results"""
        try:
            update_data = {
                "status": "completed",
                "updated_at": datetime.utcnow(),
                "entities": entities,
                "relationships": relationships
            }
            
            if graph_nodes:
                update_data["graph_nodes"] = graph_nodes
            if graph_relationships:
                update_data["graph_relationships"] = graph_relationships
            
            result = self.files_collection.update_one(
                {"upload_id": upload_id},
                {"$set": update_data}
            )
            
            logger.info(f"Updated document record for {upload_id}: {result.modified_count} documents")
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating document record: {e}")
            return False
    
    def get_all_documents(self, user_email: Optional[str] = None) -> List[Dict]:
        """Get all document records, optionally filtered by user"""
        try:
            query = {}
            if user_email:
                query["user_email"] = user_email
            
            documents = list(self.files_collection.find(query).sort("created_at", -1))
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["_id"] = str(doc["_id"])
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting documents: {e}")
            return []
    
    async def get_document_by_upload_id(self, upload_id: str) -> Optional[Dict]:
        """Get a specific document by upload ID"""
        try:
            document = await self.files_collection.find_one({"upload_id": upload_id})
            if document:
                document["_id"] = str(document["_id"])
            return document
            
        except Exception as e:
            logger.error(f"Error getting document {upload_id}: {e}")
            return None
    
    def delete_document(self, upload_id: str) -> bool:
        """Delete a document and its associated graph data"""
        try:
            # Get document record
            document = self.get_document_by_upload_id(upload_id)
            if not document:
                logger.warning(f"Document {upload_id} not found")
                return False
            
            # Delete graph nodes and relationships
            graph_nodes = document.get("graph_nodes", [])
            graph_relationships = document.get("graph_relationships", [])
            
            # Delete from graph database (scoped by user_email to avoid cross-tenant deletions)
            user_email = document.get("user_email")
            for node_id in graph_nodes:
                try:
                    # Delete all relationships connected to this node first
                    self._delete_node_relationships(node_id, user_email)
                    # Then delete the node itself
                    self._delete_node_completely(node_id, user_email)
                except Exception as e:
                    logger.error(f"Error deleting graph node {node_id}: {e}")
            # Delete from MongoDB
            result = self.files_collection.delete_one({"upload_id": upload_id})
            
            # Sync vector store after deletion
            self.vector_store.sync_from_graph(self.graph_db)
            
            logger.info(f"Deleted document {upload_id} and {len(graph_nodes)} graph nodes")
            return result.deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting document {upload_id}: {e}")
            return False
    
    def sync_graph_with_mongodb(self) -> Dict[str, int]:
        """Sync graph database with MongoDB records and clean up orphaned nodes"""
        try:
            logger.info("Starting MongoDB-Graph DB synchronization...")
            
            # Get all documents from MongoDB
            documents = self.get_all_documents()
            logger.info(f"Found {len(documents)} documents in MongoDB")
            
            # Collect all valid nodes and relationships from MongoDB
            valid_nodes = set()
            valid_relationships = set()
            
            for doc in documents:
                # Add nodes from this document
                graph_nodes = doc.get("graph_nodes", [])
                valid_nodes.update(graph_nodes)
                
                # Add relationships from this document
                graph_relationships = doc.get("graph_relationships", [])
                valid_relationships.update(graph_relationships)
            
            logger.info(f"Valid nodes from MongoDB: {len(valid_nodes)}")
            logger.info(f"Valid relationships from MongoDB: {len(valid_relationships)}")
            
            # Get all nodes from graph database
            graph_nodes, graph_relationships = self.graph_db.get_graph_data()
            graph_node_names = {node["name"] for node in graph_nodes}
            
            logger.info(f"Nodes in graph DB: {len(graph_node_names)}")
            
            # Find orphaned nodes (nodes in graph DB but not in MongoDB)
            orphaned_nodes = graph_node_names - valid_nodes
            logger.info(f"Orphaned nodes found: {len(orphaned_nodes)}")
            
            # Delete orphaned nodes and all their relationships
            deleted_count = 0
            for node_name in orphaned_nodes:
                try:
                    # Delete all relationships connected to this node first
                    self._delete_node_relationships(node_name)
                    # Then delete the node itself
                    self._delete_node_completely(node_name)
                    deleted_count += 1
                    logger.info(f"Deleted orphaned node and all relationships: {node_name}")
                except Exception as e:
                    logger.error(f"Error deleting orphaned node {node_name}: {e}")
            
            # Sync vector store after cleanup
            self.vector_store.sync_from_graph(self.graph_db)
            
            sync_result = {
                "total_documents": len(documents),
                "valid_nodes": len(valid_nodes),
                "valid_relationships": len(valid_relationships),
                "graph_nodes_before": len(graph_node_names),
                "orphaned_nodes": len(orphaned_nodes),
                "deleted_nodes": deleted_count,
                "graph_nodes_after": len(graph_node_names) - deleted_count
            }
            
            logger.info(f"Sync completed: {sync_result}")
            return sync_result
            
        except Exception as e:
            logger.error(f"Error during MongoDB-Graph DB sync: {e}")
            return {
                "error": str(e),
                "total_documents": 0,
                "valid_nodes": 0,
                "valid_relationships": 0,
                "graph_nodes_before": 0,
                "orphaned_nodes": 0,
                "deleted_nodes": 0,
                "graph_nodes_after": 0
            }
    
    def get_sync_status(self) -> Dict[str, any]:
        """Get synchronization status between MongoDB and Graph DB"""
        try:
            # Get MongoDB stats
            total_documents = self.files_collection.count_documents({})
            completed_documents = self.files_collection.count_documents({"status": "completed"})
            
            # Get Graph DB stats
            graph_nodes, graph_relationships = self.graph_db.get_graph_data()
            
            # Get Vector Store stats
            vector_stats = self.vector_store.get_stats()
            
            return {
                "mongodb": {
                    "total_documents": total_documents,
                    "completed_documents": completed_documents,
                    "processing_documents": total_documents - completed_documents
                },
                "graph_db": {
                    "total_nodes": len(graph_nodes),
                    "total_relationships": len(graph_relationships),
                    "node_types": list(set(node["type"] for node in graph_nodes))
                },
                "vector_store": vector_stats,
                "last_sync": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting sync status: {e}")
            return {"error": str(e)}
    
def _delete_node_relationships(self, node_name: str, user_email: Optional[str] = None):
    """Delete all relationships connected to a specific node. If user_email is provided, scope deletion to that user."""
    try:
        cypher_query = """
        MATCH (n {name: $node_name})
        WHERE $user_email IS NULL OR n.user_email = $user_email
        MATCH (n)-[r]-()
        DELETE r
        """
        self.graph_db.driver.execute_query(
            cypher_query,
            node_name=node_name,
            user_email=user_email,
        )
        logger.info(f"Deleted all relationships for node: {node_name} (user scope: {user_email is not None})")
    except Exception as e:
        logger.error(f"Error deleting relationships for node {node_name}: {e}")

def _delete_node_completely(self, node_name: str, user_email: Optional[str] = None):
    """Delete a node completely from the graph database. If user_email is provided, scope deletion to that user."""
    try:
        cypher_query = """
        MATCH (n {name: $node_name})
        WHERE $user_email IS NULL OR n.user_email = $user_email
        DELETE n
        """
        self.graph_db.driver.execute_query(
            cypher_query,
            node_name=node_name,
            user_email=user_email,
        )
        logger.info(f"Deleted node completely: {node_name} (user scope: {user_email is not None})")
    except Exception as e:
        logger.error(f"Error deleting node {node_name}: {e}")

# Global instance
document_manager = None

def get_document_manager() -> DocumentManager:
    """Get or create a DocumentManager instance"""
    global document_manager
    if document_manager is None:
        document_manager = DocumentManager()
    return document_manager
