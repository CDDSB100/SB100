const {
  ALL_METADATA_FIELDS,
} = require("../controllers/metadata_controller.js");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const axios = require("axios");
const xlsx = require("xlsx");

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
  console.log(`  > readWorkbook: checking if file exists at ${CONSOLIDADO_PATH}`);
  if (!fsSync.existsSync(CONSOLIDADO_PATH)) {
    console.log("  > readWorkbook: file not found, creating new one...");
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet([ALL_METADATA_FIELDS]); // Placeholder headers if file doesn't exist
    xlsx.utils.book_append_sheet(wb, ws, SHEET_NAME);
    xlsx.writeFile(wb, CONSOLIDADO_PATH);
    return wb;
  }
  console.log("  > readWorkbook: reading existing file...");
  try {
    return xlsx.readFile(CONSOLIDADO_PATH);
  } catch (err) {
    console.error(`  > readWorkbook: error reading file: ${err.message}`);
    throw err;
  }
}

function writeWorkbook(wb) {
  xlsx.writeFile(wb, CONSOLIDADO_PATH);
}

async function getLocalData() {
  console.log(`  > getLocalData: reading workbook from ${CONSOLIDADO_PATH}`);
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`  > getLocalData: Sheet '${SHEET_NAME}' not found in workbook!`);
    throw new Error(`Sheet '${SHEET_NAME}' not found in workbook.`);
  }
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`  > getLocalData: converted to JSON, ${data.length} rows.`);
  return data;
}

// Mock authenticated services to avoid breaking existing signatures if needed
async function getAuthenticatedServices() {
  return { drive: null, sheets: null };
}

// --- HELPER FUNCTIONS ---
const normalizarBooleano = (v) =>
  ["true", "sim", "yes", "verdadeiro", "aprovado", "1"].includes(
    String(v || "").toLowerCase(),
  );

// Converte um índice 0-based de coluna para notação A1 (A, B, ..., Z, AA, AB, ...)
function colIndexToA1(colIndex) {
  let s = "";
  let n = colIndex + 1; // 1-based
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function callCustomCuradorApi(pdfBuffer, headers, category = null) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers,
    category,
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/curadoria`, payload, {
      timeout: 120000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    const msg = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("LLM API Error:", msg);
    throw new Error("Erro na API do LLM: " + msg);
  }
}

async function callCategorizationApi(pdfBuffer) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers: [], // Required by Pydantic model, even if empty
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/categorize`, payload, {
      timeout: 60000, // Categoria deve ser mais rápida
      headers: { "Content-Type": "application/json" },
    });
    return res.data.category; // Assuming the LLM returns {"category": "CATEGORY_NAME"}
  } catch (error) {
    const msg = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error("HuggingFace Categorization API Error:", msg);
    throw new Error("Erro na API HuggingFace (Categorização): " + msg);
  }
}

async function listPdfsInLocalFolder(folderPath) {
  const files = await fs.readdir(folderPath);
  return files
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => ({
      name: f,
      id: f,
      localPath: path.join(folderPath, f),
    }));
}

async function getLocalPdfContent(filePath) {
  return await fs.readFile(filePath);
}

async function direcionarArquivoAposProcessamentoLocal(
  fileName,
  fullRowData,
  fullHeaders,
  aprovado,
) {
  const subDir = aprovado ? "aprovados" : "reprovados";
  const targetDir = path.join(DOCUMENTS_DIR, subDir);
  if (!fsSync.existsSync(targetDir)) {
    fsSync.mkdirSync(targetDir, { recursive: true });
  }

  const sourcePath = path.join(DOCUMENTS_DIR, fileName);
  const targetPath = path.join(targetDir, fileName);

  try {
    if (fsSync.existsSync(sourcePath)) {
      await fs.rename(sourcePath, targetPath);
      console.log(`  > File ${fileName} moved to ${subDir}.`);
    }

    const txtContent = fullHeaders
      .map((h, i) => `${h}: ${fullRowData[i] || ""}`)
      .join("\n");
    const txtFileName = fileName.replace(/\.pdf$/i, "") + ".txt";
    const txtPath = path.join(targetDir, txtFileName);

    await fs.writeFile(txtPath, txtContent);
    console.log(`  > Metadata file '${txtFileName}' created in ${subDir}.`);
  } catch (e) {
    console.error("  > Local archival error: " + e.message);
  }
}

