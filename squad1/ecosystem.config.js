module.exports = {
  apps: [
    {
      name: "api-node",
      script: "server.js",

      cwd: "./backend",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: 5173,
        NETWORK_IP: process.env.NETWORK_IP,
      MONGODB_URI: process.env.MONGODB_URI,
        API_BASE_URL: process.env.API_BASE_URL
      }
    },
    {
      name: "api-python",
      script: "main.py",
      cwd: "./backend",
      interpreter: "python3",
      instances: 1,
      autorestart: true,
      error_file: "./logs/python-err.log",
      out_file: "./logs/python-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        PORT: 8000,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        QDRANT_URL: process.env.QDRANT_URL,
        QDRANT_API_KEY: process.env.QDRANT_API_KEY,
        OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
        LLM_MODEL: process.env.LLM_MODEL || "llama3.1:8b"
      }
    }
  ]
};
