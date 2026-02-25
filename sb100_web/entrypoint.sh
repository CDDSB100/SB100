#!/bin/sh

# 1. Passo de Cópia (requer root, o usuário inicial)
echo "Copiando o build do frontend para o volume persistido..."
cp -r /app/frontend/dist/. /frontend_build/

# 2. Executa o comando final como appuser.
# O `exec` substitui o processo shell, mantendo o PID 1.
# Garante que o PATH do appuser (do Dockerfile) seja respeitado.
echo "Iniciando a aplicação com appuser..."
exec su appuser -c 'uv run uvicorn api:app --host 0.0.0.0 --port 8000'