// colorirLinhaUnica will be simplified as xlsx doesn't easily support cell styling without extra effort
async function colorirLinhaUnicaLocal(rowReal, isAprovado, isRejeitado) {
  // Simplified: xlsx style support is limited in the basic version
  console.log(`Row ${rowReal} status: ${isAprovado ? "Approved" : isRejeitado ? "Rejected" : "Processing"}`);
}

// --- MAIN LOGIC ---
async function processarUmaLinha(
  rowReal,
  row,
  headers,
  llmOutputHeaders,
  colAprovacaoIndex,
  colRejeicaoIndex,
  colUrlDocumentoIndex,
  colFeedbackCuradorIndex,
  colInicioDadosApiIndex,
) {
  console.log(`\nProcessing row ${rowReal}...`);
  const fileName = row[colUrlDocumentoIndex] || "";
  if (!fileName) {
    console.error(`Row ${rowReal} has no document filename/path.`);
    return { success: false, updatedRow: row };
  }

  const filePath = findFileInFolders(fileName);

  try {
    if (!filePath) {
      throw new Error(`Arquivo não encontrado em nenhuma das pastas: ${fileName}`);
    }

    const pdfBuffer = await fs.readFile(filePath);

    // Identifica a categoria da coluna AJ (índice 35) ou pelo header "CATEGORIA"
    let colCategoriaIndex = headers.indexOf("CATEGORIA");
    if (colCategoriaIndex === -1) colCategoriaIndex = 35; // Fallback para AJ
    const originalCategory = row[colCategoriaIndex] || "";

    const extractedData = await callCustomCuradorApi(
      pdfBuffer,
      llmOutputHeaders,
      originalCategory
    );

    // Prepare data for updating LLM output columns in the local row object
    llmOutputHeaders.forEach((header) => {
      // JAMAIS sobrescrever a categoria durante a curadoria
      if (header === "CATEGORIA") return;

      const value =
        extractedData[header] !== undefined ? extractedData[header] : "N/A";
      const headerIndex = headers.indexOf(header);
      if (headerIndex !== -1) {
        row[headerIndex] = value;
      }
    });

    // Garantir que a categoria original seja mantida
    row[colCategoriaIndex] = originalCategory;

    const boolAprovado = normalizarBooleano(
      extractedData["APROVAÇÃO CURADOR (marcar)"] || extractedData["aprovacao"],
    );
    const feedbackCurador =
      extractedData["FEEDBACK DO CURADOR (escrever)"] || "N/A";

    // Atualiza a coluna de APROVAÇÃO
    row[colAprovacaoIndex] = boolAprovado ? "TRUE" : "FALSE";
    // Atualiza a coluna de REJEIÇÃO
    row[colRejeicaoIndex] = !boolAprovado ? "TRUE" : "FALSE";
    // Atualiza a coluna de Feedback do Curador
    row[colFeedbackCuradorIndex] = feedbackCurador;

    await direcionarArquivoAposProcessamentoLocal(
      path.basename(fileName),
      row,
      headers,
      boolAprovado,
    );

    return { success: true, updatedRow: row };
  } catch (e) {
    console.error(`  > ERROR on row ${rowReal}: ${e.message}`);
    const errorMessage = `ERRO: ${e.message.substring(0, 500)}`;

    // Update the starting LLM output column with the error message
    if (row.length > colInicioDadosApiIndex) {
      row[colInicioDadosApiIndex] = errorMessage;
    } else {
      while (row.length <= colInicioDadosApiIndex) {
        row.push("");
      }
      row[colInicioDadosApiIndex] = errorMessage;
    }

    // Also mark as rejected if there was an error
    row[colAprovacaoIndex] = "FALSE";
    row[colRejeicaoIndex] = "TRUE";
    row[colFeedbackCuradorIndex] = `Erro na análise: ${errorMessage}`;

    return { success: false, updatedRow: row };
  }
}

