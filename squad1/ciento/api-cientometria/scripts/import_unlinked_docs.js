const {
  ALL_METADATA_FIELDS,
} = require("../src/controllers/metadata_controller.js");
const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";
const API_BASE_URL = "https://curadoria-llm-curadoria.hf.space";

async function callCustomCuradorApi(pdfBuffer, headers) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers,
    category: null,
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/curadoria`, payload, {
      timeout: 120000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    console.error("API Error:", error.message);
    return null;
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
      timeout: 60000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data.category;
  } catch (error) {
    return "N/A";
  }
}

async function run() {
  console.log("Analyzing documents not yet in Excel...");
  
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const doiIndex = headers.indexOf("DOI");
  
  const linkedFiles = allData.slice(1).map(row => row[urlIndex]).filter(val => val && !val.startsWith("http"));
  const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  
  const unlinkedFiles = localFiles.filter(f => !linkedFiles.includes(f));
  console.log(`Found ${unlinkedFiles.length} files not yet linked in Excel.`);

  for (const file of unlinkedFiles) {
    console.log(`Processing: ${file}`);
    const filePath = path.join(DOCUMENTS_DIR, file);
    const pdfBuffer = fs.readFileSync(filePath);

    console.log("  > Extracting metadata and categorizing...");
    const category = await callCategorizationApi(pdfBuffer);
    const extractedData = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS);

    if (!extractedData) {
        console.error(`  > Failed to extract data for ${file}`);
        continue;
    }

    // Check DOI duplicate in Excel
    const doi = extractedData["DOI"];
    if (doi && doi !== "N/A") {
        const duplicate = allData.some(row => row[doiIndex] && row[doiIndex].toString().includes(doi));
        if (duplicate) {
            console.log(`  > Skipping ${file}: DOI ${doi} already in Excel.`);
            continue;
        }
    }

    const newRow = new Array(headers.length).fill("");
    headers.forEach((h, i) => {
        if (extractedData[h]) newRow[i] = extractedData[h];
    });

    // Manually set some fields
    newRow[urlIndex] = file;
    const catIndex = headers.indexOf("CATEGORIA");
    if (catIndex !== -1) newRow[catIndex] = category;
    
    // Set status fields to Pending
    const statusIdx1 = headers.indexOf("APROVAÇÃO CURADOR (marcar)");
    const statusIdx2 = headers.indexOf("ARTIGOS REJEITADOS");
    if (statusIdx1 !== -1) newRow[statusIdx1] = "FALSE";
    if (statusIdx2 !== -1) newRow[statusIdx2] = "FALSE";

    allData.push(newRow);
    console.log(`  > Added to Excel: ${extractedData["Título"] || extractedData["Titulo"] || file}`);
    
    // Save progress after each file
    const newWs = xlsx.utils.aoa_to_sheet(allData);
    wb.Sheets[SHEET_NAME] = newWs;
    xlsx.writeFile(wb, CONSOLIDADO_PATH);
  }

  console.log("Batch processing finished!");
}

run();
