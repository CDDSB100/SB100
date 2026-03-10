cp .env.example .env

cd frontend

npm ci

npm run build

cd ..

sudo docker compose up --build