async function executarCuradoriaLocalmente() {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  const headers = allData[0] || [];
  if (headers.length === 0) throw new Error("No headers found in sheet.");

  const colAprovacaoIndex = headers.indexOf("APROVAÇÃO CURADOR (marcar)");
  const colRejeicaoIndex = headers.indexOf("ARTIGOS REJEITADOS");
  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");
  const colFeedbackCuradorIndex = headers.indexOf(
    "FEEDBACK DO CURADOR (escrever)",
  );
  const colInicioDadosApiIndex = headers.indexOf(ALL_METADATA_FIELDS[0]);

  if (
    colAprovacaoIndex === -1 ||
    colRejeicaoIndex === -1 ||
    colUrlDocumentoIndex === -1 ||
    colFeedbackCuradorIndex === -1 ||
    colInicioDadosApiIndex === -1
  ) {
    throw new Error(
      "Colunas essenciais para curadoria não encontradas na planilha local.",
    );
  }

  const dataRows = allData.slice(1);
  let processados = 0,
    erros = 0;

  for (const [i, row] of dataRows.entries()) {
    const isApproved =
      (row[colAprovacaoIndex] || "").toString().trim().toUpperCase() === "TRUE";
    const isRejected =
      (row[colRejeicaoIndex] || "").toString().trim().toUpperCase() === "TRUE";
    
    // For local, "URL DO DOCUMENTO" should contain a filename or path
    const hasDocument = (row[colUrlDocumentoIndex] || "").toString().trim() !== "";

    if (!isApproved && !isRejected && hasDocument) {
      const result = await processarUmaLinha(
        i + 2,
        row,
        headers,
        ALL_METADATA_FIELDS,
        colAprovacaoIndex,
        colRejeicaoIndex,
        colUrlDocumentoIndex,
        colFeedbackCuradorIndex,
        colInicioDadosApiIndex,
      );
      
      // Update the main data array
      allData[i + 1] = result.updatedRow;
      
      result.success ? processados++ : erros++;
      
      // Update workbook periodically or at the end. Here we do it per row for safety.
      const newWs = xlsx.utils.aoa_to_sheet(allData);
      wb.Sheets[SHEET_NAME] = newWs;
      writeWorkbook(wb);
    }
  }
  return {
    message: `Batch process finished. Processed: ${processados} | Errors: ${erros}`,
  };
}

async function executarCuradoriaLinhaUnica(rowNumber) {
  if (rowNumber < 2) throw new Error("Row number must be 2 or greater.");
  
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  const headers = allData[0] || [];
  const row = allData[rowNumber - 1];

  if (!row) {
    throw new Error(`A linha ${rowNumber} não contém valores ou está vazia.`);
  }

  const colAprovacaoIndex = headers.indexOf("APROVAÇÃO CURADOR (marcar)");
  const colRejeicaoIndex = headers.indexOf("ARTIGOS REJEITADOS");
  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");
  const colFeedbackCuradorIndex = headers.indexOf(
    "FEEDBACK DO CURADOR (escrever)",
  );
  const colInicioDadosApiIndex = headers.indexOf(ALL_METADATA_FIELDS[0]);

  if (
    colAprovacaoIndex === -1 ||
    colRejeicaoIndex === -1 ||
    colUrlDocumentoIndex === -1 ||
    colFeedbackCuradorIndex === -1 ||
    colInicioDadosApiIndex === -1
  ) {
    throw new Error(
      "Colunas essenciais para curadoria não encontradas na planilha local.",
    );
  }

  const { success, updatedRow } = await processarUmaLinha(
    rowNumber,
    row,
    headers,
    ALL_METADATA_FIELDS,
    colAprovacaoIndex,
    colRejeicaoIndex,
    colUrlDocumentoIndex,
    colFeedbackCuradorIndex,
    colInicioDadosApiIndex,
  );

  // Update workbook
  allData[rowNumber - 1] = updatedRow;
  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  writeWorkbook(wb);

  const articleObject = { __row_number: rowNumber };
  headers.forEach((h, i) => {
    articleObject[h] = updatedRow[i] || "";
  });

  return {
    message: success ? `Row ${rowNumber} processed successfully.` : `Failed to process row ${rowNumber}.`,
    updatedArticle: articleObject,
  };
}

