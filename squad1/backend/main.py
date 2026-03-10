from src.utils.llm import app
import uvicorn
import os
import sys

# Adiciona o diretório atual ao path para garantir que src.utils.llm seja encontrado
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Esta configuração permite rodar o FastAPI diretamente: python main.py
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
