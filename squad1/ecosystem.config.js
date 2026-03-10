module.exports = {
  apps: [
    {
      name: "api-node",
      script: "./backend/server.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
        MONGODB_URI: "mongodb://localhost:27017/cientometria",
        API_BASE_URL: "http://localhost:8000"
      }
    },
    {
      name: "api-python",
      script: "main.py",
      cwd: "./backend",
      interpreter: "./backend/venv/bin/python",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        PORT: 8000
      }
    },
    {
      name: "frontend",
      script: "serve",
      env: {
        PM2_SERVE_PATH: "./frontend/dist",
        PM2_SERVE_PORT: 5173,
        PM2_SERVE_SPA: "true",
        PM2_SERVE_HOMEPAGE: "/index.html"
      }
    }
  ]
};