async function executarCategorizacaoLinhaUnica(rowNumber) {
  if (rowNumber < 2) throw new Error("Row number must be 2 or greater.");
  
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  const headers = allData[0] || [];
  const row = allData[rowNumber - 1];

  if (!row) {
    throw new Error("Não foi possível encontrar a linha solicitada.");
  }

  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");
  let colCategoriaIndex = headers.indexOf("CATEGORIA");
  if (colCategoriaIndex === -1) colCategoriaIndex = 35; // Fallback

  const fileName = row[colUrlDocumentoIndex] || "";
  if (!fileName) throw new Error("Este artigo não possui um documento local para categorização.");

  const filePath = findFileInFolders(fileName);

  if (!filePath) {
    throw new Error(`Arquivo não encontrado em nenhuma das pastas: ${fileName}`);
  }

  const pdfBuffer = await fs.readFile(filePath);
  const category = await callCategorizationApi(pdfBuffer);

  // Update row and workbook
  row[colCategoriaIndex] = category;
  allData[rowNumber - 1] = row;
  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  writeWorkbook(wb);

  const articleObject = { __row_number: rowNumber };
  headers.forEach((h, i) => {
    articleObject[h] = row[i] || "";
  });

  return {
    message: `Artigo da linha ${rowNumber} categorizado como ${category}.`,
    updatedArticle: articleObject,
  };
}

