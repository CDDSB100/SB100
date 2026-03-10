const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

function cleanString(str) {
  if (!str) return "";
  return str.toString().toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, "");
}

function run() {
  console.log("Correlating existing documents in 'documents/' with Excel rows...");
  
  if (!fs.existsSync(CONSOLIDADO_PATH)) {
    console.error("Excel file not found.");
    return;
  }

  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  if (urlIndex === -1 || titleIndex === -1) {
    console.error("Required columns not found.");
    return;
  }

  const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${localFiles.length} PDF files in 'documents/' folder.`);

  let matchedCount = 0;

  // Map to store clean title -> filename
  // Since filenames are often related to titles but not exactly the same, 
  // we might need a smart matching or the user just wants us to match 
  // if the filename contains part of the title or vice versa.
  
  // Actually, the previous script generated filenames from titles.
  // Let's try to match by generating the same filename from the Excel title.

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const title = row[titleIndex];
    if (!title) continue;

    const generatedName = title.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
    
    // Check if this specific generated name exists in localFiles
    if (localFiles.includes(generatedName)) {
      row[urlIndex] = generatedName;
      matchedCount++;
      continue;
    }

    // Fallback: search for a file that contains significant part of the title
    const cleanTitle = cleanString(title).substring(0, 30);
    const fuzzyMatch = localFiles.find(f => cleanString(f).includes(cleanTitle));
    
    if (fuzzyMatch) {
      row[urlIndex] = fuzzyMatch;
      matchedCount++;
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);

  console.log(`
Correlation finished!`);
  console.log(`Matched and updated ${matchedCount} rows in Excel.`);
}

run();
