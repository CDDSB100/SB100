from fastapi import FastAPI, HTTPException
from sentence_transformers import SentenceTransformer
import chromadb
from pydantic import BaseModel
import uvicorn

app = FastAPI()

model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
client = chromadb.PersistentClient(path="db/chroma")
collection = client.get_or_create_collection("articles")

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5 

@app.get("/")
def root():
    return {"message": "Semantic Search API (chunked) online 🚀"}

@app.post("/search")
def search(request:SearchRequest):
    embedding = model.encode(request.query).tolist()
    results = collection.query(query_embeddings=[embedding], n_results=request.n_results)

    if not results["documents"][0]:
        raise HTTPException(status_code=404, detail="Nenhum resultado encontrado")

    response = []
    for doc, meta, score in zip(
        results["documents"][0], results["metadatas"][0], results["distances"][0]
    ):
        response.append({
            "source": meta.get("source", "desconhecido"),
            "chunk_index": meta.get("chunk_index", 0),
            "text": doc,
            "score": float(score)
        })

    return {"query": request.query, "results": response}

@app.post("/embed")
def search(sentence: str):
    embeddings = model.encode([sentence])
    return {"embeddings": embeddings.tolist()}

if __name__ == "__main__":
    uvicorn.run(
        "__main__:app", # Diz ao uvicorn para procurar o objeto 'app' neste arquivo
        host="127.0.0.1",
        port=8000,
        reload=True # O 'reload' é útil para desenvolvimento
    )