async function processLocalFolderForBatchInsert(folderPath) {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];
  if (headers.length === 0) throw new Error("No headers found in local sheet.");

  // If folderPath is not absolute, treat it relative to the project root or documents dir
  const absoluteFolderPath = path.isAbsolute(folderPath) 
    ? folderPath 
    : path.join(__dirname, "../../", folderPath);

  if (!fsSync.existsSync(absoluteFolderPath)) {
    throw new Error(`Pasta não encontrada: ${absoluteFolderPath}`);
  }

  const pdfFiles = await listPdfsInLocalFolder(absoluteFolderPath);
  if (!pdfFiles || pdfFiles.length === 0) {
    return { message: "Nenhum arquivo PDF encontrado na pasta local." };
  }

  const articlesToUpload = [];
  let processedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const file of pdfFiles) {
    try {
      const fileNameTitle = file.name.replace(/\.pdf$/i, "");
      const duplicate = await isDuplicateLocal(allData, headers, null, fileNameTitle);
      if (duplicate) {
        console.log(`Skipping duplicate file: ${file.name}`);
        skippedCount++;
        continue;
      }

      const pdfBuffer = await getLocalPdfContent(file.localPath);
      const category = await callCategorizationApi(pdfBuffer);
      const extractedMetadata = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS);

      const fullDuplicate = await isDuplicateLocal(allData, headers, extractedMetadata["DOI"], extractedMetadata["Titulo"] || extractedMetadata["Título"]);
      if (fullDuplicate) {
        console.log(`Skipping duplicate after metadata extraction: ${extractedMetadata["Titulo"]}`);
        skippedCount++;
        continue;
      }

      // Copy file to documents directory for local storage
      const targetPath = path.join(DOCUMENTS_DIR, file.name);
      if (file.localPath !== targetPath) {
        await fs.copyFile(file.localPath, targetPath);
      }

      const rowData = {};
      ALL_METADATA_FIELDS.forEach(field => {
        rowData[field] = extractedMetadata[field] || "N/A";
      });
      rowData["CATEGORIA"] = category;
      rowData["URL DO DOCUMENTO"] = file.name; // Store relative path/filename
      rowData["Título"] = extractedMetadata["Titulo"] || file.name.replace(/\.pdf$/i, '');

      articlesToUpload.push(rowData);
      processedCount++;

    } catch (e) {
      console.error(`Error processing file ${file.name}: ${e.message}`);
      errorCount++;
    }
  }

  if (articlesToUpload.length > 0) {
    const success = await uploadToLocalSheet(wb, allData, headers, articlesToUpload);
    if (success) {
      return {
        message: `Processamento em lote concluído. Total: ${pdfFiles.length}, Processados com sucesso: ${processedCount}, Com erros: ${errorCount}, Duplicados: ${skippedCount}. Dados inseridos na planilha local.`,
        processedCount,
        errorCount,
        skippedCount,
      };
    } else {
      throw new Error("Falha ao inserir os dados na planilha local.");
    }
  } else {
    return {
      message: `Processamento em lote concluído. Total: ${pdfFiles.length}, Nenhum artigo novo inserido (Poderiam ser duplicatas: ${skippedCount}).`,
      processedCount,
      errorCount,
      skippedCount,
    };
  }
}

async function getCuratedArticles() {
  console.log("  > getCuratedArticles: reading local data...");
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  console.log(`  > getCuratedArticles: ${allData.length} rows found.`);
  if (allData.length < 2) return [];
  const headers = allData[0];
  
  let colCategoriaIndex = headers.indexOf("CATEGORIA");
  if (colCategoriaIndex === -1) colCategoriaIndex = 35;
  const colUrlDocumentoIndex = headers.indexOf("URL DO DOCUMENTO");

  const allowedCategories = [
    "BIOINSUMOS",
    "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE"
  ];

  let modified = false;
  let repairedCount = 0;

  // Percorrer os dados para validar categorias
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    let category = String(row[colCategoriaIndex] || "").trim();

    if (!allowedCategories.includes(category) && repairedCount < 10) {
      const fileName = row[colUrlDocumentoIndex];
      const filePath = findFileInFolders(fileName);
      
      if (filePath) {
        console.log(`  > Reparando categoria inválida ('${category}') na linha ${i + 1}...`);
        try {
          const pdfBuffer = await fs.readFile(filePath);
          const newCategory = await callCategorizationApi(pdfBuffer);
          if (newCategory) {
            allData[i][colCategoriaIndex] = newCategory;
            modified = true;
            repairedCount++;
            console.log(`    ➜ Nova categoria: ${newCategory}`);
          }
        } catch (e) {
          console.error(`    ➜ Erro ao reparar linha ${i+1}: ${e.message}`);
        }
      }
    }
  }

  if (modified) {
    const newWs = xlsx.utils.aoa_to_sheet(allData);
    wb.Sheets[SHEET_NAME] = newWs;
    writeWorkbook(wb);
  }

  // Retornar os dados mapeados como objetos
  const [, ...rows] = allData;
  return rows.map((row, index) => {
    const article = { __row_number: index + 2 };
    headers.forEach((header, i) => {
      if (header) {
        article[header] = row[i] || "";
      }
    });
    return article;
  });
}

const reconstructAbstract = (invertedIndex) => {
  if (!invertedIndex) return "";
  const wordIndex = Object.entries(invertedIndex).flatMap(([word, positions]) =>
    positions.map((pos) => [pos, word]),
  );
  wordIndex.sort((a, b) => a[0] - b[0]);
  return wordIndex.map(([, word]) => word).join(" ");
};

