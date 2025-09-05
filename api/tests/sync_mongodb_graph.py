#!/usr/bin/env python3
"""
Standalone script to sync MongoDB with Graph DB and clean up orphaned nodes
"""

import sys
import os
import argparse
import logging
from datetime import datetime

# Add the api directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.backend_services.document_manager import get_document_manager
from app.services.miscellaneous.graph_db import get_graph_db
from app.services.miscellaneous.vector_store import get_vector_store

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def sync_mongodb_with_graph_db():
    """Sync MongoDB with Graph DB and clean up orphaned nodes"""
    try:
        print("🔄 Starting MongoDB-Graph DB synchronization...")
        print("=" * 60)
        
        # Initialize services
        print("📊 Initializing services...")
        document_manager = get_document_manager()
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        print("✅ Services initialized successfully")
        
        # Get sync status before
        print("\n📋 Current system status:")
        status_before = document_manager.get_sync_status()
        print(f"   MongoDB documents: {status_before.get('mongodb', {}).get('total_documents', 0)}")
        print(f"   Graph DB nodes: {status_before.get('graph_db', {}).get('total_nodes', 0)}")
        print(f"   Vector store nodes: {status_before.get('vector_store', {}).get('total_nodes', 0)}")
        
        # Perform sync
        print("\n🔄 Performing synchronization...")
        sync_result = document_manager.sync_graph_with_mongodb()
        
        # Display results
        print("\n📊 Synchronization Results:")
        print("=" * 60)
        print(f"📄 Total documents in MongoDB: {sync_result.get('total_documents', 0)}")
        print(f"✅ Valid nodes from MongoDB: {sync_result.get('valid_nodes', 0)}")
        print(f"🔗 Valid relationships from MongoDB: {sync_result.get('valid_relationships', 0)}")
        print(f"📊 Graph nodes before cleanup: {sync_result.get('graph_nodes_before', 0)}")
        print(f"🗑️  Orphaned nodes found: {sync_result.get('orphaned_nodes', 0)}")
        print(f"❌ Nodes deleted: {sync_result.get('deleted_nodes', 0)}")
        print(f"📊 Graph nodes after cleanup: {sync_result.get('graph_nodes_after', 0)}")
        
        if sync_result.get('error'):
            print(f"❌ Error during sync: {sync_result.get('error')}")
            return False
        
        # Get sync status after
        print("\n📋 System status after sync:")
        status_after = document_manager.get_sync_status()
        print(f"   MongoDB documents: {status_after.get('mongodb', {}).get('total_documents', 0)}")
        print(f"   Graph DB nodes: {status_after.get('graph_db', {}).get('total_nodes', 0)}")
        print(f"   Vector store nodes: {status_after.get('vector_store', {}).get('total_nodes', 0)}")
        
        # Check for consistency
        mongodb_nodes = status_after.get('mongodb', {}).get('total_documents', 0)
        graph_nodes = status_after.get('graph_db', {}).get('total_nodes', 0)
        vector_nodes = status_after.get('vector_store', {}).get('total_nodes', 0)
        
        print("\n🔍 Consistency Check:")
        if graph_nodes == vector_nodes:
            print("✅ Graph DB and Vector Store are in sync")
        else:
            print(f"⚠️  Graph DB ({graph_nodes}) and Vector Store ({vector_nodes}) are out of sync")
        
        if sync_result.get('orphaned_nodes', 0) > 0:
            print(f"✅ Cleaned up {sync_result.get('deleted_nodes', 0)} orphaned nodes")
        else:
            print("✅ No orphaned nodes found - system is clean")
        
        print("\n🎉 Synchronization completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error during synchronization: {e}")
        print(f"❌ Synchronization failed: {e}")
        return False

def get_sync_status():
    """Get current synchronization status"""
    try:
        print("📋 Getting synchronization status...")
        document_manager = get_document_manager()
        status = document_manager.get_sync_status()
        
        print("\n📊 Current System Status:")
        print("=" * 60)
        
        mongodb = status.get('mongodb', {})
        print(f"📄 MongoDB:")
        print(f"   Total documents: {mongodb.get('total_documents', 0)}")
        print(f"   Completed: {mongodb.get('completed_documents', 0)}")
        print(f"   Processing: {mongodb.get('processing_documents', 0)}")
        
        graph_db = status.get('graph_db', {})
        print(f"\n🗂️  Graph Database:")
        print(f"   Total nodes: {graph_db.get('total_nodes', 0)}")
        print(f"   Total relationships: {graph_db.get('total_relationships', 0)}")
        print(f"   Node types: {', '.join(graph_db.get('node_types', []))}")
        
        vector_store = status.get('vector_store', {})
        print(f"\n🔍 Vector Store:")
        print(f"   Total nodes: {vector_store.get('total_nodes', 0)}")
        print(f"   Index size: {vector_store.get('index_size', 0)}")
        print(f"   Embedding dimension: {vector_store.get('embedding_dim', 0)}")
        
        print(f"\n🕒 Last sync: {status.get('last_sync', 'Never')}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        print(f"❌ Failed to get sync status: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Sync MongoDB with Graph DB and clean up orphaned nodes")
    parser.add_argument("--status", action="store_true", help="Get current sync status only")
    parser.add_argument("--sync", action="store_true", help="Perform full synchronization")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    print("🚀 MongoDB-Graph DB Synchronization Tool")
    print("=" * 60)
    
    if args.status:
        success = get_sync_status()
    elif args.sync:
        success = sync_mongodb_with_graph_db()
    else:
        # Default: perform sync
        success = sync_mongodb_with_graph_db()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
