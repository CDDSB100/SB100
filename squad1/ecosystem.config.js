const path = require('path');

module.exports = {
  apps: [
    {
      name: "api-node",
      script: "server.js",
      cwd: path.resolve(__dirname, "backend"),
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
        PORT: 5173, // Única porta liberada no firewall
        API_BASE_URL: "http://localhost:8000",
        JWT_SECRET: "3u4Lsp/bXSWoc5zoAfEJAku6aa1GRFWqIn32zhHJgVs="
      }
    },
    {
      name: "api-llm",
      script: "main.py",
      cwd: path.resolve(__dirname, "backend"),
      interpreter: path.resolve(__dirname, "backend/venv/bin/python"),
      kill_timeout: 10000,
      restart_delay: 8000,
      env: {
        FASTAPI_PORT: 8000,
        QDRANT_URL: "http://localhost:6333",
        LLM_MODEL: "qwen/qwen3-8b"
      }
    }
  ]
};