async function searchOpenAlex(
  searchExpression,
  startYear,
  endYear,
  sortOption = "relevance",
) {
  let sortParam = "relevance_score:desc";

  if (sortOption === "newest") {
    sortParam = "publication_year:desc";
  } else if (sortOption === "cited") {
    sortParam = "cited_by_count:desc";
  }

  const params = {
    filter: `title_and_abstract.search:${searchExpression},publication_year:${startYear}-${endYear}`,
    sort: sortParam,
    "per-page": 200,
    cursor: "*",
    mailto: EMAIL_CONTATO,
  };
  const allWorks = [];
  while (true) {
    try {
      const { data } = await axios.get("https://api.openalex.org/works", {
        params,
      });
      if (data.results.length === 0) break;
      allWorks.push(...data.results);
      if (!data.meta.next_cursor || allWorks.length >= 400) break;
      params.cursor = data.meta.next_cursor;
    } catch (error) {
      console.error("OpenAlex search error:", error.message);
      break;
    }
  }
  return allWorks.map((work) => ({
    id: work.id,
    work_id: work.id,
    pdf_url: work.best_oa_location?.pdf_url,
    authors: (work.authorships || [])
      .map((a) => a.author?.display_name || "")
      .join(", "),
    title: work.title || "",
    year: work.publication_year || "",
    cited_by_count: work.cited_by_count || 0,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    type: work.type || "",
    doi: (work.doi || "").replace("https://doi.org/", ""),
    source:
      work.host_venue?.display_name ||
      work.primary_location?.source?.display_name ||
      "",
  }));
}

async function isDuplicateLocal(allData, headers, doi, title) {
  if (!allData || allData.length < 2) return false;

  const rows = allData.slice(1);
  const doiIndex = headers.indexOf("DOI");
  const titleIndex = headers.indexOf("Título");
  const titleIndexAlt = headers.indexOf("Titulo");

  const searchDoi = doi ? String(doi).trim().toLowerCase() : null;
  const searchTitle = title ? String(title).trim().toLowerCase() : null;

  for (const row of rows) {
    if (searchDoi && doiIndex !== -1) {
      const rowDoi = String(row[doiIndex] || "").trim().toLowerCase();
      if (rowDoi === searchDoi && rowDoi !== "") return true;
    }

    if (searchTitle) {
      const idx = titleIndex !== -1 ? titleIndex : titleIndexAlt;
      if (idx !== -1) {
        const rowTitle = String(row[idx] || "").trim().toLowerCase();
        if (rowTitle === searchTitle && rowTitle !== "") return true;
      }
    }
  }
  return false;
}

async function saveData(selectedRows) {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];
  
  const finalDataToUpload = [];

  for (const [i, rowData] of selectedRows.entries()) {
    const duplicate = await isDuplicateLocal(allData, headers, rowData.doi, rowData.title);
    if (duplicate) {
      console.log(`Skipping duplicate: ${rowData.title} (DOI: ${rowData.doi})`);
      continue;
    }

    let localFileName = rowData.title.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
    if (rowData.pdf_url) {
      const filename = path.join(DOCUMENTS_DIR, localFileName);
      try {
        const response = await axios.get(rowData.pdf_url, {
          responseType: "stream",
          timeout: 30000,
        });
        const writer = fsSync.createWriteStream(filename);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });
      } catch (err) {
        console.error(
          `Failed to download ${rowData.pdf_url}:`,
          err.message,
        );
        localFileName = rowData.pdf_url; // Fallback to URL if download fails
      }
    }
    finalDataToUpload.push({
      ...rowData,
      "URL DO DOCUMENTO": localFileName,
    });
  }

  if (finalDataToUpload.length > 0) {
    const success = await uploadToLocalSheet(wb, allData, headers, finalDataToUpload);
    return {
      status: success ? "success" : "error",
      message: success
        ? `${finalDataToUpload.length} records saved locally!`
        : "Failed to save.",
    };
  }
  return { status: "info", message: "No data to save." };
}

