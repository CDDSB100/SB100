const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const SHEET_NAME = "Tabela completa";

const manualCorrelations = [
  {
    excelTitle: "Efeito de várias aminoácidos na regeneração de brotos de cana-de-açúcar (Saccharum officinarum L.)",
    pdfFile: "EFFECT OF VARIOUS AMINO ACIDS ON SHOOT REGENERATION OF SUGARCANE_bioinsumos.pdf"
  }
];

function run() {
  console.log("Applying manual correlations (Batch 5)...");
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  let updateCount = 0;

  manualCorrelations.forEach(corr => {
    const cleanExcelTitle = corr.excelTitle.toLowerCase().trim();
    
    const row = allData.find((r, idx) => {
        if (idx === 0) return false;
        return r[titleIndex] && r[titleIndex].toString().toLowerCase().trim() === cleanExcelTitle;
    });

    if (row) {
      row[urlIndex] = corr.pdfFile;
      console.log(`Matched row for: ${corr.excelTitle.substring(0, 50)}...`);
      updateCount++;
    } else {
      console.warn(`Could not find row for title: ${corr.excelTitle}`);
    }
  });

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);

  console.log(`\nManual correlations applied! Updated ${updateCount} rows.`);
}

run();
