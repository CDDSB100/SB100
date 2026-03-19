const express = require("express");
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const os = require('os');
const { spawn } = require('child_process');

// Tenta carregar o .env de vários locais possíveis para garantir funcionamento no servidor
const envPath = fsSync.existsSync(path.join(__dirname, '.env')) 
  ? path.join(__dirname, '.env')
  : path.join(process.cwd(), '.env');

require('dotenv').config({ path: envPath });

const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const {
  searchOpenAlex,
  saveData,
  getCuratedArticles,
  getArticlesByStatus,
  getArticleByName,
  executarCuradoriaLocalmente,
  executarCuradoriaLinhaUnica,
  executarCategorizacaoLinhaUnica,
  findFileInFolders,
  deleteRow,
  deleteUnavailableRows,
  manualInsert,
  fixMissingTitles,
  aprovarManualmente,
  reprovarManualmente,
  updateArticle,
  processZipUpload,
  processDriveFolderForBatchInsert,
  uploadFileToDrive,
  downloadCuratedDocuments,
} = require("./src/services/api_logic.js");
const { pool, initDb, saltRounds } = require("./src/services/database.js"); // Import saltRounds
const { extractMetadata, ALL_METADATA_FIELDS } = require("./src/controllers/metadata_controller.js"); // Importar o novo controller e os campos
const multer = require("multer"); // Importar multer
const { swaggerUi, specs, swaggerOptions } = require('./swagger'); // Importar Swagger

// Progress tracking for batch processes
let batchProgress = {
  total: 0,
  current: 0,
  processed: 0,
  errors: 0,
  skipped: 0,
  status: 'idle', // 'idle', 'processing', 'completed'
  message: ''
};

// Configuração do Multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
// allow the port to be overridden (useful for dev vs prod)
const port = process.env.PORT || 5173;

// Proxy para o Backend Python (API de IA/Extração) na porta 8000
app.use('/api-python', createProxyMiddleware({
  target: process.env.API_BASE_URL || 'http://127.0.0.1:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api-python': '', // remove /api-python ao enviar para o python
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY] Forwarding ${req.method} ${req.url} to Python API`);
  }
}));

// Helper to compute network base URL (http://<ip>:<port>)
function computeNetworkBaseUrl() {
  if (process.env.NETWORK_IP) {
    return `http://${process.env.NETWORK_IP}:${port}`;
  }
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    for (const iface of networkInterfaces[interfaceName]) {
      if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
        return `http://${iface.address}:${port}`;
      }
    }
  }
  return `http://localhost:${port}`;
}

// store initial base URL (will be refreshed on server start)
app.locals.baseNetworkUrl = computeNetworkBaseUrl();



// Em um app real, use uma variável de ambiente (process.env.JWT_SECRET)
const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-super-dificil-de-adivinhar";

// Inicializa o banco de dados e o usuário admin (se necessário)
initDb();

app.use(bodyParser.json());

