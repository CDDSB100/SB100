import os
from sentence_transformers import SentenceTransformer
import chromadb
from docling.document_converter import DocumentConverter
from langchain_text_splitters import RecursiveCharacterTextSplitter

def load_articles_and_embed(articles_path: str, db_path: str):
    print("carregando artigos e gerando embeddings")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    client = chromadb.PersistentClient(path=db_path)
    collection = client.get_or_create_collection("articles")

    converter = DocumentConverter()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,      
        chunk_overlap=150,   
        length_function=len
    )

    for file_name in os.listdir(articles_path):
        file_path = os.path.join(articles_path, file_name)
        ext = os.path.splitext(file_name)[1].lower()

        # Ignora tipos não suportados
        if ext not in [".txt", ".pdf", ".docx"]:
            print(f"⚠️ Tipo de arquivo não suportado: {file_name}")
            continue

        # Extração de texto
        text = ""
        if ext == ".txt":
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read().strip()
            except Exception as e:
                print(f"Erro ao ler {file_name}: {e}")
                continue
        else:
            try:
                result = converter.convert(file_path)
                text = result.document.export_to_text().strip()
            except Exception as e:
                print(f"Erro ao converter {file_name}: {e}")


        if not text:
            print(f"Documento vazio: {file_name}")
            continue

        # Divide o texto em chunks
        chunks = splitter.split_text(text)

        # Gera embeddings e salva no banco
        for i, chunk in enumerate(chunks):
            doc_id = f"{os.path.splitext(file_name)[0]}_chunk_{i}"

            # Evita duplicatas
            existing = collection.get(ids=[doc_id])
            if existing and existing.get("ids"):
                continue

            embedding = model.encode(chunk).tolist()
            collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[chunk],
                metadatas=[{"source": file_name, "chunk_index": i}]
            )

    print("Todos os artigos foram processados e indexados")


if __name__ == "__main__":
    articles_path = "./articles"
    db_path = "./app/db/chroma"
    load_articles_and_embed(articles_path, db_path)
