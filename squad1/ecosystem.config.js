module.exports = {
  apps: [
    {
      name: "api-node",
      script: "./backend/server.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5173,
        MONGODB_URI: "mongodb://localhost:27017/cientometria",
        API_BASE_URL: "http://localhost:8000"
      }
    },
    {
      name: "api-python",
      script: "./backend/main.py",
      interpreter: "./backend/venv/bin/python",
      instances: 1,
      autorestart: true,
      env: {
        PORT: 8000
      }
    }
  ]
};
