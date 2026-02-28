FROM node:20-slim

WORKDIR /app

# Copia arquivos de package e instala dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta do Vite
EXPOSE 5173

# Roda o Vite em modo desenvolvimento com host 0.0.0.0 para ser acessível via Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
