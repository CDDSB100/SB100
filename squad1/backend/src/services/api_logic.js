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
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

// Ensure directories exist
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
});

// --- HELPERS ---
function safelyParseJSON(str) {
  if (str === null || str === undefined) return str;
  if (typeof str !== 'string') return str;
  
  const trimmed = str.trim();
  if (trimmed === "" || trimmed === "---" || trimmed === "N/A") return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return str;
    }
  }
  return str;
}

function findFileRecursively(dir, fileName) {
  const files = fsSync.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      const found = findFileRecursively(res, fileName);
      if (found) return found;
    } else if (file.name === fileName) {
      return res;
    }
  }
  return null;
}

function findFileInFolders(fileName) {
  if (!fileName) return null;

  let cleanName = fileName;
  try {
    cleanName = decodeURIComponent(decodeURIComponent(fileName));
  } catch (e) {
    try {
      cleanName = decodeURIComponent(fileName);
    } catch (e2) {
      cleanName = fileName;
    }
  }
  
  cleanName = path.basename(cleanName);

  const directPaths = [
    path.join(DOCUMENTS_DIR, cleanName),
    path.join(APROVADOS_DIR, cleanName),
    path.join(REPROVADOS_DIR, cleanName)
  ];

  for (const p of directPaths) {
    if (fsSync.existsSync(p)) return p;
  }

  return findFileRecursively(DOCUMENTS_DIR, cleanName);
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

  const cleanName = path.basename(fileName);
  const sourcePath = findFileInFolders(cleanName);
  const targetPath = path.join(targetDir, cleanName);

  if (!sourcePath) return;

  try {
    if (sourcePath !== targetPath) {
      await fs.rename(sourcePath, targetPath);
    }
    
    const txtContent = ALL_METADATA_FIELDS.map(h => `${h}: ${article[h] || ""}`).join("\n");
    const txtPath = path.join(targetDir, cleanName.replace(/\.pdf$/i, "") + ".txt");
    await fs.writeFile(txtPath, txtContent);
  } catch (e) {
    console.error("  > Archival error: " + e.message);
  }
}

// --- MAIN LOGIC ---
async function processarUmArtigo(articleId) {
  const article = await Article.findById(articleId);
  if (!article) throw new Error("Artigo não encontrado.");

  const fileName = article.documentUrl || "";
  if (!fileName) return { success: false, article };

  const filePath = findFileInFolders(fileName);
  try {
    if (!filePath) throw new Error(`Arquivo não encontrado: ${fileName}`);
    const pdfBuffer = await fs.readFile(filePath);

    const extractedData = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS, article.category);

    ALL_METADATA_FIELDS.forEach((header) => {
      if (["category", "insertedBy", "approvedBy", "status", "curatorFeedback", "feedbackOnAi"].includes(header)) return;
      if (extractedData[header] !== undefined) article[header] = extractedData[header];
    });

    const boolAprovado = normalizarBooleano(extractedData.status || extractedData.aprovacao);
    article.status = boolAprovado ? "approved_ia" : "rejected";
    
    let aiFeedbackObj = null;
    if (extractedData.aiFeedback) {
      aiFeedbackObj = safelyParseJSON(extractedData.aiFeedback);
    } 

    if (!aiFeedbackObj || !aiFeedbackObj.technical_summary) {
      const summary = `Análise automática: O documento apresenta estudos sobre ${article.keywords || "temas técnicos"} relacionados a ${article.category || "agricultura"}.`;
      aiFeedbackObj = {
        technical_summary: summary,
        agronomic_insights: "Análise agronômica não extraída explicitamente.",
        relevance_score: boolAprovado ? 6.0 : 4.0
      };
    }

    article.aiFeedback = aiFeedbackObj;

    if (!article.feedbackOnAi || article.feedbackOnAi === "N/A") {
        article.feedbackOnAi = {
          is_accurate: true,
          is_useful: true,
          human_correction_notes: "",
          ai_performance_rating: 0,
          adjustment_required: false
        };
    }

    await article.save();
    await direcionarArquivoAposProcessamentoLocal(fileName, article, boolAprovado);
    return { success: true, article };
  } catch (e) {
    console.error(`  > ERROR on article ${articleId}: ${e.message}`);
    article.status = "rejected";
    article.aiFeedback = { 
      technical_summary: `Falha no processamento: ${e.message}`, 
      agronomic_insights: "Erro", 
      relevance_score: 0 
    };
    await article.save();
    return { success: false, article };
  }
}

async function executarCuradoriaLocalmente() {
  const articles = await Article.find({
    status: "pending",
    documentUrl: { $ne: "" }
  });

  let processados = 0, erros = 0;
  for (const article of articles) {
    const result = await processarUmArtigo(article._id);
    result.success ? processados++ : erros++;
  }
  return { message: `Batch process finished. Processed: ${processados} | Errors: ${erros}` };
}

