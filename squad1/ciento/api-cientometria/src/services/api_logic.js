const {
  ALL_METADATA_FIELDS,
} = require("../controllers/metadata_controller.js");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const axios = require("axios");
const xlsx = require("xlsx");
const AdmZip = require("adm-zip");
const os = require("os");

// --- CONFIGURATION ---
const SHEET_NAME = "Tabela completa";
const CONSOLIDADO_PATH = path.join(__dirname, "../../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../../documents");
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, "aprovados");
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, "reprovados");
const EMAIL_CONTATO = process.env.EMAIL_CONTATO || "luisgustavobonfim996@gmail.com";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

// Ensure directories exist
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
});

// --- HELPERS ---
/**
 * Tenta encontrar um arquivo PDF em várias pastas possíveis (raiz, aprovados, reprovados).
 */
function findFileInFolders(fileName) {
  if (!fileName) return null;

  // Se for uma URL completa, extrai apenas o nome do arquivo
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
    if (fsSync.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// --- LOCAL DATA HELPERS ---
function readWorkbook() {
  if (!fsSync.existsSync(CONSOLIDADO_PATH)) {
    console.log("  > readWorkbook: Criando nova planilha...");
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([ALL_METADATA_FIELDS]);
    xlsx.utils.book_append_sheet(wb, ws, SHEET_NAME);
    xlsx.writeFile(wb, CONSOLIDADO_PATH);
    return wb;
  }
  try {
    return xlsx.readFile(CONSOLIDADO_PATH);
  } catch (err) {
    console.error(`  > readWorkbook error: ${err.message}`);
    throw err;
  }
}

function writeWorkbook(wb) {
  xlsx.writeFile(wb, CONSOLIDADO_PATH);
}

async function getLocalData() {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet '${SHEET_NAME}' not found in workbook.`);
  return xlsx.utils.sheet_to_json(ws, { header: 1 });
}

async function getAuthenticatedServices() {
  return { drive: null, sheets: null };
}

// --- HELPER FUNCTIONS ---
const normalizarBooleano = (v) =>
  ["true", "sim", "yes", "verdadeiro", "aprovado", "1"].includes(
    String(v || "").toLowerCase(),
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
      timeout: 600000, // 10 min
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
      timeout: 300000, // 5 min
      headers: { "Content-Type": "application/json" },
    });
    return res.data.category;
  } catch (error) {
    const msg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("Categorization API Error:", msg);
    throw new Error("Erro na API de Categorização: " + msg);
  }
}

/**
 * Lista PDFs de forma recursiva em uma pasta.
 */
async function listPdfsRecursive(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      await listPdfsRecursive(res, fileList);
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      fileList.push({
        name: file.name,
        localPath: res
      });
    }
  }
  return fileList;
}

async function getLocalPdfContent(filePath) {
  return await fs.readFile(filePath);
}

async function direcionarArquivoAposProcessamentoLocal(fileName, fullRowData, fullHeaders, aprovado) {
  const subDir = aprovado ? "aprovados" : "reprovados";
  const targetDir = path.join(DOCUMENTS_DIR, subDir);
  if (!fsSync.existsSync(targetDir)) fsSync.mkdirSync(targetDir, { recursive: true });

  const sourcePath = path.join(DOCUMENTS_DIR, fileName);
  const targetPath = path.join(targetDir, fileName);

  try {
    if (fsSync.existsSync(sourcePath)) {
      await fs.rename(sourcePath, targetPath);
    }
    const txtContent = fullHeaders.map((h, i) => `${h}: ${fullRowData[i] || ""}`).join("\n");
    const txtPath = path.join(targetDir, fileName.replace(/\.pdf$/i, "") + ".txt");
    await fs.writeFile(txtPath, txtContent);
  } catch (e) {
    console.error("  > Archival error: " + e.message);
  }
}

// --- MAIN LOGIC ---
async function processarUmaLinha(rowReal, row, headers, llmOutputHeaders, colAprovacaoIndex, colRejeicaoIndex, colUrlDocumentoIndex, colFeedbackCuradorIndex, colInicioDadosApiIndex) {
  const fileName = row[colUrlDocumentoIndex] || "";
  if (!fileName) return { success: false, updatedRow: row };

  const filePath = findFileInFolders(fileName);
  try {
    if (!filePath) throw new Error(`Arquivo não encontrado: ${fileName}`);
    const pdfBuffer = await fs.readFile(filePath);

    let colCategoriaIndex = headers.indexOf("CATEGORIA");
    if (colCategoriaIndex === -1) colCategoriaIndex = 35;
    const originalCategory = row[colCategoriaIndex] || "";

    const extractedData = await callCustomCuradorApi(pdfBuffer, llmOutputHeaders, originalCategory);

    llmOutputHeaders.forEach((header) => {
      if (["CATEGORIA", "INSERIDO POR", "APROVADO POR", "APROVAÇÃO MANUAL"].includes(header)) return;
      const value = extractedData[header] !== undefined ? extractedData[header] : "N/A";
      const headerIndex = headers.indexOf(header);
      if (headerIndex !== -1) row[headerIndex] = value;
    });

    const boolAprovado = normalizarBooleano(extractedData["APROVAÇÃO CURADOR (marcar)"] || extractedData["aprovacao"]);
    row[colAprovacaoIndex] = boolAprovado ? "TRUE" : "FALSE";
    row[colRejeicaoIndex] = !boolAprovado ? "TRUE" : "FALSE";
    row[colFeedbackCuradorIndex] = extractedData["FEEDBACK DO CURADOR (escrever)"] || "N/A";

    await direcionarArquivoAposProcessamentoLocal(path.basename(fileName), row, headers, boolAprovado);
    return { success: true, updatedRow: row };
  } catch (e) {
    console.error(`  > ERROR on row ${rowReal}: ${e.message}`);
    row[colAprovacaoIndex] = "FALSE";
    row[colRejeicaoIndex] = "TRUE";
    row[colFeedbackCuradorIndex] = `Erro na análise: ${e.message}`;
    return { success: false, updatedRow: row };
  }
}

async function executarCuradoriaLocalmente() {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];

  const colAprovacaoIndex = headers.indexOf("APROVAÇÃO CURADOR (marcar)");
  const colRejeicaoIndex = headers.indexOf("ARTIGOS REJEITADOS");
  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");
  const colFeedbackCuradorIndex = headers.indexOf("FEEDBACK DO CURADOR (escrever)");
  const colInicioDadosApiIndex = headers.indexOf(ALL_METADATA_FIELDS[0]);

  let processados = 0, erros = 0;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const isApproved = (row[colAprovacaoIndex] || "").toString().toUpperCase() === "TRUE";
    const isRejected = (row[colRejeicaoIndex] || "").toString().toUpperCase() === "TRUE";
    const hasDoc = (row[colUrlDocumentoIndex] || "").toString().trim() !== "";

    if (!isApproved && !isRejected && hasDoc) {
      const result = await processarUmaLinha(i + 1, row, headers, ALL_METADATA_FIELDS, colAprovacaoIndex, colRejeicaoIndex, colUrlDocumentoIndex, colFeedbackCuradorIndex, colInicioDadosApiIndex);
      allData[i] = result.updatedRow;
      result.success ? processados++ : erros++;
      const newWs = xlsx.utils.aoa_to_sheet(allData);
      wb.Sheets[SHEET_NAME] = newWs;
      writeWorkbook(wb);
    }
  }
  return { message: `Batch process finished. Processed: ${processados} | Errors: ${erros}` };
}

async function executarCuradoriaLinhaUnica(rowNumber) {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];
  const row = allData[rowNumber - 1];
  if (!row) throw new Error(`Linha ${rowNumber} não existe.`);

  const colAprovacaoIndex = headers.indexOf("APROVAÇÃO CURADOR (marcar)");
  const colRejeicaoIndex = headers.indexOf("ARTIGOS REJEITADOS");
  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");
  const colFeedbackCuradorIndex = headers.indexOf("FEEDBACK DO CURADOR (escrever)");
  const colInicioDadosApiIndex = headers.indexOf(ALL_METADATA_FIELDS[0]);

  const { success, updatedRow } = await processarUmaLinha(rowNumber, row, headers, ALL_METADATA_FIELDS, colAprovacaoIndex, colRejeicaoIndex, colUrlDocumentoIndex, colFeedbackCuradorIndex, colInicioDadosApiIndex);
  allData[rowNumber - 1] = updatedRow;
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(allData);
  writeWorkbook(wb);

  const obj = { __row_number: rowNumber };
  headers.forEach((h, i) => { obj[h] = updatedRow[i] || ""; });
  return { message: success ? "Success" : "Failed", updatedArticle: obj };
}

async function executarCategorizacaoLinhaUnica(rowNumber) {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];
  const row = allData[rowNumber - 1];
  if (!row) throw new Error("Linha não encontrada.");

  const fileName = row[headers.indexOf("URL DO DOCUMENTO")] || "";
  const filePath = findFileInFolders(fileName);
  if (!filePath) throw new Error("Arquivo não encontrado.");

  const pdfBuffer = await fs.readFile(filePath);
  const category = await callCategorizationApi(pdfBuffer);

  let colCatIndex = headers.indexOf("CATEGORIA");
  if (colCatIndex === -1) colCatIndex = 35;
  row[colCatIndex] = category;
  allData[rowNumber - 1] = row;
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(allData);
  writeWorkbook(wb);

  const obj = { __row_number: rowNumber };
  headers.forEach((h, i) => { obj[h] = row[i] || ""; });
  return { message: `Categorizado como ${category}`, updatedArticle: obj };
}

async function processSinglePdfForInsert(pdfBuffer, fileName, username = "Desconhecido") {
  console.log(`    ➜ Processando arquivo: ${fileName}`);
  const category = await callCategorizationApi(pdfBuffer);
  const extractedMetadata = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS);
  const rowData = {};
  ALL_METADATA_FIELDS.forEach(f => { rowData[f] = extractedMetadata[f] || "N/A"; });
  rowData["CATEGORIA"] = category;
  rowData["URL DO DOCUMENTO"] = fileName;
  rowData["Título"] = extractedMetadata["Título"] || extractedMetadata["Titulo"] || fileName.replace(/\.pdf$/i, "");
  rowData["INSERIDO POR"] = username;
  return rowData;
}

async function isDuplicateLocal(allData, headers, doi, title) {
  if (!allData || allData.length < 2) return false;
  const rows = allData.slice(1);
  const doiIdx = headers.indexOf("DOI");
  const titleIdx = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  const sDoi = doi && String(doi).trim().toLowerCase() !== "n/a" ? String(doi).trim().toLowerCase() : null;
  const sTitle = title && String(title).trim().toLowerCase() !== "n/a" ? String(title).trim().toLowerCase() : null;

  if (!sDoi && !sTitle) return false;

  for (const row of rows) {
    if (sDoi && doiIdx !== -1 && String(row[doiIdx] || "").trim().toLowerCase() === sDoi) return true;
    if (sTitle && titleIdx !== -1 && String(row[titleIdx] || "").trim().toLowerCase() === sTitle) return true;
  }
  return false;
}

async function uploadToLocalSheet(wb, allData, headers, data) {
  try {
    const finalValues = data.map((row) => {
      const newRow = new Array(headers.length).fill("");
      headers.forEach((h, i) => { if (row[h] !== undefined) newRow[i] = String(row[h]); });
      return newRow;
    });
    const newData = allData.concat(finalValues);
    wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(newData);
    writeWorkbook(wb);
    return true;
  } catch (error) {
    console.error("ERROR Local Sheet:", error.message);
    return false;
  }
}

async function manualInsert(data, username = "Desconhecido") {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];

  const title = (data["Título"] || data["Titulo"] || "").trim();
  const doi = (data["DOI"] || "").trim();

  // Ignorar duplicidade se título for N/A ou vazio
  if (title !== "" && title.toLowerCase() !== "n/a") {
    if (await isDuplicateLocal(allData, headers, doi, title)) {
      return { status: "error", message: `Erro: O documento '${title}' já está cadastrado.` };
    }
  }

  let rowToUpload = {};
  if (data.pub_url) {
    const filePath = findFileInFolders(data.pub_url);
    if (filePath) {
      try {
        const pdfBuffer = await fs.readFile(filePath);
        const ext = await processSinglePdfForInsert(pdfBuffer, data.pub_url, username);
        rowToUpload = { ...ext };
        Object.keys(data).forEach(k => { if (data[k] && data[k] !== "N/A" && k !== "pub_url") rowToUpload[k] = data[k]; });
        if (title && title.toLowerCase() !== "n/a") rowToUpload["Título"] = title;
      } catch (err) { rowToUpload = { ...data }; }
    } else { rowToUpload = { ...data }; }
  } else { rowToUpload = { ...data }; }

  const finalRow = {};
  ALL_METADATA_FIELDS.forEach(f => { finalRow[f] = rowToUpload[f] !== undefined ? rowToUpload[f] : (data[f] || "N/A"); });
  if (!finalRow["Título"] || finalRow["Título"] === "N/A") finalRow["Título"] = (title && title.toLowerCase() !== "n/a") ? title : "Sem Título";
  finalRow["URL DO DOCUMENTO"] = data.pub_url || "";
  finalRow["INSERIDO POR"] = username;
  if (!finalRow["work_id"] || finalRow["work_id"] === "N/A") finalRow["work_id"] = data.id || `manual-${Date.now()}`;

  const success = await uploadToLocalSheet(wb, allData, headers, [finalRow]);
  return { status: success ? "success" : "error", message: success ? "Inserido com sucesso!" : "Erro ao salvar." };
}

async function processLocalFolderForBatchInsert(folderPath, username = "Desconhecido", onProgress = null) {
  console.log(`  > Iniciando processamento da pasta: ${folderPath}`);
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];

  const pdfFiles = await listPdfsRecursive(folderPath);
  console.log(`  > Encontrados ${pdfFiles.length} arquivos PDF.`);
  
  let processedCount = 0, errorCount = 0, skippedCount = 0;

  for (const [index, file] of pdfFiles.entries()) {
    try {
      if (onProgress) onProgress({ total: pdfFiles.length, current: index + 1, processed: processedCount, errors: errorCount, skipped: skippedCount });
      
      const currentWb = readWorkbook();
      const currentWs = currentWb.Sheets[SHEET_NAME];
      const currentData = xlsx.utils.sheet_to_json(currentWs, { header: 1 });
      
      const fileNameClean = file.name.replace(/\.pdf$/i, "");
      if (await isDuplicateLocal(currentData, headers, null, fileNameClean)) {
        console.log(`    ➜ Pulando duplicado: ${file.name}`);
        skippedCount++; continue;
      }

      const pdfBuffer = await getLocalPdfContent(file.localPath);
      const rowData = await processSinglePdfForInsert(pdfBuffer, file.name, username);

      // Copia para a pasta de documentos definitiva
      const targetPath = path.join(DOCUMENTS_DIR, file.name);
      if (file.localPath !== targetPath) {
        await fs.copyFile(file.localPath, targetPath);
      }

      await uploadToLocalSheet(currentWb, currentData, headers, [rowData]);
      processedCount++;
      console.log(`    ➜ Salvo com sucesso: ${file.name}`);
    } catch (e) { 
      console.error(`    ➜ Erro ao processar ${file.name}:`, e.message);
      errorCount++; 
    }
  }
  return { 
    message: `Processamento concluído. Salvos: ${processedCount}, Erros: ${errorCount}, Pulados: ${skippedCount}.`,
    total: pdfFiles.length,
    processed: processedCount,
    errors: errorCount,
    skipped: skippedCount
  };
}

async function getCuratedArticles() {
  const allData = await getLocalData();
  if (allData.length < 2) return [];
  const headers = allData[0];
  const rows = allData.slice(1);
  return rows.map((row, index) => {
    const article = { __row_number: index + 2 };
    headers.forEach((h, i) => { if (h) article[h] = row[i] || ""; });
    return article;
  });
}

async function deleteRow(rowNumber) {
  const allData = await getLocalData();
  if (rowNumber > allData.length) throw new Error("Linha inexistente.");
  allData.splice(rowNumber - 1, 1);
  const wb = readWorkbook();
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(allData);
  writeWorkbook(wb);
  return { success: true };
}

async function deleteUnavailableRows() {
  const allData = await getLocalData();
  const headers = allData[0];
  const urlIdx = headers.indexOf("URL DO DOCUMENTO");
  const newData = [headers];
  let count = 0;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][urlIdx]) newData.push(allData[i]);
    else count++;
  }
  const wb = readWorkbook();
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(newData);
  writeWorkbook(wb);
  return { success: true, count };
}

async function aprovarManualmenteLocal(rowNumber, fileName, username = "Desconhecido", feedback = "Aprovado manualmente") {
  const wb = readWorkbook();
  const allData = xlsx.utils.sheet_to_json(wb.Sheets[SHEET_NAME], { header: 1 });
  const headers = allData[0];
  const row = allData[rowNumber - 1];
  if (!row) throw new Error("Linha não encontrada.");

  const sourcePath = findFileInFolders(fileName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  const targetPath = path.join(APROVADOS_DIR, fileName);
  if (sourcePath !== targetPath) await fs.rename(sourcePath, targetPath);

  const upd = (h, val) => { const idx = headers.indexOf(h); if (idx !== -1) row[idx] = val; };
  upd("APROVADO POR", username);
  upd("FEEDBACK DO CURADOR (escrever)", feedback);
  upd("APROVAÇÃO MANUAL", "TRUE");
  upd("ARTIGOS REJEITADOS", "FALSE");
  upd("APROVAÇÃO CURADOR (marcar)", "TRUE");

  allData[rowNumber - 1] = row;
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(allData);
  writeWorkbook(wb);
  return { success: true };
}

async function reprovarManualmenteLocal(rowNumber, fileName, username = "Desconhecido", feedback = "Rejeitado manualmente") {
  const wb = readWorkbook();
  const allData = xlsx.utils.sheet_to_json(wb.Sheets[SHEET_NAME], { header: 1 });
  const headers = allData[0];
  const row = allData[rowNumber - 1];
  if (!row) throw new Error("Linha não encontrada.");

  const sourcePath = findFileInFolders(fileName);
  if (!sourcePath) throw new Error("Arquivo não encontrado.");
  const targetPath = path.join(REPROVADOS_DIR, fileName);
  if (sourcePath !== targetPath) await fs.rename(sourcePath, targetPath);

  const upd = (h, val) => { const idx = headers.indexOf(h); if (idx !== -1) row[idx] = val; };
  upd("APROVADO POR", username);
  upd("FEEDBACK DO CURADOR (escrever)", feedback);
  upd("APROVAÇÃO MANUAL", "FALSE");
  upd("ARTIGOS REJEITADOS", "TRUE");
  upd("APROVAÇÃO CURADOR (marcar)", "FALSE");

  allData[rowNumber - 1] = row;
  wb.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet(allData);
  writeWorkbook(wb);
  return { success: true };
}

module.exports = {
  getCuratedArticles,
  executarCuradoriaLocalmente,
  executarCuradoriaLinhaUnica,
  executarCategorizacaoLinhaUnica,
  findFileInFolders,
  deleteRow,
  deleteUnavailableRows,
  manualInsert,
  aprovarManualmente: aprovarManualmenteLocal,
  reprovarManualmente: reprovarManualmenteLocal,
  processZipUpload: async (buf, user, onProgress = null) => {
    const tmp = path.join(os.tmpdir(), `zip-${Date.now()}`);
    await fs.mkdir(tmp, { recursive: true });
    try {
      const zip = new AdmZip(buf);
      zip.extractAllTo(tmp, true);
      return await processLocalFolderForBatchInsert(tmp, user, onProgress);
    } finally {
      // Limpeza agendada do diretório temporário
      setTimeout(() => {
        try { if (fsSync.existsSync(tmp)) fsSync.rmSync(tmp, { recursive: true, force: true }); } catch(e) {}
      }, 60000);
    }
  },
  uploadFileToDrive: async (d, p, f) => {
    const t = path.join(DOCUMENTS_DIR, f);
    await fs.copyFile(p, t);
    return f;
  },
  processDriveFolderForBatchInsert: processLocalFolderForBatchInsert,
};