// Configuração explícita do CORS para permitir acesso externo
app.use(cors({
  origin: "*", // Permite todas as origens (ideal para dev e servidor externo)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Middleware para permitir recursos externos
app.use((req, res, next) => {
  // Permitir CORS para todas as origens
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  
  // Headers de segurança básicos (sem bloquear recursos)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  next();
});

// Middleware para Log de todas as requisições (ajuda no debug do Vercel)
app.use((req, res, next) => {
  console.log(`[API CALL] ${req.method} ${req.url}`);
  next();
});

// Configurar rota do Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Rota personalizada para o JS do Swagger que carrega o token automaticamente
app.get('/api-docs/custom.js', (req, res) => {
  res.type('application/javascript');
  res.send(`
    (function() {
      console.log("SB100 Swagger: Script carregado.");
      
      const applyToken = () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          console.log("SB100 Swagger: Token encontrado no localStorage. Aplicando...");
          if (window.ui && window.ui.authActions) {
            window.ui.authActions.authorize({
              bearerAuth: {
                name: 'bearerAuth',
                schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                value: token
              }
            });
          }
        } else {
          console.warn("SB100 Swagger: Nenhum token encontrado no localStorage desta porta (5001).");
          console.info("Dica: Se você logou na porta 5173, o localStorage não é compartilhado. Use o botão Authorize manualmente ou acesse o sistema pela porta 5001.");
        }
      };

      // Interceptar a criação do SwaggerUI para garantir que o interceptor de requisição seja aplicado
      const originalSwaggerUIBundle = window.SwaggerUIBundle;
      if (originalSwaggerUIBundle) {
        window.SwaggerUIBundle = function(config) {
          console.log("SB100 Swagger: Configurando interceptor de requisição...");
          const originalInterceptor = config.requestInterceptor;
          config.requestInterceptor = function(req) {
            const token = localStorage.getItem('accessToken');
            if (token && !req.headers.Authorization) {
              req.headers.Authorization = "Bearer " + token;
            }
            return originalInterceptor ? originalInterceptor(req) : req;
          };
          
          const ui = originalSwaggerUIBundle(config);
          window.ui = ui;
          // Tenta aplicar o token assim que a UI estiver pronta
          setTimeout(applyToken, 500);
          return ui;
        };
        Object.assign(window.SwaggerUIBundle, originalSwaggerUIBundle);
      }

      window.addEventListener('load', () => setTimeout(applyToken, 1000));
    })();
  `);
});

// Se existir uma build do front-end (agora em frontend/dist), servir os arquivos estáticos
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (fsSync.existsSync(frontendBuildPath)) {
  console.log(`> Servindo frontend estático de ${frontendBuildPath}`);
  // servir sem cache para evitar antigos conteúdos em browsers
  app.use(express.static(frontendBuildPath, { maxAge: 0, setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }}));
  // Qualquer rota não-API deve retornar index.html para roteamento do React
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) return next();
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// --- AUTH MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Tenta pegar o token do header ou da query string (útil para iframes/previews)
  const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

  if (token == null) {
    return res.status(401).json({ error: "Token não fornecido." }); // Unauthorized
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      console.error("JWT Verify Error:", err.message);
      return res.status(403).json({ error: "Token inválido." }); // Forbidden
    }
    
    try {
      console.log(`Autenticando usuário ID: ${decodedUser.id}`);
      // Buscar dados atualizados do usuário, incluindo permissões
      const [rows] = await pool.execute("SELECT id, username, role, allowed_categories FROM users WHERE id = ?", [parseInt(decodedUser.id, 10)]);
      
      if (rows.length === 0) {
        console.warn(`Usuário ID ${decodedUser.id} não encontrado no banco.`);
        return res.status(401).json({ error: "Usuário não encontrado ou inativo." });
      }
      
      const user = rows[0];
      // Tentar parsear allowed_categories se for uma string JSON
      if (user.allowed_categories) {
        try {
          user.allowed_categories = JSON.parse(user.allowed_categories);
        } catch (e) {
          // Se não for JSON, tratar como string simples (ou array se já for)
        }
      }
      
      req.user = user;
      next();
    } catch (dbErr) {
      console.error("Erro ao verificar usuário no middleware:", dbErr.message);
      res.status(500).json({ error: "Erro interno do servidor." });
    }
  });
};

// Middleware para verificar se o usuário é administrador
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." }); // Forbidden
  }
};

// Middleware para verificar se o usuário tem permissão para modificar dados (bloqueia 'visualizador')
const authorizeModify = (req, res, next) => {
  const nonModifyingRoles = ['visualizador'];
  if (req.user && !nonModifyingRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: "Acesso negado. Seu perfil tem permissão apenas de visualização." }); // Forbidden
  }
};

// --- API ROUTES ---

/**
 * @swagger
 * /api/documents/{filename}:
 *   get:
 *     summary: Serve um documento PDF
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo PDF
 *     responses:
 *       200:
 *         description: Arquivo PDF enviado com sucesso
 *       404:
 *         description: Arquivo não encontrado
 */
