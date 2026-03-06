const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const SHEET_NAME = "Tabela completa";

function run() {
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell && cell.toString().includes("drive.google.com")) {
        console.log(`Found Drive URL at row ${i+1}, col ${j}: ${cell}`);
      }
    }
  }
}

run();
