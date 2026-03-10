from qdrant_client import QdrantClient
from qdrant_client.http import models

client = QdrantClient(
    url="http://127.0.0.1:6333",
    api_key="fwaoNYhMTH3vf2QfzrxajQ==",
    check_compatibility=False
)

try:
    collections = client.get_collections()
    print("✅ Conexão estabelecida! Coleções encontradas:")
    for col in collections.collections:
        print(f" - {col.name}")
except Exception as e:
    print(f"❌ Erro ao acessar o Qdrant: {e}")