async function uploadToLocalSheet(wb, allData, headers, data) {
  try {
    const finalValues = data.map((row) => {
      const newRow = new Array(headers.length).fill("");
      headers.forEach((h, i) => {
        if (row[h] !== undefined) newRow[i] = String(row[h]);
      });
      return newRow;
    });

    const newData = allData.concat(finalValues);
    const newWs = xlsx.utils.aoa_to_sheet(newData);
    wb.Sheets[SHEET_NAME] = newWs;
    writeWorkbook(wb);
    return true;
  } catch (error) {
    console.error("ERROR Local Sheet:", error.message);
    return false;
  }
}

async function manualInsert(data) {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0] || [];

  const isAlreadyPresent = await isDuplicateLocal(allData, headers, data.DOI, data["Título"]);
  if (isAlreadyPresent) {
    return {
      status: "error",
      message: `Erro: O documento '${data["Título"]}' já está cadastrado na planilha local e não pode ser inserido novamente.`,
    };
  }

  const rowToUpload = {
    "Autor(es)": data["Autor(es)"],
    "Título": data["Título"],
    "Subtítulo": data["Subtítulo"],
    "Ano": data.Ano,
    "Número de citações recebidas (Google Scholar)":
      data["Número de citações recebidas (Google Scholar)"],
    "Palavras-chave": data["Palavras-chave"],
    "Resumo": data.Resumo,
    "Tipo de documento": data["Tipo de documento"],
    "Editora": data.Editora,
    "Instituição": data.Instituição,
    "Local": data.Local,
    "Tipo de trabalho": data["Tipo de trabalho"],
    "Título do periódico": data["Título do periódico"],
    "Quartil do periódico": data["Quartil do periódico"],
    "Volume": data.Volume,
    "Número/fascículo": data["Número/fascículo"],
    "Páginas": data.Páginas,
    "DOI": data.DOI,
    "Numeração": data.Numeração,
    "Qualis": data.Qualis,
    "CATEGORIA": data.CATEGORIA,
    "Caracteristicas do solo e região (escrever)":
      data["Caracteristicas do solo e região (escrever)"],
    "ferramentas e técnicas (seleção)":
      data["ferramentas e técnicas (seleção)"],
    "nutrientes (seleção)": data["nutrientes (seleção)"],
    "estratégias de fornecimento de nutrientes (seleção)":
      data["estratégias de fornecimento de nutrientes (seleção)"],
    "grupos de culturas (seleção)": data["grupos de culturas (seleção)"],
    "culturas presentes (seleção)": data["culturas presentes (seleção)"],
    "FEEDBACK DO CURADOR (escrever)": data["FEEDBACK DO CURADOR (escrever)"],
    "URL DO DOCUMENTO": data.pub_url,
    "work_id": data.id || `manual-${Date.now()}`,
  };

  const success = await uploadToLocalSheet(wb, allData, headers, [rowToUpload]);

  if (success) {
    return {
      status: "success",
      message: "Documento inserido com sucesso na planilha local!",
    };
  } else {
    return {
      status: "error",
      message: "Falha ao salvar os dados na planilha local.",
    };
  }
}

