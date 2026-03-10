from qdrant_client import QdrantClient
import litellm
from dotenv import load_dotenv
import logging
import os
from pydantic import BaseModel
# from sentence_transformers import SentenceTransformer

load_dotenv()

# Suppress warnings
logging.getLogger('absl').setLevel(logging.ERROR)
logging.getLogger('google').setLevel(logging.ERROR)

# model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")

import requests
import json

# Initialize Qdrant client
try:
    import os
    qdrant_api_key = os.getenv("QDRANT_API_KEY", "")
    qdrant_url = os.getenv("QDRANT_URL", "")

    if qdrant_api_key and qdrant_url:
        # Cloud Qdrant
        qdrant_client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key,
            timeout=30,  # Add timeout to prevent hanging
            prefer_grpc=False  # Use HTTP instead of gRPC to avoid SSL issues
        )
        print("Connected to Qdrant Cloud")
    else:
        print("QDRANT_API_KEY and QDRANT_URL environment variables not set")
        qdrant_client = None

except Exception as e:
    print(f"Failed to connect to Qdrant: {e}")
    print("Make sure Qdrant is running and environment variables are set correctly")
    qdrant_client = None

def get_embedding(text):
    # response = litellm.embedding(
    #     model="gemini/gemini-embedding-001",
    #     input=[text],
    #     api_key=os.getenv("GOOGLE_API_KEY")
    # )
    # return response.data[0]['embedding']

    # NOTA: Use 'embbeding_service' como hostname e a porta interna '8000'
    EMBEDDING_API_URL = "http://embbeding_service:8000/embed?sentence="

    try:
        response = requests.post(EMBEDDING_API_URL+text)
        response.raise_for_status() # Lança exceção para códigos de erro HTTP
        embeddings = response.json()
        print("Embeddings recebidos com sucesso.")
        
    except requests.exceptions.RequestException as e:
        print(f"Erro ao conectar com o serviço de embeddings: {e}")
    return embeddings.get("embeddings")

def retrieve_documents(query, limit=4, filtro=None):
    """
    Retrieve documents from Qdrant based on query.

    Args:
        query (str): The search query
        limit (int): Number of documents to retrieve
        filtro (str, optional): Filter criteria for the search

    Returns:
        list: List of retrieved document points
    """
    if qdrant_client is None:
        print("Qdrant client not initialized. Check your configuration.")
        return []

    print(f"Retrieving documents for query: {query}")

    # Get embedding for the query
    try:
        query_embedding = get_embedding(query)
        print(f"Got embedding, length: {len(query_embedding)}")
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return []

    # Search in Qdrant using the modern query_points method
    try:
        search_result = qdrant_client.query_points(
            collection_name="sb100_v2",
            query=query_embedding,
            limit=limit,
            timeout=30  # Add timeout to query
            # query_filter=Filter(
            #     must=[
            #         FieldCondition(
            #             key='cultura',
            #             range=Match(
            #                 value=filtro
            #             )
            #         )
            #     ]
            # )
        ).points
        print(f"Search result points: {len(search_result)}")
    except Exception as e:
        print(f"Error querying points: {e}")
        if "handshake" in str(e).lower() or "timeout" in str(e).lower():
            print("SSL handshake timeout detected. This may be due to network issues or server unavailability.")
            print("Try checking your internet connection or contact support if the issue persists.")
        return []

    # Extract payloads or text from results
    results = []
    for point in search_result:
        # Assuming payload has 'text' field
        result = {'id': point.payload.get("id"), 'score': point.score, 'content': point.payload.get("content")}
        results.append(result)

    print(f"Returning {len(results)} results")
    return results

if __name__ == "__main__":
    # Example usage
    docs = retrieve_documents("What is AI?", limit=4)
    print(docs)
