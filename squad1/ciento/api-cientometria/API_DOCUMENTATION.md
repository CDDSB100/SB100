# Documentação da API - Busca Cientométrica

Esta API foi construída com Node.js e Express para gerenciar buscas cientométricas, curadoria de artigos e autenticação de usuários.

## Base URL

O servidor roda por padrão na porta `5001`.

```
http://127.0.0.1:5001
```

## Autenticação

A API utiliza **JWT (JSON Web Token)** para proteger rotas sensíveis.
O token deve ser enviado no header `Authorization` de todas as requisições protegidas.

**Formato do Header:**
```
Authorization: Bearer <SEU_TOKEN_DE_ACESSO>
```

---

## Endpoints

### 1. Autenticação

#### `POST /api/login`
Autentica um usuário e retorna um token de acesso.

**Corpo da Requisição (JSON):**
```json
{
  "username": "admin",
  "password": "sua_senha"
}
```

**Resposta (Sucesso - 200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**Resposta (Erro - 401 Unauthorized):**
```json
{
  "error": "Credenciais inválidas."
}
```

---

### 2. Busca de Artigos

#### `POST /api/search`
Realiza uma busca na base do OpenAlex.

**Requer Autenticação:** Sim

**Corpo da Requisição (JSON):**
```json
{
  "search_terms": "machine learning",
  "start_year": 2020,
  "end_year": 2024
}
```

*   `search_terms` (string): Termos para busca.
*   `start_year` (int): Ano inicial.
*   `end_year` (int): Ano final.

**Resposta (Sucesso - 200 OK):**
Retorna uma lista de objetos contendo os metadados dos artigos encontrados.

---

### 3. Salvar Artigos

#### `POST /api/save`
Salva os artigos selecionados para processamento posterior (ex: Google Sheets ou Banco de Dados Local).

**Requer Autenticação:** Sim

**Corpo da Requisição (JSON):**
```json
{
  "selected_rows": [
    {
      "title": "Exemplo de Artigo",
      "authors": "Autor A, Autor B",
      "publication_year": 2023,
      "doi": "10.1234/exemplo"
      // ... outros campos do artigo
    }
  ]
}
```

**Resposta (Sucesso - 200 OK):**
```json
{
  "message": "Dados salvos com sucesso.",
  "count": 1
}
```

---

### 4. Curadoria

#### `POST /api/trigger-curation`
Dispara o processo de curadoria automática para todos os artigos pendentes.
Este processo geralmente envolve o uso de LLMs para analisar os artigos.

**Requer Autenticação:** Sim

**Corpo da Requisição:** Vazio `{}`

**Resposta (Sucesso - 200 OK):**
Retorna o resultado da execução da curadoria.

#### `POST /api/trigger-curation-single`
Dispara a curadoria para uma linha específica (um único artigo).

**Requer Autenticação:** Sim

**Corpo da Requisição (JSON):**
```json
{
  "row_number": 2
}
```

**Resposta (Sucesso - 200 OK):**
Retorna o resultado da curadoria para aquele artigo específico.

#### `GET /api/curation`
Retorna a lista de artigos que já passaram pelo processo de curadoria.

**Requer Autenticação:** Sim

**Resposta (Sucesso - 200 OK):**
Lista JSON com os artigos curados.

---

## Configuração e Execução

### Pré-requisitos
*   Node.js instalado
*   Dependências instaladas via `npm install`

### Rodando o servidor
Para iniciar o servidor:
```bash
cd api-node
npm start
```
O servidor estará disponível em `http://127.0.0.1:5001`.
