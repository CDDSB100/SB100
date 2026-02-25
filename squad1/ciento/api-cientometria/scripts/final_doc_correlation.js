const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

function run() {
  console.log("Final correlation check...");
  
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");

  const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  
  let validCount = 0;
  let missingCount = 0;

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const val = row[urlIndex];

    if (val && !val.toString().startsWith("http")) {
        const filePath = path.join(DOCUMENTS_DIR, val);
        if (fs.existsSync(filePath)) {
            validCount++;
        } else {
            console.log(`Row ${i+1}: Link broken (${val}). Clearing.`);
            row[urlIndex] = ""; // Clear broken link
            missingCount++;
        }
    } else if (val && val.toString().startsWith("http")) {
        console.log(`Row ${i+1}: Still has Drive URL. Clearing.`);
        row[urlIndex] = "";
        missingCount++;
    } else {
        missingCount++;
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);

  console.log(`
Correlation check finished!`);
  console.log(`Valid links: ${validCount}`);
  console.log(`Empty/Broken links: ${missingCount}`);
  console.log(`Total files in documents/: ${localFiles.length}`);
}

run();
