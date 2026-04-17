module.exports = {
  apps: [
    {
      name: "api-node",
      script: "./api-cientometria/server.js",
      env: {
        NODE_ENV: "development",
        PORT: 5001,
        MONGODB_URI: "mongodb://localhost:27017/cientometria",
        API_BASE_URL: "http://localhost:8000",
        JWT_SECRET: "chave-local-123"
      }
    },
    {
      name: "api-python",
      script: "main.py",
      cwd: "./api-cientometria",
      interpreter: "python3",
      env: {
        PORT: 8000,
        QDRANT_URL: "http://localhost:6333",
        LLM_MODEL: "llama3.1:8b"
      }
    },
    {
      name: "frontend",
      script: "npm",
      args: "run dev -- --port 3000",
      cwd: "./frontend",
      env: {
        VITE_API_URL: "http://localhost:5001"
      }
    }
  ]
};
