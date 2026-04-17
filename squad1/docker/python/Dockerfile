# Dockerfile para FastAPI (IA)
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
# Instala NumPy compatível antes do restante para evitar conflitos de versão
RUN pip install --no-cache-dir "numpy<2.0.0"
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
