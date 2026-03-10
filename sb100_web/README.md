# AI Agent for Query Decomposition and Async Retrieval in Qdrant

This project implements an AI agent that performs query decomposition using LLM and asynchronous retrieval from Qdrant vector database.

## Features

- **Query Decomposition**: Uses Gemini 2.0 Flash Lite via LiteLLM to break down complex questions into multiple simpler queries
- **Async Retrieval**: Asynchronously retrieves relevant documents from Qdrant for each query
- **RAG Pipeline**: Combines retrieved context to generate accurate answers

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   export GOOGLE_API_KEY="your-google-api-key"
   
   # For Qdrant Cloud (get from https://cloud.qdrant.io/):
   export QDRANT_API_KEY="your-qdrant-api-key"
   export QDRANT_URL="your-qdrant-cluster-url"
   
   # Leave empty for local Qdrant
   ```

3. Set up Qdrant:
   - **For Cloud Qdrant**: 
     - Create account at [Qdrant Cloud](https://cloud.qdrant.io/)
     - Create a cluster and get API key + URL
     - Create collection "sb100_v2" with your data
   - **For Local Qdrant**: 
     - Run: `docker run -p 6333:6333 qdrant/qdrant`
     - Leave QDRANT_API_KEY and QDRANT_URL empty

## Troubleshooting

### 🔑 API Key Issues

**403 Forbidden from Qdrant:**
- Go to [Qdrant Cloud](https://cloud.qdrant.io/)
- Regenerate your API key
- Update your `.env` file with the new key

**Gemini API Key Invalid:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Create or verify your API key
- Make sure billing is enabled for your Google Cloud project

### 🐳 Local Development

For testing without API keys, use local Qdrant:

```bash
# Remove cloud credentials from .env
# QDRANT_API_KEY=
# QDRANT_URL=

# Run local Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Create collection
curl -X PUT http://localhost:6333/collections/sb100_v2 \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

## Usage

Run the main script:
```bash
python main.py
```

Enter your question when prompted, and the system will:
1. Decompose the query if needed
2. Retrieve relevant documents asynchronously
3. Generate a final answer based on the context

## Project Structure

- `main.py`: Entry point
- `flow.py`: Defines the workflow
- `nodes.py`: Implements the nodes (Input, Decomposition, Retrieval, Answer)
- `utils/`: Utility functions
  - `call_llm.py`: LLM interaction via LiteLLM (Gemini 2.0 Flash Lite)
  - `vectordb.py`: Qdrant operations with Gemini embeddings via LiteLLM
- `docs/design.md`: Design documentation
