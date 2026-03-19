module.exports = {
  apps: [
    {
      name: "api-node",
      script: "./backend/server.js",
      interpreter: "/home/sb100/squad1/.nvm/versions/node/v20.20.1/bin/node",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      error_file: "./backend/logs/err.log",
      out_file: "./backend/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: 5173, // Usa a única porta liberada
        NETWORK_IP: "172.28.181.92",
        MONGODB_URI: "mongodb://172.28.181.92:27017/cientometria",
        API_BASE_URL: "http://172.28.181.92:8000"
      }
    },
    {
      name: "api-python",
      script: "./backend/main.py",
      interpreter: "./backend/venv/bin/python",
      instances: 1,
      autorestart: true,
      error_file: "./backend/logs/python-err.log",
      out_file: "./backend/logs/python-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        PORT: 8000,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        QDRANT_URL: process.env.QDRANT_URL,
        QDRANT_API_KEY: process.env.QDRANT_API_KEY,
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://172.28.181.92:11434/v1",
        LLM_MODEL: "llama3.1:8b"
      }
    }
  ]
};
