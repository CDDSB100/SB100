from qdrant_client import QdrantClient
url_qdrant = "http://127.0.0.1:6333"
api_key_qdrant = "fwaoNYhMTH3vf2QfzrxajQ=="
try:
    print(f"Tentando conectar ao Qdrant em {url_qdrant}...")
    client = QdrantClient(url=url_qdrant, api_key=api_key_qdrant)
    collections = client.get_collections()
    print("Conexão bem-sucedida!")
    print(f"Coleções encontradas: {collections}")
except Exception as e:
    print(f"Falha na conexão: {e}")
