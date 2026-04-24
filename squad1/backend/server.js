const express = require("express");
const path = require('path');
const fsSync = require('fs');
const fs = require('fs').promises;
const os = require('os');
const { spawn } = require('child_process');

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
  resolveConflict,
  searchAllBases,
} = require("./src/services/api_logic.js");
const { pool, initDb, saltRounds } = require("./src/services/database.js");
const { migrateExcelToSqlite } = require("./src/services/migration_service.js");

const { extractMetadata, ALL_METADATA_FIELDS } = require("./src/controllers/metadata_controller.js");
const multer = require("multer");
const { swaggerUi, specs, swaggerOptions } = require('./swagger');

let batchProgress = {
  total: 0,
  current: 0,
  processed: 0,
  errors: 0,
  skipped: 0,
  status: 'idle',
  message: ''
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
const port = process.env.PORT || 5001;

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

app.locals.baseNetworkUrl = computeNetworkBaseUrl();
const JWT_SECRET = process.env.JWT_SECRET || "sua-chave-secreta-super-dificil-de-adivinhar";

initDb()
  .then(async () => {
    console.log("Database initialized successfully.");
    // Rodar migração automática
    await migrateExcelToSqlite();
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });

app.use(bodyParser.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (fsSync.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath, { maxAge: 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) return next();
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = (authHeader && authHeader.split(" ")[1]) || req.query.token;

  if (token == null) return res.status(401).json({ error: "Token não fornecido." });

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) return res.status(403).json({ error: "Token inválido." });
    
    try {
      const [rows] = await pool.execute("SELECT id, username, role, allowed_categories FROM users WHERE id = ?", [parseInt(decodedUser.id, 10)]);
      if (rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado." });
      
      const user = rows[0];
      if (user.allowed_categories) {
        try { user.allowed_categories = JSON.parse(user.allowed_categories); } catch (e) {}
      }
      req.user = user;
      next();
    } catch (dbErr) {
      res.status(500).json({ error: "Erro interno." });
    }
  });
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') next();
  else res.status(403).json({ error: "Apenas administradores." });
};

const authorizeModify = (req, res, next) => {
  if (req.user && req.user.role !== 'visualizador' && req.user.role !== 'visitante') next();
  else res.status(403).json({ error: "Apenas leitura." });
};

// --- API ROUTES ---

app.get("/api/documents/:filename", authenticateToken, (req, res) => {
  const { filename } = req.params;
  const filePath = findFileInFolders(filename);
  if (filePath) res.sendFile(filePath);
  else res.status(404).send("Arquivo não encontrado.");
});

app.get("/api/health", (req, res) => res.status(200).json({ status: "ok" }));
app.get('/api/base-url', (req, res) => res.json({ baseUrl: app.locals.baseNetworkUrl }));

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Obrigatório." });

  try {
    const [rows] = await pool.execute("SELECT *, CAST(id AS TEXT) as id_str FROM users WHERE username = ?", [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Inválido." });
    }

    const accessToken = jwt.sign({ username: user.username, id: user.id_str, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ accessToken });
  } catch (err) {
    console.error("Erro no login SQLite:", err);
    res.status(500).json({ error: "Erro interno." });
  }
});

app.post("/api/register", authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, saltRounds);
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)",
      [username, email, hash, role]
    );
    res.status(201).json({ userId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro." });
  }
});

app.get("/api/users", authenticateToken, authorizeAdmin, async (req, res) => {
  const [rows] = await pool.execute("SELECT id, username, email, role, is_active, allowed_categories FROM users");
  res.json(rows);
});

app.put("/api/users/:id/permissions", authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, allowedCategories } = req.body;
  
  try {
    const allowedCategoriesStr = JSON.stringify(allowedCategories || []);
    await pool.execute(
      "UPDATE users SET role = ?, allowed_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [role, allowedCategoriesStr, id]
    );
    res.json({ success: true, message: "Permissões atualizadas com sucesso." });
  } catch (err) {
    console.error("Erro ao atualizar permissões:", err);
    res.status(500).json({ error: "Erro ao atualizar permissões no banco de dados." });
  }
});

