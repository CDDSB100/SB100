const {
  ALL_METADATA_FIELDS,
} = require("../controllers/metadata_controller.js");
const { Article } = require("../models/Article.js");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const os = require("os");

// --- CONFIGURATION ---
const DOCUMENTS_DIR = path.join(__dirname, "../../documents");
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, "aprovados");
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, "reprovados");
const EMAIL_CONTATO = process.env.EMAIL_CONTATO || "luisgustavobonfim996@gmail.com";
const API_BASE_URL = process.env.API_BASE_URL || "http://backend-python:8000";

// Ensure directories exist
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
});

// --- HELPERS ---
function findFileInFolders(fileName) {
  if (!fileName) return null;
  if (fileName.startsWith("http")) {
    try {
      const url = new URL(fileName);
      const parts = url.pathname.split("/");
      fileName = decodeURIComponent(parts[parts.length - 1]);
    } catch (e) {
      const parts = fileName.split("/");
      fileName = decodeURIComponent(parts[parts.length - 1]);
    }
  }
  const possiblePaths = [
    path.join(DOCUMENTS_DIR, fileName),
    path.join(APROVADOS_DIR, fileName),
    path.join(REPROVADOS_DIR, fileName)
  ];
  for (const p of possiblePaths) {
    if (fsSync.existsSync(p)) return p;
  }
  return null;
}

const normalizarBooleano = (v) =>
  ["true", "sim", "yes", "verdadeiro", "aprovado", "1", true].includes(
    typeof v === 'string' ? v.toLowerCase() : v
  );

async function callCustomCuradorApi(pdfBuffer, headers, category = null) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers,
    category,
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/curadoria`, payload, {
      timeout: 600000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    const msg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("LLM API Error:", msg);
    throw new Error("Erro na API do LLM: " + msg);
  }
}

async function callCategorizationApi(pdfBuffer) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers: [],
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/categorize`, payload, {
      timeout: 300000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data.category;
  } catch (error) {
    const msg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("Categorization API Error:", msg);
    throw new Error("Erro na API de Categorização: " + msg);
  }
}

async function listPdfsRecursive(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) await listPdfsRecursive(res, fileList);
    else if (file.name.toLowerCase().endsWith(".pdf")) fileList.push({ name: file.name, localPath: res });
  }
  return fileList;
}

async function direcionarArquivoAposProcessamentoLocal(fileName, article, aprovado) {
  const subDir = aprovado ? "aprovados" : "reprovados";
  const targetDir = path.join(DOCUMENTS_DIR, subDir);
  if (!fsSync.existsSync(targetDir)) fsSync.mkdirSync(targetDir, { recursive: true });

  const sourcePath = path.join(DOCUMENTS_DIR, fileName);
  const targetPath = path.join(targetDir, fileName);

  try {
    if (fsSync.existsSync(sourcePath)) await fs.rename(sourcePath, targetPath);
    
    // Gerar TXT de metadados
    const txtContent = ALL_METADATA_FIELDS.map(h => `${h}: ${article[h] || ""}`).join("\n");
    const txtPath = path.join(targetDir, fileName.replace(/\.pdf$/i, "") + ".txt");
    await fs.writeFile(txtPath, txtContent);
  } catch (e) {
    console.error("  > Archival error: " + e.message);
  }
}

// --- MAIN LOGIC ---
async function processarUmArtigo(articleId) {
  const article = await Article.findById(articleId);
  if (!article) throw new Error("Artigo não encontrado.");

  const fileName = article["URL DO DOCUMENTO"] || "";
  if (!fileName) return { success: false, article };

  const filePath = findFileInFolders(fileName);
  try {
    if (!filePath) throw new Error(`Arquivo não encontrado: ${fileName}`);
    const pdfBuffer = await fs.readFile(filePath);

    const originalCategory = article["CATEGORIA"] || "";
    const extractedData = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS, originalCategory);

    ALL_METADATA_FIELDS.forEach((header) => {
      if (["CATEGORIA", "INSERIDO POR", "APROVADO POR", "APROVAÇÃO MANUAL"].includes(header)) return;
      if (extractedData[header] !== undefined) article[header] = extractedData[header];
    });

    const boolAprovado = normalizarBooleano(extractedData["APROVAÇÃO CURADOR (marcar)"] || extractedData["aprovacao"]);
    article["APROVAÇÃO CURADOR (marcar)"] = boolAprovado ? "TRUE" : "FALSE";
    article["ARTIGOS REJEITADOS"] = !boolAprovado ? "TRUE" : "FALSE";
    article["FEEDBACK DO CURADOR (escrever)"] = extractedData["FEEDBACK DO CURADOR (escrever)"] || "N/A";

    await article.save();
    await direcionarArquivoAposProcessamentoLocal(path.basename(fileName), article, boolAprovado);
    return { success: true, article };
  } catch (e) {
    console.error(`  > ERROR on article ${articleId}: ${e.message}`);
    article["APROVAÇÃO CURADOR (marcar)"] = "FALSE";
    article["ARTIGOS REJEITADOS"] = "TRUE";
    article["FEEDBACK DO CURADOR (escrever)"] = `Erro na análise: ${e.message}`;
    await article.save();
    return { success: false, article };
  }
}

async function executarCuradoriaLocalmente() {
  const articles = await Article.find({
    "APROVAÇÃO CURADOR (marcar)": { $ne: "TRUE" },
    "ARTIGOS REJEITADOS": { $ne: "TRUE" },
    "URL DO DOCUMENTO": { $ne: "" }
  });

  let processados = 0, erros = 0;
  for (const article of articles) {
    const result = await processarUmArtigo(article._id);
    result.success ? processados++ : erros++;
  }
  return { message: `Batch process finished. Processed: ${processados} | Errors: ${erros}` };
}

