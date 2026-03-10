const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const SHEET_NAME = "Tabela completa";

function generateFilename(title) {
  if (!title) return "";
  return title.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
}

function updateExcel() {
  console.log("Reading workbook...");
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  if (urlIndex === -1 || titleIndex === -1) {
    console.error("Column 'URL DO DOCUMENTO' or 'Título' not found.");
    console.log("Headers found:", headers);
    return;
  }

  console.log(`URL Index: ${urlIndex}, Title Index: ${titleIndex}`);

  let updateCount = 0;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const url = row[urlIndex];
    const title = row[titleIndex];

    if (url && url.toString().startsWith("http")) {
      const fileName = generateFilename(title);
      if (fileName) {
        row[urlIndex] = fileName;
        updateCount++;
      }
    }
  }

  console.log(`Updated ${updateCount} rows.`);

  console.log("Creating new worksheet...");
  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  
  console.log("Writing workbook...");
  xlsx.writeFile(wb, CONSOLIDADO_PATH);
  console.log("Excel file successfully updated!");
}

updateExcel();