app.get("/api/documents/:filename", authenticateToken, (req, res) => {
  const { filename } = req.params;
  const filePath = findFileInFolders(filename);

  if (filePath) {
    res.sendFile(filePath);
  } else {
    console.error(`[404] Arquivo não encontrado: ${filename}`);
    res.status(404).send("Arquivo não encontrado.");
  }
});

app.get("/", (req, res) => {
  res.send("Node.js API server is running. Use /api/login para autenticar.");
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica o status da API
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: API está online
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * @swagger
 * /api/base-url:
 *   get:
 *     summary: Retorna a URL base do servidor
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: URL base retornada
 */
app.get('/api/base-url', (req, res) => {
  const base = app.locals.baseNetworkUrl || `http://localhost:${port}`;
  res.json({ baseUrl: base });
});

// --- Rota de Login ---
/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Autentica um usuário e retorna um token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Credenciais inválidas
 */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN] Tentativa de login para usuário: ${username}`);

  if (!username || !password) {
    console.log("[LOGIN] Falha: Usuário ou senha não fornecidos.");
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  try {
    const sql = `SELECT *, CAST(id AS TEXT) as id_str FROM users WHERE username = ?`;
    const [rows] = await pool.execute(sql, [username]);

    const user = rows[0];

    if (!user) {
      console.log(`[LOGIN] Falha: Usuário '${username}' não encontrado no banco.`);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Compara a senha fornecida com o hash armazenado
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      console.log(`[LOGIN] Falha: Senha incorreta para o usuário '${username}'.`);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    console.log(`[LOGIN] Sucesso: Usuário '${username}' autenticado.`);
    // Gerar o Token JWT
    const userPayload = { username: user.username, id: user.id_str, role: user.role };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: "1h",
    }); // Token expira em 1 hora

    res.json({ accessToken: accessToken });
  } catch (err) {
    console.error("[LOGIN] Erro no banco de dados:", err.message);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- Rota de Registro de Usuário (Apenas para Admin) ---
/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registra um novo usuário (Apenas Admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 */
app.post("/api/register", authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  // Validação simples de role
  const validRoles = ['admin', 'cientometria', 'curadoria_citros_cana', 'curadoria_solos', 'visualizador'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Role inválida. Roles permitidas: ${validRoles.join(', ')}.` });
  }

  // Atribuição automática de categorias baseada no Role
  let allowedCategories = null;
  if (role === 'curadoria_citros_cana') {
    allowedCategories = JSON.stringify(["citros e cana"]);
  } else if (role === 'curadoria_solos') {
    allowedCategories = JSON.stringify(["solos"]);
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash, role, is_active, allowed_categories) VALUES (?, ?, ?, ?, 1, ?)",
      [username, email, hash, role, allowedCategories]
    );
    res.status(201).json({ message: "Usuário registrado com sucesso!", userId: result.insertId });
  } catch (err) {
    console.error("Erro ao registrar usuário:", err.message);
    if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: "Nome de usuário ou e-mail já existe." });
    }
    res.status(500).json({ error: "Erro interno do servidor ao registrar usuário." });
  }
});