async function manualInsert(data, username = "Desconhecido") {
  const title = (data.title || "").trim();
  const doi = (data.doi || "").trim();

  const existing = await Article.findOne({
    $or: [
      { doi: doi, doi: { $ne: "N/A", $ne: "" } },
      { title: title, title: { $ne: "N/A", $ne: "" } }
    ]
  });

  if (existing && title !== "" && title.toLowerCase() !== "n/a") {
    return { status: "error", message: `Erro: O documento '${title}' já está cadastrado.` };
  }

  const articleData = { ...data, insertedBy: username };
  if (!articleData.workId) articleData.workId = `manual-${Date.now()}`;

  articleData.aiFeedback = safelyParseJSON(articleData.aiFeedback);
  articleData.feedbackOnAi = safelyParseJSON(articleData.feedbackOnAi);
  articleData.curatorFeedback = safelyParseJSON(articleData.curatorFeedback);

  const article = new Article(articleData);
  await article.save();
  return { status: "success", message: "Inserido com sucesso!", article };
}

async function getArticlesByStatus(status) {
  const articles = await Article.find({ status }).sort({ createdAt: -1 });
  return articles.map(a => {
    const obj = a.toObject();
    obj.__row_number = obj._id;
    obj.aiFeedback = safelyParseJSON(obj.aiFeedback);
    obj.feedbackOnAi = safelyParseJSON(obj.feedbackOnAi);
    obj.curatorFeedback = safelyParseJSON(obj.curatorFeedback);
    return obj;
  });
}

async function getCuratedArticles() {
  const articles = await Article.find().sort({ createdAt: -1 });
  return articles.map(a => {
    const obj = a.toObject();
    obj.__row_number = obj._id; 
    obj.aiFeedback = safelyParseJSON(obj.aiFeedback);
    obj.feedbackOnAi = safelyParseJSON(obj.feedbackOnAi);
    obj.curatorFeedback = safelyParseJSON(obj.curatorFeedback);
    return obj;
  });
}

async function deleteRow(id) {
  await Article.findByIdAndDelete(id);
  return { success: true };
}

async function aprovarManualmente(id, fileName, username = "Desconhecido", feedbackCurador = "", feedbackSobreIA = null, aiAnalysisFeedback = null) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  const cleanName = path.basename(fileName);
  const sourcePath = findFileInFolders(cleanName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  
  const targetPath = path.join(APROVADOS_DIR, cleanName);
  
  try {
    if (sourcePath !== targetPath) {
      await fs.rename(sourcePath, targetPath);
    }
  } catch (e) {
    console.error(`[aprovarManualmente] Erro ao mover arquivo: ${e.message}`);
  }

  article.approvedBy = username;
  if (feedbackCurador) article.curatorFeedback = feedbackCurador;
  if (feedbackSobreIA) article.feedbackOnAi = safelyParseJSON(feedbackSobreIA);
  
  const parsedAiAnalysis = safelyParseJSON(aiAnalysisFeedback);
  if (parsedAiAnalysis && Object.keys(parsedAiAnalysis).length > 0) {
      article.aiFeedback = parsedAiAnalysis;
  }

  article.status = "approved_manual";
  await article.save();
  return { success: true };
}

async function reprovarManualmente(id, fileName, username = "Desconhecido", feedbackCurador = "", feedbackSobreIA = null, aiAnalysisFeedback = null) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  const cleanName = path.basename(fileName);
  const sourcePath = findFileInFolders(cleanName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  
  const targetPath = path.join(REPROVADOS_DIR, cleanName);
  
  try {
    if (sourcePath !== targetPath) {
      await fs.rename(sourcePath, targetPath);
    }
  } catch (e) {
    console.error(`[reprovarManualmente] Erro ao mover arquivo: ${e.message}`);
  }

  article.approvedBy = username;
  if (feedbackCurador) article.curatorFeedback = feedbackCurador;
  if (feedbackSobreIA) article.feedbackOnAi = safelyParseJSON(feedbackSobreIA);
  
  const parsedAiAnalysis = safelyParseJSON(aiAnalysisFeedback);
  if (parsedAiAnalysis && Object.keys(parsedAiAnalysis).length > 0) {
      article.aiFeedback = parsedAiAnalysis;
  }

  article.status = "rejected";
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

  articleData.category = category;
  articleData.documentUrl = fileName;
  articleData.insertedBy = username;
  articleData.status = 'pending';
  
  if (!articleData.title || articleData.title === "N/A") {
    articleData.title = fileName.replace(/\.pdf$/i, "");
  }

  return articleData;
}

async function updateArticle(id, data) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Artigo não encontrado.");

  ALL_METADATA_FIELDS.forEach(f => {
    if (data[f] !== undefined) {
      if (["aiFeedback", "curatorFeedback", "feedbackOnAi"].includes(f)) {
        article[f] = safelyParseJSON(data[f]);
      } else {
        article[f] = data[f];
      }
    }
  });

  await article.save();
  return { success: true, article };
}

