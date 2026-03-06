const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const SHEET_NAME = "Tabela completa";

function run() {
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  console.log("Rows still without local file links:");
  let count = 0;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const val = row[urlIndex];
    if (!val || val.toString().startsWith("http")) {
        console.log(`Row ${i+1}: ${row[titleIndex]}`);
        count++;
    }
  }
  console.log(`
Total missing: ${count}`);
}

run();
