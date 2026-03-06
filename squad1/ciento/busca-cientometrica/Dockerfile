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

# O Nginx padrão servirá os arquivos estáticos na porta 80 do contêiner.
# (Em ambientes de produção reais, você copiaria um nginx.conf personalizado aqui 
#  para lidar com o roteamento SPA (fallback para index.html), como:
#  COPY nginx.conf /etc/nginx/conf.d/default.conf)

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