async function downloadCuratedDocuments() {
  const articles = await Article.find({
    status: { $in: ["approved_manual", "approved_ia"] }
  });

  const zip = new AdmZip();
  let count = 0;

  for (const article of articles) {
    const fileName = article.documentUrl;
    if (fileName) {
      const filePath = findFileInFolders(fileName);
      if (filePath && fsSync.existsSync(filePath)) {
        zip.addLocalFile(filePath);
        count++;
      }
    }
  }

  if (count === 0) throw new Error("Nenhum documento encontrado.");
  return zip.toBuffer();
}

async function searchOpenAlex(search_terms, start_year, end_year, sort_option) {
  const url = "https://api.openalex.org/works";
  const params = {
    search: search_terms,
    filter: `publication_year:${start_year}-${end_year}`,
    sort: sort_option === "cited_by_count" ? "cited_by_count:desc" : "publication_year:desc",
    per_page: 50,
  };

  try {
    const response = await axios.get(url, { params });
    return response.data.results.map(work => ({
      workId: work.id,
      title: work.title,
      authors: (work.authorships || []).map(a => a.author.display_name).join(", "),
      year: String(work.publication_year),
      doi: work.doi || "",
      citationsCount: String(work.cited_by_count || "0"),
      documentUrl: work.primary_location?.pdf_url || work.doi || "",
      documentType: work.type,
      journalTitle: work.primary_location?.source?.display_name || "",
    }));
  } catch (error) {
    console.error("OpenAlex Search Error:", error.message);
    throw new Error("Erro ao buscar no OpenAlex.");
  }
}

async function saveData(selected_rows, username) {
  let savedCount = 0, skippedCount = 0, errorCount = 0;

  for (const row of selected_rows) {
    try {
      const title = (row.title || "").trim();
      const doi = (row.doi || "").trim();
      
      const existing = await Article.findOne({
        $or: [
          { doi: doi, doi: { $ne: null, $ne: "", $ne: "N/A" } },
          { title: title, title: { $ne: null, $ne: "", $ne: "N/A" } }
        ]
      });

      if (existing && title !== "" && title.toLowerCase() !== "n/a") {
        skippedCount++;
        continue;
      }

      const article = new Article({
        ...row,
        insertedBy: username,
        status: 'pending',
      });
      await article.save();
      savedCount++;
    } catch (error) {
      errorCount++;
    }
  }

  return { saved: savedCount, skipped: skippedCount, errors: errorCount };
}

async function deleteUnavailableRows() {
  const result = await Article.deleteMany({
    $or: [
      { documentUrl: { $exists: false } },
      { documentUrl: "" },
      { documentUrl: null }
    ]
  });
  return { success: true, deletedCount: result.deletedCount };
}

async function fixMissingTitles() {
  const articles = await Article.find({
    $or: [{ title: { $exists: false } }, { title: "" }, { title: null }, { title: "N/A" }]
  });

  let fixedCount = 0;
  for (const article of articles) {
    const doi = article.doi;
    if (doi && doi !== "N/A") {
      try {
        const response = await axios.get(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
        if (response.data.message && response.data.message.title) {
          article.title = response.data.message.title[0];
          await article.save();
          fixedCount++;
        }
      } catch (e) {}
    }
  }
  return { success: true, fixedCount };
}

async function processDriveFolderForBatchInsert(folderPath, username, progressCallback) {
  if (progressCallback) progressCallback({ status: 'completed', message: 'Funcionalidade requer configuração manual.' });
  return { message: "Processamento simulado concluído." };
}

async function executarCategorizacaoLinhaUnica(articleId) {
  const article = await Article.findById(articleId);
  if (!article) throw new Error("Artigo não encontrado.");

  const fileName = article.documentUrl || "";
  if (!fileName) throw new Error("URL não informada.");

  const filePath = findFileInFolders(fileName);
  if (!filePath) throw new Error(`Arquivo não encontrado.`);

  const pdfBuffer = await fs.readFile(filePath);
  const category = await callCategorizationApi(pdfBuffer);

  article.category = category;
  await article.save();
  return { success: true, article };
}

async function getArticleByName(name) {
  const articles = await Article.find({ title: { $regex: new RegExp(name, "i") } });
  return articles.map(a => ({
    title: a.title,
    category: a.category || "N/A",
    fileName: a.documentUrl || "N/A"
  }));
}

module.exports = {
  getArticleByName,
  getCuratedArticles,
  getArticlesByStatus,
  executarCuradoriaLocalmente,
  executarCuradoriaLinhaUnica: processarUmArtigo,
  executarCategorizacaoLinhaUnica,
  searchOpenAlex,
  saveData,
  deleteUnavailableRows,
  fixMissingTitles,
  processDriveFolderForBatchInsert,
  findFileInFolders,
  deleteRow,
  manualInsert,
  aprovarManualmente,
  reprovarManualmente,
  updateArticle,
  downloadCuratedDocuments,
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
        await fs.copyFile(file.localPath, path.join(DOCUMENTS_DIR, file.name));
      }
      return { message: "Upload concluído." };
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
