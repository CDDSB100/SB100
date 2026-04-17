# Dockerfile para Node.js (Backend)
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY api-cientometria/package*.json ./
RUN npm install --production
COPY api-cientometria/ .
EXPOSE 5001
CMD ["node", "server.js"]
