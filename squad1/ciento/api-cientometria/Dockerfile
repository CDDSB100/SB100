FROM node:20-slim

# Instala Python e dependências de sistema para bibliotecas de ML/PDF
RUN apt-get update && apt-get install -y 
    python3 
    python3-pip 
    python3-venv 
    build-essential 
    libsqlite3-dev 
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências do Node.js
COPY package*.json ./
RUN npm install --production

# Instala dependências do Python em um ambiente virtual
COPY requirements.txt ./
RUN python3 -m venv venv
RUN ./venv/bin/pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

# Expõe as portas do Node.js (5001) e FastAPI (8000)
EXPOSE 5001 8000

# O script 'start' do package.json já deve iniciar o Node e o FastAPI em background
CMD ["npm", "start"]
