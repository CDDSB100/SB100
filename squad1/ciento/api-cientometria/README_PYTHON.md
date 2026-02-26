# Configuração do Ambiente Python para LLM e Categorização

Este projeto utiliza um serviço em Python (FastAPI) para realizar a extração de metadados e categorização de artigos.

## Requisitos

- Python 3.10+
- pip (gerenciador de pacotes do Python)

## Instalação das Dependências

Para que o servidor Node.js consiga iniciar o serviço Python sem erros, você deve instalar as bibliotecas necessárias:

```bash
pip install -r requirements.txt
```

Ou manualmente:

```bash
pip install fastapi uvicorn pydantic qdrant-client openai pypdf sentence-transformers
```

## Resolução de Problemas

### ModuleNotFoundError: No module named 'openai'
Este erro indica que a biblioteca `openai` não está instalada no ambiente Python global ou no ambiente virtual que o Node.js está tentando usar.

Se você usa ambientes virtuais (venv), certifique-se de ativá-lo antes de rodar o servidor Node, ou aponte o comando de spawn no `server.js` para o binário correto do python dentro do venv.

### ECONNREFUSED 127.0.0.1:8000
Este erro ocorre quando o servidor Node tenta se comunicar com o serviço Python na porta 8000, mas o serviço não está rodando (geralmente devido a falha na inicialização por falta de dependências).

## Como o serviço é iniciado
O `server.js` inicia o serviço automaticamente usando:
`python3 -m uvicorn src.utils.llm:app --host 0.0.0.0 --port 8000`
