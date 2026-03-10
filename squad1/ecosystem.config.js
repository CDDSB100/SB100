module.exports = {
  apps: [
    {
      name: "api-node",
      script: "./backend/server.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
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
      env: {
        PORT: 8000
      }
    },
    {
      name: "frontend",
      script: "npm",
      args: "run dev -- --port 5173 --host 0.0.0.0",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
