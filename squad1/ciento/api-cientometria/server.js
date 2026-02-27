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
  executarCuradoriaLocalmente,
  executarCuradoriaLinhaUnica,
  executarCategorizacaoLinhaUnica,
  findFileInFolders,
  deleteRow,
  deleteUnavailableRows,
  manualInsert,
  aprovarManualmente,
  reprovarManualmente,
  processZipUpload,
  processDriveFolderForBatchInsert,
  uploadFileToDrive,
} = require("./src/services/api_logic.js");
const { pool, initDb, saltRounds } = require("./src/services/database.js"); // Import saltRounds
const { extractMetadata } = require("./src/controllers/metadata_controller.js"); // Importar o novo controller
const multer = require("multer"); // Importar multer

// Configuração do Multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const app = express();
// allow the port to be overridden (useful for dev vs prod)
const port = process.env.PORT || 5001;

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
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// --- AUTH MIDDLEWARE ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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

// --- API ROUTES ---

// Rota dinâmica para servir documentos buscando em múltiplas pastas (raiz, aprovados, reprovados)
app.get("/documents/:filename", (req, res) => {
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

// --- Rota de Health Check ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Rota que retorna a URL base de rede que o backend está usando (útil para o frontend montar links)
app.get('/api/base-url', (req, res) => {
  const base = app.locals.baseNetworkUrl || `http://localhost:${port}`;
  res.json({ baseUrl: base });
});

// --- Rota de Login ---
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  try {
    const sql = `SELECT *, CAST(id AS TEXT) as id_str FROM users WHERE username = ?`;
    const [rows] = await pool.execute(sql, [username]);

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Compara a senha fornecida com o hash armazenado
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    // Gerar o Token JWT
    const userPayload = { username: user.username, id: user.id_str, role: user.role };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, {
      expiresIn: "1h",
    }); // Token expira em 1 hora

    res.json({ accessToken: accessToken });
  } catch (err) {
    console.error("Erro no login (db):", err.message);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// --- Rota de Registro de Usuário (Apenas para Admin) ---
app.post("/api/register", authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  // Validação simples de role
  const validRoles = ['admin', 'cientometria', 'curadoria_citros_cana', 'curadoria_solos'];
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
app.put("/api/users/:id/permissions", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, allowed_categories } = req.body;

  try {
    // allowed_categories deve ser um array ou string (vamos converter para string JSON se for array)
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

app.post("/api/trigger-curation", authenticateToken, async (req, res) => {
  try {
    // Aponte para a nova função de curadoria local
    const result = await executarCuradoriaLocalmente();
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/trigger-curation: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trigger-curation-single", authenticateToken, async (req, res) => {
    try {
        const { row_number } = req.body;

        if (!row_number || isNaN(parseInt(row_number, 10))) {
            return res.status(400).json({ error: "Parâmetro 'row_number' é obrigatório e deve ser um número." });
        }

        const result = await executarCuradoriaLinhaUnica(parseInt(row_number, 10));
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/trigger-curation-single: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/categorize-single", authenticateToken, async (req, res) => {
  try {
    const { row_number } = req.body;
    if (!row_number || isNaN(parseInt(row_number, 10))) {
      return res.status(400).json({ error: "Parâmetro 'row_number' é obrigatório e deve ser um número." });
    }
    const result = await executarCategorizacaoLinhaUnica(parseInt(row_number, 10));
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/categorize-single: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

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

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);
  console.error(err.stack);
  res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
});

app.post("/api/search", authenticateToken, async (req, res) => {
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

app.post("/api/save", authenticateToken, async (req, res) => {
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

app.post("/api/delete-row", authenticateToken, async (req, res) => {
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

app.post("/api/delete-unavailable", authenticateToken, async (req, res) => {
    try {
        const result = await deleteUnavailableRows();
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/delete-unavailable: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// --- Rota para Inserção Manual (suporta upload de PDF) ---
app.post("/api/manual-insert", authenticateToken, upload.single('file'), async (req, res) => {
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
            const base = app.locals.baseNetworkUrl || `http://localhost:${port}`;
            // ensure filename is safely encoded in URL
            data.pub_url = `${base}/documents/${encodeURIComponent(localFileName)}`;
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
      return str
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    }

    const incoming = req.body || {};
    const canonicalMap = {}; // canonicalKey -> originalKey
    Object.keys(incoming).forEach((k) => {
      canonicalMap[canonical(k)] = k;
    });

    // Expected keys as used by manualInsert (source of truth)
    const expectedKeys = [
      'Autor(es)', 'Título', 'Subtítulo', 'Ano', 'Número de citações recebidas (Google Scholar)',
      'Palavras-chave', 'Resumo', 'Tipo de documento', 'Editora', 'Instituição', 'Local', 'Tipo de trabalho',
      'Título do periódico', 'Quartil do periódico', 'Volume', 'Número/fascículo', 'Páginas', 'DOI', 'Numeração', 'Qualis', 'pub_url'
    ];

    // Build finalData with exact expected keys, pulling from incoming using canonical matching
    const finalData = {};
    expectedKeys.forEach((exp) => {
      const key = canonicalMap[canonical(exp)];
      finalData[exp] = key ? incoming[key] : undefined;
    });

    // Validação simples dos dados recebidos (usando finalData)
    if (!finalData['Título'] || !finalData['Autor(es)'] || !finalData.Ano || !finalData['Título do periódico'] && !finalData['Título do periódico']) {
      // Note: some environments may lose accents; also accept 'Titulo' and 'Titulo do periodico' etc.
      const hasTitle = finalData['Título'] || finalData['Título do periódico'] || finalData['Título do periódico'];
      if (!finalData['Título'] || !finalData['Autor(es)'] || !finalData.Ano || !hasTitle) {
        return res.status(400).json({ error: "Campos obrigatórios (Título, Autor(es), Ano, Título do periódico) não preenchidos." });
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

app.post("/api/manual-approval", authenticateToken, async (req, res) => {
    try {
        const { row_number, fileName } = req.body; // Use fileName for local

        if (!row_number || !fileName) {
            return res.status(400).json({ error: "Parâmetros 'row_number' e 'fileName' são obrigatórios." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        const result = await aprovarManualmente(parseInt(row_number, 10), fileName, username);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/manual-approval: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/manual-rejection", authenticateToken, async (req, res) => {
    try {
        const { row_number, fileName } = req.body;

        if (!row_number || !fileName) {
            return res.status(400).json({ error: "Parâmetros 'row_number' e 'fileName' são obrigatórios." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        const result = await reprovarManualmente(parseInt(row_number, 10), fileName, username);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/manual-rejection: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/batch-upload-zip", authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo ZIP foi enviado." });
        }

        const username = req.user ? req.user.username : "Desconhecido";
        const result = await processZipUpload(req.file.buffer, username);
        res.json(result);
    } catch (error) {
        console.error(`Error in /api/batch-upload-zip: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/batch-process-local-folder", authenticateToken, async (req, res) => {
  try {
    const { folder_path } = req.body;
    if (!folder_path) {
      return res.status(400).json({ error: "O 'folder_path' é obrigatório." });
    }

    const username = req.user ? req.user.username : "Desconhecido";
    const result = await processDriveFolderForBatchInsert(folder_path, username);
    res.json(result);
  } catch (error) {
    console.error(`Error in /api/batch-process-local-folder: ${error.message}`);
    res.status(500).json({ error: "Falha interna ao iniciar o processamento em lote." });
  }
});

// --- Nova Rota para Extração de Metadados ---
app.post("/api/extract-metadata", authenticateToken, upload.single('file'), extractMetadata);



// --- DEBUG ROUTE ---
app.get("/api/test-no-auth", async (req, res) => {
  try {
    const articles = await getCuratedArticles();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

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
  // Start the local LLM server (FastAPI) in background
  console.log("Iniciando servidor LLM local (FastAPI)...");
  const venvUvicorn = path.join(__dirname, 'venv', 'bin', 'uvicorn');
  const uvicornCmd = fsSync.existsSync(venvUvicorn) ? venvUvicorn : 'uvicorn';
  
  console.log(`Usando comando uvicorn: ${uvicornCmd}`);
    
  const llmServer = spawn(uvicornCmd, ['src.utils.llm:app', '--host', '0.0.0.0', '--port', '8000'], {
    stdio: 'inherit',
    env: process.env,
    shell: true
  });

  llmServer.on('error', (err) => {
    console.error('Falha ao iniciar servidor LLM:', err.message);
  });

  const networkInterfaces = os.networkInterfaces();
  let networkUrl = process.env.NETWORK_IP ? `http://${process.env.NETWORK_IP}:${port}` : "";

  if (!networkUrl) {
    for (const interfaceName in networkInterfaces) {
      for (const iface of networkInterfaces[interfaceName]) {
        // No Node.js 18+, 'family' pode ser 'IPv4' ou 4.
        if ((iface.family === "IPv4" || iface.family === 4) && !iface.internal) {
          networkUrl = `http://${iface.address}:${port}`;
          break;
        }
      }
      if (networkUrl) break;
    }
  }

  console.log("\n  API SERVER READY");
  console.log(`  ➜  Local:   http://localhost:${port}/`);
  
  const displayNetworkUrl = process.env.NETWORK_IP 
    ? `http://${process.env.NETWORK_IP}:${port}` 
    : networkUrl;

  // refresh app.locals.baseNetworkUrl so runtime handlers can build absolute URLs
  app.locals.baseNetworkUrl = displayNetworkUrl || `http://localhost:${port}`;

  if (displayNetworkUrl) {
    console.log(`  ➜  Network: ${displayNetworkUrl}/`);
  }
  console.log("\n  Servidor pronto. Usando banco de dados TiDB para autenticação.\n");
});

// Exportar o app para compatibilidade correta com Vercel
module.exports = app;