app.delete("/api/users/:id", authenticateToken, authorizeAdmin, async (req, res) => {
  await pool.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

app.post("/api/trigger-curation", authenticateToken, authorizeModify, async (req, res) => {
  const result = await executarCuradoriaLocalmente();
  res.json(result);
});

app.post("/api/trigger-curation-single", authenticateToken, authorizeModify, async (req, res) => {
  const id = req.body.workId || req.body.row_number || req.body.id;
  console.log(`[API] Solicitação de curadoria individual recebida para o ID: ${id}`);
  
  if (!id) {
    return res.status(400).json({ error: "ID do artigo não fornecido na requisição." });
  }

  const forceSave = req.body.forceSave || false;
  const result = await executarCuradoriaLinhaUnica(id, forceSave);
  res.json(result);
});

app.post("/api/resolve-conflict", authenticateToken, authorizeModify, async (req, res) => {
  const { articleId, resolution, conflictingId } = req.body;
  try {
    const result = await resolveConflict(articleId, resolution, conflictingId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categorize-single", authenticateToken, authorizeModify, async (req, res) => {
  const id = req.body.workId || req.body.row_number || req.body.id;
  const result = await executarCategorizacaoLinhaUnica(id);
  res.json(result);
});

app.get("/api/curation", authenticateToken, async (req, res) => {
  let articles = await getCuratedArticles();
  if (req.user && req.user.role !== 'admin' && req.user.allowed_categories && req.user.allowed_categories.length > 0) {
    const allowed = req.user.allowed_categories.map(c => String(c).toLowerCase());
    articles = articles.filter(a => allowed.includes(String(a.category || "").toLowerCase()));
  }
  res.json(articles);
});

app.get("/api/articles/status/:status", authenticateToken, async (req, res) => {
  let articles = await getArticlesByStatus(req.params.status);
  if (req.user && req.user.role !== 'admin' && req.user.allowed_categories && req.user.allowed_categories.length > 0) {
    const allowed = req.user.allowed_categories.map(c => String(c).toLowerCase());
    articles = articles.filter(a => allowed.includes(String(a.category || "").toLowerCase()));
  }
  res.json(articles);
});

app.get("/api/download-all", authenticateToken, async (req, res) => {
  const zipBuffer = await downloadCuratedDocuments();
  res.set('Content-Type', 'application/zip');
  res.send(zipBuffer);
});

app.post("/api/search", authenticateToken, authorizeModify, async (req, res) => {
  const { search_terms, start_year, end_year, sort_option } = req.body;
  const results = await searchAllBases(search_terms, start_year, end_year, sort_option);
  res.json(results);
});

app.post("/api/save", authenticateToken, authorizeModify, async (req, res) => {
  console.log(`[API] Rota /api/save acionada por: ${req.user ? req.user.username : "Desconhecido"}`);
  const selected_rows = req.body.selected_rows || req.body.selectedRows;
  
  if (!selected_rows || !Array.isArray(selected_rows)) {
    console.error("[API] Erro: selected_rows não é um array válido ou está vazio.");
    return res.status(400).json({ error: "Dados inválidos: selected_rows deve ser um array." });
  }

  console.log(`[API] Processando salvamento de ${selected_rows.length} linhas.`);
  const result = await saveData(selected_rows, req.user ? req.user.username : "Desconhecido");
  res.json(result);
});

app.post("/api/delete-row", authenticateToken, authorizeModify, async (req, res) => {
  const result = await deleteRow(req.body.row_number);
  res.json(result);
});

app.post("/api/manual-insert", authenticateToken, authorizeModify, upload.single('file'), async (req, res) => {
  try {
    const data = req.body || {};
    if (req.file) {
      console.log("[manual-insert] Recebido arquivo:", req.file.originalname);
      const tmpPath = path.join(__dirname, "temp_uploads", `${Date.now()}-${req.file.originalname}`);
      if (!fsSync.existsSync(path.join(__dirname, "temp_uploads"))) fsSync.mkdirSync(path.join(__dirname, "temp_uploads"), { recursive: true });
      await fs.writeFile(tmpPath, req.file.buffer);
      data.documentUrl = await uploadFileToDrive(null, tmpPath, req.file.originalname);
      await fs.unlink(tmpPath);
    }
    const result = await manualInsert(data, req.user ? req.user.username : "Desconhecido");
    res.status(result.status === "success" ? 201 : (result.status === "skipped" ? 200 : 500)).json(result);
  } catch (err) {
    console.error("[manual-insert] Erro crítico:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/api/manual-approval", authenticateToken, authorizeModify, async (req, res) => {
    const { workId, fileName, curatorFeedback, feedbackOnAi, aiFeedback } = req.body;
    const result = await aprovarManualmente(workId, fileName, req.user.username, curatorFeedback, feedbackOnAi, aiFeedback);
    res.json(result);
});

app.post("/api/manual-rejection", authenticateToken, authorizeModify, async (req, res) => {
    const { workId, fileName, curatorFeedback, feedbackOnAi, aiFeedback } = req.body;
    const result = await reprovarManualmente(workId, fileName, req.user.username, curatorFeedback, feedbackOnAi, aiFeedback);
    res.json(result);
});

app.post("/api/batch-upload-zip", authenticateToken, authorizeModify, upload.single('file'), async (req, res) => {
    // Inicia processamento em background para não travar a requisição
    batchProgress = { total: 0, current: 0, processed: 0, errors: 0, skipped: 0, status: 'processing', message: 'Iniciando extração...' };
    
    processZipUpload(req.file.buffer, req.user.username, (progress) => {
        batchProgress = { ...batchProgress, ...progress };
    }).catch(err => {
        console.error("Erro no processamento do ZIP:", err);
        batchProgress.status = 'error';
        batchProgress.message = err.message;
    });

    res.json({ message: "Upload recebido. Processamento iniciado em lote." });
});

app.get("/api/batch-progress", authenticateToken, (req, res) => res.json(batchProgress));

app.post("/api/extract-metadata", authenticateToken, authorizeModify, upload.single('file'), extractMetadata);

app.post("/api/fix-titles", authenticateToken, authorizeModify, async (req, res) => {
  const result = await fixMissingTitles();
  res.json(result);
});

app.put("/api/articles/:id", authenticateToken, authorizeModify, async (req, res) => {
  const result = await updateArticle(req.params.id, req.body);
  res.json(result);
});

app.get("/api/llm-logs", authenticateToken, async (req, res) => {
    const logPath = path.join(__dirname, "llm.log");
    if (!fsSync.existsSync(logPath)) return res.json({ logs: "" });
    const logs = await fs.readFile(logPath, "utf8");
    res.json({ logs: logs.split("\n").slice(-200).join("\n") });
});

// Servir arquivos estáticos do frontend (após o build)
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
if (fsSync.existsSync(frontendDistPath)) {
  console.log(`  > server.js: Servindo frontend de ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));
  
  // Rota catch-all para o React (SPA)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/docs") || req.path.startsWith("/documents")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

const finalPort = process.env.PORT || 5173;
app.listen(finalPort, "0.0.0.0", () => {
  console.log(`API SERVER READY ON PORT ${finalPort}`);
});

module.exports = app;