async function deleteRow(rowNumber) {
  if (rowNumber < 2) throw new Error("Row number must be 2 or greater.");
  
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  if (rowNumber > allData.length) {
    throw new Error(`Linha ${rowNumber} não existe.`);
  }

  const headers = allData[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const row = allData[rowNumber - 1];

  // Move file to reprovados if it exists
  if (urlIndex !== -1 && row[urlIndex]) {
    const fileName = row[urlIndex];
    const sourcePath = path.join(DOCUMENTS_DIR, fileName);
    const targetPath = path.join(REPROVADOS_DIR, fileName);
    
    if (fsSync.existsSync(sourcePath)) {
      try {
        await fs.rename(sourcePath, targetPath);
        console.log(`Arquivo ${fileName} movido para reprovados.`);
      } catch (err) {
        console.error(`Erro ao mover arquivo para reprovados: ${err.message}`);
      }
    }
  }

  allData.splice(rowNumber - 1, 1);
  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  writeWorkbook(wb);
  return { success: true, message: `Row ${rowNumber} deleted successfully and file moved to reprovados.` };
}

async function deleteUnavailableRows() {
  const wb = readWorkbook();
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  if (allData.length < 2)
    return { message: "No data to process." };

  const headers = allData[0];
  let urlColIndex = headers.indexOf("URL DO DOCUMENTO");
  if (urlColIndex === -1) urlColIndex = 21;

  const newData = [headers];
  let deletedCount = 0;

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const val = row[urlColIndex];
    if (val && val.toString().trim() !== "") {
      newData.push(row);
    } else {
      deletedCount++;
    }
  }

  if (deletedCount === 0) {
    return { message: "No unavailable rows found to delete." };
  }

  const newWs = xlsx.utils.aoa_to_sheet(newData);
  wb.Sheets[SHEET_NAME] = newWs;
  writeWorkbook(wb);

  return {
    success: true,
    message: `Successfully deleted ${deletedCount} unavailable rows from local sheet.`,
  };
}

async function aprovarManualmenteLocal(rowNumber, fileName) {
  if (!fileName) {
    throw new Error("O artigo não possui um arquivo local associado.");
  }

  try {
    const wb = readWorkbook();
    const ws = wb.Sheets[SHEET_NAME];
    const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const headers = allData[0];
    const row = allData[rowNumber - 1];

    if (!row) throw new Error(`Linha ${rowNumber} não encontrada.`);

    // 1. Move PDF to aprovados
    const sourcePath = path.join(DOCUMENTS_DIR, fileName);
    const targetPath = path.join(APROVADOS_DIR, fileName);

    if (fsSync.existsSync(sourcePath)) {
      await fs.rename(sourcePath, targetPath);
    }

    // 2. Create .txt with metadata
    const txtFileName = fileName.replace(/\.[^/.]+$/, "") + ".txt";
    const txtPath = path.join(APROVADOS_DIR, txtFileName);
    
    let metadataText = "--- METADADOS DO ARTIGO ---\n\n";
    headers.forEach((header, index) => {
      const value = row[index] !== undefined ? row[index] : "";
      metadataText += `${header}: ${value}\n`;
    });

    await fs.writeFile(txtPath, metadataText, "utf8");

    // 3. Update Excel status
    const aprovIndex = headers.indexOf("APROVAÇÃO MANUAL");
    if (aprovIndex !== -1) {
      allData[rowNumber - 1][aprovIndex] = "TRUE";
      const newWs = xlsx.utils.aoa_to_sheet(allData);
      wb.Sheets[SHEET_NAME] = newWs;
      writeWorkbook(wb);
    }

    return {
      success: true,
      message: `Artigo ${fileName} aprovado, movido para 'aprovados' e metadados salvos em .txt.`,
    };
  } catch (error) {
    console.error(`Erro na aprovação manual da linha ${rowNumber}:`, error.message);
    throw new Error(`Falha ao aprovar manualmente o artigo localmente: ${error.message}`);
  }
}

module.exports = {
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
  aprovarManualmente: aprovarManualmenteLocal,
  getAuthenticatedServices,
  uploadFileToDrive: async (d, p, f) => {
    // Replacement for Drive upload
    const targetPath = path.join(DOCUMENTS_DIR, f);
    await fs.copyFile(p, targetPath);
    return f; // Return filename as the "URL"
  },
  processDriveFolderForBatchInsert: processLocalFolderForBatchInsert,
};