async function manualInsert(data, username = "Desconhecido") {
  const title = (data["Título"] || data["Titulo"] || "").trim();
  const doi = (data["DOI"] || "").trim();

  // Verificar duplicidade
  const existing = await Article.findOne({
    $or: [
      { DOI: doi, DOI: { $ne: "N/A", $ne: "" } },
      { "Título": title, "Título": { $ne: "N/A", $ne: "" } }
    ]
  });

  if (existing && title !== "" && title.toLowerCase() !== "n/a") {
    return { status: "error", message: `Erro: O documento '${title}' já está cadastrado.` };
  }

  const articleData = { ...data, "INSERIDO POR": username };
  if (!articleData.work_id) articleData.work_id = `manual-${Date.now()}`;

  const article = new Article(articleData);
  await article.save();
  return { status: "success", message: "Inserido com sucesso!", article };
}

async function getCuratedArticles() {
  const articles = await Article.find().sort({ createdAt: -1 });
  return articles.map(a => {
    const obj = a.toObject();
    obj.__row_number = obj._id; // Mapear _id para __row_number para manter compatibilidade com frontend
    return obj;
  });
}

async function deleteRow(id) {
  await Article.findByIdAndDelete(id);
  return { success: true };
}

async function aprovarManualmente(id, fileName, username = "Desconhecido", feedback = "Aprovado manualmente") {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  const sourcePath = findFileInFolders(fileName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  const targetPath = path.join(APROVADOS_DIR, fileName);
  if (sourcePath !== targetPath) await fs.rename(sourcePath, targetPath);

  article["APROVADO POR"] = username;
  article["FEEDBACK DO CURADOR (escrever)"] = feedback;
  article["APROVAÇÃO MANUAL"] = "TRUE";
  article["ARTIGOS REJEITADOS"] = "FALSE";
  article["APROVAÇÃO CURADOR (marcar)"] = "TRUE";

  await article.save();
  return { success: true };
}

async function reprovarManualmente(id, fileName, username = "Desconhecido", feedback = "Rejeitado manualmente") {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  const sourcePath = findFileInFolders(fileName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  const targetPath = path.join(REPROVADOS_DIR, fileName);
  if (sourcePath !== targetPath) await fs.rename(sourcePath, targetPath);

  article["APROVADO POR"] = username;
  article["FEEDBACK DO CURADOR (escrever)"] = feedback;
  article["APROVAÇÃO MANUAL"] = "FALSE";
  article["ARTIGOS REJEITADOS"] = "TRUE";
  article["APROVAÇÃO CURADOR (marcar)"] = "FALSE";

  await article.save();
  return { success: true };
}

async function processSinglePdfForInsert(pdfBuffer, fileName, username = "Desconhecido") {
  const category = await callCategorizationApi(pdfBuffer);
  const extractedMetadata = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS);
  
  const articleData = {};
  ALL_METADATA_FIELDS.forEach(f => { 
    articleData[f] = extractedMetadata[f] || "N/A";
  });

  articleData["CATEGORIA"] = category;
  articleData["URL DO DOCUMENTO"] = fileName;
  articleData["INSERIDO POR"] = username;
  
  let finalTitle = extractedMetadata["Título"] || extractedMetadata["Titulo"] || fileName.replace(/\.pdf$/i, "");
  articleData["Título"] = finalTitle;

  return articleData;
}

async function updateArticle(id, data) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  // Atualiza apenas os campos permitidos
  ALL_METADATA_FIELDS.forEach(f => {
    if (data[f] !== undefined) article[f] = data[f];
  });

  // Outros campos importantes
  const extraFields = ["CATEGORIA", "URL DO DOCUMENTO", "INSERIDO POR", "APROVADO POR", "APROVAÇÃO MANUAL", "ARTIGOS REJEITADOS", "APROVAÇÃO CURADOR (marcar)"];
  extraFields.forEach(f => {
    if (data[f] !== undefined) article[f] = data[f];
  });

  await article.save();
  return { success: true, article };
}

module.exports = {
  getCuratedArticles,
  executarCuradoriaLocalmente,
  executarCuradoriaLinhaUnica: processarUmArtigo,
  findFileInFolders,
  deleteRow,
  manualInsert,
  aprovarManualmente,
  reprovarManualmente,
  updateArticle,
  processZipUpload: async (buf, user) => {
    const tmp = path.join(os.tmpdir(), `zip-${Date.now()}`);
    await fs.mkdir(tmp, { recursive: true });
    try {
      const zip = new AdmZip(buf);
      zip.extractAllTo(tmp, true);
      const pdfFiles = await listPdfsRecursive(tmp);
      for (const file of pdfFiles) {
        const pdfBuffer = await fs.readFile(file.localPath);
        const data = await processSinglePdfForInsert(pdfBuffer, file.name, user);
        await manualInsert(data, user);
        // Copy to documents dir
        await fs.copyFile(file.localPath, path.join(DOCUMENTS_DIR, file.name));
      }
      return { message: "Upload e processamento concluídos." };
    } finally {
      setTimeout(() => {
        try { if (fsSync.existsSync(tmp)) fsSync.rmSync(tmp, { recursive: true, force: true }); } catch(e) {}
      }, 60000);
    }
  },
  uploadFileToDrive: async (d, p, f) => {
    const t = path.join(DOCUMENTS_DIR, f);
    await fs.copyFile(p, t);
    return f;
  }
};
