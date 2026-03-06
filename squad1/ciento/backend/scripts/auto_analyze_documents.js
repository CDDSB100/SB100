const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

function cleanString(str) {
  if (!str) return "";
  return str.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ");
}

async function getPdfTextProxy(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    // Take first 500 chars of text as proxy for matching
    return cleanString(data.text.substring(0, 500));
  } catch (e) {
    return "";
  }
}

async function run() {
  console.log("Analyzing PDF contents to correlate with Excel...");
  
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${localFiles.length} files to analyze.`);

  const fileData = [];
  for (const file of localFiles) {
    const filePath = path.join(DOCUMENTS_DIR, file);
    const textProxy = await getPdfTextProxy(filePath);
    fileData.push({ file, textProxy });
    process.stdout.write(".");
  }
  console.log("\nAnalysis complete. Matching...");

  let matchedCount = 0;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const excelTitle = cleanString(row[titleIndex]);
    if (!excelTitle) continue;

    // Matching logic: check if Excel title words are found in the PDF text
    const words = excelTitle.split(" ").filter(w => w.length > 4);
    if (words.length === 0) continue;

    let bestMatch = null;
    let maxScore = 0;

    for (const f of fileData) {
        if (!f.textProxy) continue;
        const matchCount = words.filter(w => f.textProxy.includes(w)).length;
        const score = matchCount / words.length;
        if (score > maxScore) {
            maxScore = score;
            bestMatch = f.file;
        }
    }

    if (bestMatch && maxScore > 0.6) {
      row[urlIndex] = bestMatch;
      matchedCount++;
      console.log(`Row ${i+1}: Matched to ${bestMatch} (Score: ${maxScore.toFixed(2)})`);
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);

  console.log(`\nFinished! Matched ${matchedCount} documents.`);
}

run();