// --- Rota para Listar Usuários (Admin) ---
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os usuários (Apenas Admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
app.get("/api/users", authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id, username, email, role, is_active, allowed_categories FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar usuários:", err.message);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- Rota para Excluir Usuário (Admin) ---
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Exclui um usuário (Apenas Admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário excluído com sucesso
 */
app.delete("/api/users/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.execute("DELETE FROM users WHERE id = ?", [id]);
    res.json({ message: "Usuário excluído com sucesso!" });
  } catch (err) {
    console.error("Erro ao excluir usuário:", err.message);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- Rota para Atualizar Permissões do Usuário (Admin) ---
/**
 * @swagger
 * /api/users/{id}/permissions:
 *   put:
 *     summary: Atualiza permissões de um usuário (Apenas Admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               allowed_categories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Permissões atualizadas com sucesso
 */
app.put("/api/users/:id/permissions", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, allowed_categories } = req.body;

  try {
    // allowed_categories deve ser um array or string (vamos converter para string JSON se for array)
    const categoriesStr = Array.isArray(allowed_categories) ? JSON.stringify(allowed_categories) : (allowed_categories || null);
    
    await pool.execute(
      "UPDATE users SET role = ?, allowed_categories = ? WHERE id = ?",
      [role, categoriesStr, id]
    );
    res.json({ message: "Permissões atualizadas com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar permissões:", err.message);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- Rotas Protegidas ---

/**
 * @swagger
 * /api/trigger-curation:
 *   post:
 *     summary: Inicia o processo de curadoria em lote
 *     tags: [Curadoria]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Processo iniciado
 */
app.post("/api/trigger-curation", authenticateToken, authorizeModify, async (req, res) => {
  try {
    // Aponte para a nova função de curadoria local
    const result = await executarCuradoriaLocalmente();
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/trigger-curation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/trigger-curation-single:
 *   post:
 *     summary: Inicia a curadoria para uma linha específica
 *     tags: [Curadoria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               row_number:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Processo iniciado
 */
app.post("/api/trigger-curation-single", authenticateToken, authorizeModify, async (req, res) => {
    try {
        const { row_number } = req.body;

        if (!row_number) {
            return res.status(400).json({ error: "Parâmetro 'row_number' é obrigatório." });
        }

        const result = await executarCuradoriaLinhaUnica(row_number);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/trigger-curation-single: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/categorize-single:
 *   post:
 *     summary: Categoriza uma linha específica via IA
 *     tags: [Curadoria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               row_number:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Categorização concluída
 */
app.post("/api/categorize-single", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const { row_number } = req.body;
    if (!row_number) {
      return res.status(400).json({ error: "Parâmetro 'row_number' é obrigatório." });
    }
    const result = await executarCategorizacaoLinhaUnica(row_number);
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/categorize-single: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/curation:
 *   get:
 *     summary: Retorna todos os artigos da curadoria
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de artigos
 */
app.get("/api/curation", authenticateToken, async (req, res) => {
  console.log(`[/api/curation] Request received from user: ${req.user ? req.user.username : 'unknown'}`);
  try {
    console.log("Fetching curated articles...");
    let articles = await getCuratedArticles();
    console.log(`Fetched ${articles.length} articles.`);
    
    // Filtrar por categoria se o usuário tiver permissões restritas (e não for admin)
    if (req.user && req.user.role !== 'admin' && req.user.allowed_categories) {
      console.log("Filtering articles by category...");
      try {
        const allowedCategories = req.user.allowed_categories;
        const allowed = (Array.isArray(allowedCategories) 
          ? allowedCategories 
          : [allowedCategories]
        )
        .filter(c => c !== null && c !== undefined)
        .map(c => String(c).trim().toLowerCase());
        
        console.log(`Filtrando artigos para o usuário ${req.user.username}. Categorias permitidas: ${allowed}`);
        
        if (allowed.length > 0) {
          articles = articles.filter(article => {
            if (!article) return false;
            const category = String(article["CATEGORIA"] || article["categoria"] || "").trim().toLowerCase();
            return allowed.some(a => a === category);
          });
        }
        console.log(`Filtered to ${articles.length} articles.`);
      } catch (filterErr) {
        console.error("Error during category filtering:", filterErr.message);
        // Continue with unfiltered articles if filter fails, or throw?
        // Better to throw to be safe
        throw filterErr;
      }
    }
    
    res.json(articles);
  } catch (error) {
    console.error(`Error in /api/curation: ${error.message}`);
    res.status(500).json({ error: "Erro ao carregar artigos da curadoria: " + error.message });
  }
});

/**
 * @swagger
 * /api/articles/search-by-name:
 *   get:
 *     summary: Busca artigos pelo nome (título)
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome ou parte do título do artigo
 *     responses:
 *       200:
 *         description: Lista de artigos encontrados com título, classificação e nome do arquivo
 *       400:
 *         description: Parâmetro name ausente
 */
app.get("/api/articles/search-by-name", authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: "O parâmetro 'name' é obrigatório." });
    }
    const results = await getArticleByName(name);
    res.json(results);
  } catch (error) {
    console.error(`Error in /api/articles/search-by-name: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/articles/status/{status}:
 *   get:
 *     summary: Busca artigos filtrados por status
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pending, approved_ia, approved_manual, rejected]
 *         description: Status do artigo
 *     responses:
 *       200:
 *         description: Lista de artigos filtrados
 */
app.get("/api/articles/status/:status", authenticateToken, async (req, res) => {
  const { status } = req.params;
  console.log(`[/api/articles/status/${status}] Request received from user: ${req.user ? req.user.username : 'unknown'}`);
  try {
    let articles = await getArticlesByStatus(status);
    
    // Filtrar por categoria se o usuário tiver permissões restritas (e não for admin)
    if (req.user && req.user.role !== 'admin' && req.user.allowed_categories) {
      const allowedCategories = req.user.allowed_categories;
      const allowed = (Array.isArray(allowedCategories) ? allowedCategories : [allowedCategories])
        .filter(c => c !== null && c !== undefined)
        .map(c => String(c).trim().toLowerCase());
      
      if (allowed.length > 0) {
        articles = articles.filter(article => {
          if (!article) return false;
          const category = String(article["CATEGORIA"] || article["categoria"] || "").trim().toLowerCase();
          return allowed.some(a => a === category);
        });
      }
    }
    
    res.json(articles);
  } catch (error) {
    console.error(`Error in /api/articles/status/${status}: ${error.message}`);
    res.status(500).json({ error: `Erro ao carregar artigos com status ${status}: ` + error.message });
  }
});

/**
 * @swagger
 * /api/download-all:
 *   get:
 *     summary: Faz download de todos os documentos da curadoria em um ZIP
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Arquivo ZIP com os documentos
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
app.get("/api/download-all", authenticateToken, async (req, res) => {
  try {
    const zipBuffer = await downloadCuratedDocuments();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', 'attachment; filename=documentos_curadoria.zip');
    res.send(zipBuffer);
  } catch (error) {
    console.error(`Error in /api/download-all: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  console.error(err.stack);
  res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
});

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Busca artigos no OpenAlex
 *     tags: [Busca]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search_terms:
 *                 type: string
 *               start_year:
 *                 type: integer
 *               end_year:
 *                 type: integer
 *               sort_option:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lista de resultados da busca
 */
app.post("/api/search", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const { search_terms, start_year, end_year, sort_option } = req.body;

    if (!search_terms) {
      return res
        .status(400)
        .json({ error: "Parameter 'search_terms' is missing." });
    }

    const startYearInt = parseInt(start_year, 10);
    const endYearInt = parseInt(end_year, 10);

    if (isNaN(startYearInt) || isNaN(endYearInt)) {
      return res
        .status(400)
        .json({
          error: "Parameters 'start_year' and 'end_year' must be integers.",
        });
    }

    const results = await searchOpenAlex(
      search_terms,
      startYearInt,
      endYearInt,
      sort_option
    );
    res.json(results);
  } catch (error) {
    console.error(`Error in /api/search: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/save:
 *   post:
 *     summary: Salva artigos selecionados no banco de dados
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selected_rows:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Resultado da operação de salvamento
 */
app.post("/api/save", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const { selected_rows } = req.body;

    if (
      !selected_rows ||
      !Array.isArray(selected_rows) ||
      selected_rows.length === 0
    ) {
      return res.status(400).json({ error: "No rows selected to save." });
    }

    const username = req.user ? req.user.username : "Desconhecido";
    const result = await saveData(selected_rows, username);
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/save: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/delete-row:
 *   post:
 *     summary: Exclui uma linha (artigo) específica
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               row_number:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Linha excluída com sucesso
 */
app.post("/api/delete-row", authenticateToken, authorizeModify, async (req, res) => {
    try {
        const { row_number } = req.body;
        if (!row_number) {
            return res.status(400).json({ error: "row_number is required" });
        }
        const result = await deleteRow(parseInt(row_number, 10));
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/delete-row: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/delete-unavailable:
 *   post:
 *     summary: Exclui todos os artigos sem arquivo PDF disponível
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpeza concluída
 */
app.post("/api/delete-unavailable", authenticateToken, authorizeModify, async (req, res) => {
    try {
        const result = await deleteUnavailableRows();
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/delete-unavailable: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// --- Rota para Inserção Manual (suporta upload de PDF) ---
/**
 * @swagger
 * /api/manual-insert:
 *   post:
 *     summary: Insere um artigo manualmente (suporta upload de PDF)
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               Titulo:
 *                 type: string
 *               Autor(es):
 *                 type: string
 *     responses:
 *       201:
 *         description: Artigo inserido com sucesso
 */
app.post("/api/manual-insert", authenticateToken, authorizeModify, upload.single('file'), async (req, res) => {
  try {
    // req.body contains form fields; req.file is optional
    const data = req.body || {};
    console.log('[/api/manual-insert] Received body keys:', Object.keys(req.body || {}));
    console.log('[/api/manual-insert] Received file?:', !!req.file, req.file ? req.file.originalname : null);

    // If a file was uploaded, save locally and set pub_url
    if (req.file) {
      const originalName = req.file.originalname || `upload-${Date.now()}.pdf`;
      const tmpPath = path.join(__dirname, "temp_uploads", `${Date.now()}-${originalName}`);
      
      // Ensure temp_uploads exists
      if (!fsSync.existsSync(path.join(__dirname, "temp_uploads"))) {
        fsSync.mkdirSync(path.join(__dirname, "temp_uploads"), { recursive: true });
      }

      await fs.writeFile(tmpPath, req.file.buffer);

      try {
        const localFileName = await uploadFileToDrive(null, tmpPath, originalName);
          if (localFileName) {
            // Store ONLY the filename in pub_url for local sheet compatibility
            data.pub_url = localFileName;
          }
      } catch (e) {
        console.error('Error saving file locally:', e.message);
      } finally {
        try { await fs.unlink(tmpPath); } catch (e) { /* ignore */ }
      }
    }

    // Normalize incoming keys to match expected headers (tolerant to encoding/acentuação issues)
    function canonical(str) {
      if (!str) return "";
      let s = str.toString();
      
      // Tenta consertar Mojibake comum (UTF-8 lido como ISO-8859-1)
      try {
        if (s.includes('Ã') || s.includes('©') || s.includes('ª') || s.includes('­')) {
           const b = Buffer.from(s, 'binary');
           const fixed = b.toString('utf8');
           // Só usa se a versão fixada for diferente e não parecer conter erros de decodificação massivos
           if (fixed !== s && !fixed.includes('')) {
             s = fixed;
           }
        }
      } catch (e) { /* ignore */ }

      return s
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    const incoming = req.body || {};
    // Criar um mapa de chaves normalizadas para as chaves originais do body
    const incomingNormalizedMap = {};
    Object.keys(incoming).forEach(k => {
      incomingNormalizedMap[canonical(k)] = k;
    });
    
    console.log('[/api/manual-insert] Body keys received:', Object.keys(incoming));

    // Expected keys as used by manualInsert (source of truth)
    const expectedKeys = [
      ...ALL_METADATA_FIELDS,
      'pub_url',
      'id',
      'work_id'
    ];

    // Build finalData with exact expected keys
    const finalData = {};
    expectedKeys.forEach((exp) => {
      // PROTEÇÃO: Campos exclusivos de humanos não devem ser preenchidos por normalização automática
      if (exp === "FEEDBACK DO CURADOR" || exp === "FEEDBACK SOBRE IA") {
        finalData[exp] = ""; 
        return;
      }

      const canonExp = canonical(exp);
      const originalKey = incomingNormalizedMap[canonExp];
      
      if (originalKey && incoming[originalKey] !== undefined && incoming[originalKey] !== "") {
        finalData[exp] = incoming[originalKey];
      } else if (exp === 'pub_url' && data.pub_url) {
        finalData[exp] = data.pub_url;
      } else {
        // Inicialização padrão para campos estruturados se necessário
        if (exp === "FEEDBACK DA IA") {
            finalData[exp] = { technical_summary: "N/A", agronomic_insights: "N/A", relevance_score: 0.0 };
        } else {
            finalData[exp] = "N/A"; 
        }
      }
    });

    // Fallback para Título se for N/A e tiver arquivo
    if ((finalData['Título'] === "N/A" || !finalData['Título']) && req.file) {
       finalData['Título'] = req.file.originalname.replace(/\.[^/.]+$/, "");
    }

    // Validação flexível
    if (!req.file) {
      const hasTitle = finalData['Título'] && finalData['Título'] !== "N/A";
      const hasAuthors = finalData['Autor(es)'] && finalData['Autor(es)'] !== "N/A";
      if (!hasTitle || !hasAuthors) {
        return res.status(400).json({ error: "Campos obrigatórios (Título, Autor(es)) não preenchidos." });
      }
    }

    const username = req.user ? req.user.username : "Desconhecido";
    const result = await manualInsert(finalData, username);

    if (result.status === "success") {
      res.status(201).json(result); // 201 Created
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error) {
    console.error(`Error in /api/manual-insert: ${error.message}`);
    res.status(500).json({ error: "Falha interna ao processar a solicitação." });
  }
});

/**
 * @swagger
 * /api/manual-approval:
 *   post:
 *     summary: Aprova um artigo manualmente
 *     tags: [Curadoria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               row_number:
 *                 type: string
 *               fileName:
 *                 type: string
 *               feedbackCurador:
 *                 type: string
 *     responses:
 *       200:
 *         description: Artigo aprovado com sucesso
 */
app.post("/api/manual-approval", authenticateToken, authorizeModify, async (req, res) => {
    try {
        const { row_number, fileName, feedbackCurador, feedbackSobreIA, aiAnalysisFeedback } = req.body;

        if (!row_number || !fileName) {
            return res.status(400).json({ error: "Parâmetros 'row_number' e 'fileName' são obrigatórios." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        // Convert row_number string to integer if it's numeric, otherwise pass as is (for MongoDB ObjectId)
        const id = isNaN(row_number) ? row_number : parseInt(row_number, 10);
        const result = await aprovarManualmente(id, fileName, username, feedbackCurador, feedbackSobreIA, aiAnalysisFeedback);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/manual-approval: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/manual-rejection:
 *   post:
 *     summary: Rejeita um artigo manualmente
 *     tags: [Curadoria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               row_number:
 *                 type: string
 *               fileName:
 *                 type: string
 *               feedbackCurador:
 *                 type: string
 *     responses:
 *       200:
 *         description: Artigo rejeitado com sucesso
 */
app.post("/api/manual-rejection", authenticateToken, authorizeModify, async (req, res) => {
    try {
        const { row_number, fileName, feedbackCurador, feedbackSobreIA, aiAnalysisFeedback } = req.body;

        if (!row_number || !fileName) {
            return res.status(400).json({ error: "Parâmetros 'row_number' e 'fileName' são obrigatórios." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        const id = isNaN(row_number) ? row_number : parseInt(row_number, 10);
        const result = await reprovarManualmente(id, fileName, username, feedbackCurador, feedbackSobreIA, aiAnalysisFeedback);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/manual-rejection: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/batch-upload-zip:
 *   post:
 *     summary: Faz upload de um ZIP com PDFs para inserção em lote
 *     tags: [Lote]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload e processamento iniciados
 */
app.post("/api/batch-upload-zip", authenticateToken, authorizeModify, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo ZIP foi enviado." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        
        // Reset progress
        batchProgress = {
          total: 0,
          current: 0,
          processed: 0,
          errors: 0,
          skipped: 0,
          status: 'processing',
          message: 'Iniciando processamento de ZIP...'
        };

        const result = await processZipUpload(req.file.buffer, username, (p) => {
          batchProgress = { ...batchProgress, ...p };
        });

        batchProgress.status = 'completed';
        batchProgress.message = result.message;
        res.json(result);
    } catch (error) {
        batchProgress.status = 'idle';
        batchProgress.message = 'Erro: ' + error.message;
        console.error(`Error in /api/batch-upload-zip: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/batch-process-local-folder:
 *   post:
 *     summary: Processa uma pasta local para inserção em lote
 *     tags: [Lote]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               folder_path:
 *                 type: string
 *     responses:
 *       200:
 *         description: Processamento iniciado
 */
app.post("/api/batch-process-local-folder", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const { folder_path } = req.body;
    if (!folder_path) {
      return res.status(400).json({ error: "O 'folder_path' é obrigatório." });
    }

    const username = req.user ? req.user.username : "Desconhecido";
    
    // Reset progress
    batchProgress = {
      total: 0,
      current: 0,
      processed: 0,
      errors: 0,
      skipped: 0,
      status: 'processing',
      message: 'Escaneando pasta local...'
    };

    const result = await processDriveFolderForBatchInsert(folder_path, username, (p) => {
      batchProgress = { ...batchProgress, ...p };
    });

    batchProgress.status = 'completed';
    batchProgress.message = result.message;
    res.json(result);
  } catch (error) {
    batchProgress.status = 'idle';
    batchProgress.message = 'Erro: ' + error.message;
    console.error(`Error in /api/batch-process-local-folder: ${error.message}`);
    res.status(500).json({ error: "Falha interna ao iniciar o processamento em lote." });
  }
});

/**
 * @swagger
 * /api/batch-progress:
 *   get:
 *     summary: Retorna o progresso do processamento em lote
 *     tags: [Lote]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progresso atual
 */
app.get("/api/batch-progress", authenticateToken, (req, res) => {
  res.json(batchProgress);
});

// --- Nova Rota para Extração de Metadados ---
/**
 * @swagger
 * /api/extract-metadata:
 *   post:
 *     summary: Extrai metadados de um PDF ou título
 *     tags: [Metadados]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Metadados extraídos
 */
app.post("/api/extract-metadata", authenticateToken, authorizeModify, upload.single('file'), extractMetadata);

// --- Nova Rota para Corrigir Títulos ---
/**
 * @swagger
 * /api/fix-titles:
 *   post:
 *     summary: Corrige títulos ausentes na curadoria
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Títulos corrigidos
 */
app.post("/api/fix-titles", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const result = await fixMissingTitles();
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/fix-titles: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     summary: Atualiza um artigo existente
 *     tags: [Artigos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do artigo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Artigo atualizado com sucesso
 */
app.put("/api/articles/:id", authenticateToken, authorizeModify, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await updateArticle(id, data);
    res.json(result);
  } catch (error) {
    console.error(`Error in PUT /api/articles/:id: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});



// --- DEBUG ROUTE ---
app.get("/api/test-no-auth", async (req, res) => {
  try {
    const articles = await getCuratedArticles();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * @swagger
 * /api/llm-logs:
 *   get:
 *     summary: Retorna os logs do serviço LLM
 *     tags: [Sistema]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs retornados
 */
app.get("/api/llm-logs", authenticateToken, async (req, res) => {
    const logPath = path.join(__dirname, "llm.log");
    try {
        if (!fsSync.existsSync(logPath)) {
            return res.json({ logs: "Arquivo de log ainda não criado ou vazio." });
        }
        const logs = await fs.readFile(logPath, "utf8");
        // Retorna as últimas 200 linhas
        const lines = logs.split("\n").slice(-200).join("\n");
        res.json({ logs: lines });
    } catch (error) {
        console.error("Erro ao ler logs da LLM:", error.message);
        res.status(500).json({ error: "Falha ao recuperar logs." });
    }
});

// --- SERVER START ---

app.listen(port, "0.0.0.0", () => {
  console.log(`\n  API SERVER READY`);
  console.log(`  ➜  PORT:    ${port}`);
  
  const displayNetworkUrl = app.locals.baseNetworkUrl || `http://localhost:${port}`;
  console.log(`  ➜  Network: ${displayNetworkUrl}`);
  console.log("\n  Servidor pronto e servindo Frontend + API na porta 5173.\n");
});

// Exportar o app para compatibilidade correta com Vercel
module.exports = app;
