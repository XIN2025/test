from pymongo import MongoClient
from ...config import MONGODB_URI

client = None

def get_db():
    global client
    if client is None:
        client = MongoClient(MONGODB_URI)
    return client.get_database()

def close_db():
    global client
    if client:
        client.close()
        client = None 