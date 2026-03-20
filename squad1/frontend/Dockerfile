FROM node:20-slim AS builder

WORKDIR /app

# Copia arquivos de package e instala dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Argumento para o proxy da API durante o build (se necessário para Vite)
ARG VITE_API_TARGET
ENV VITE_API_TARGET=$VITE_API_TARGET

# Faz o build da aplicação React
RUN npm run build

# Stage 2: Serve com Nginx
FROM nginx:alpine

# Copia o build do React para o diretório padrão do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia a configuração personalizada do Nginx para lidar com SPA e proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
