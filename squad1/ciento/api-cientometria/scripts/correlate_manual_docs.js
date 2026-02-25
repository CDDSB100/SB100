const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

function cleanString(str) {
  if (!str) return "";
  // Remove accents, convert to lower case, remove non-alphanumeric
  return str.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function run() {
  console.log("Correlating manually uploaded documents with Excel rows...");
  
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");
  const authorIndex = headers.indexOf("Autor(es)");

  if (urlIndex === -1 || titleIndex === -1) {
    console.error("Required columns not found.");
    return;
  }

  const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
  console.log(`Found ${localFiles.length} PDF files in 'documents/' folder.`);

  let matchedCount = 0;
  let skippedCount = 0;

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const title = row[titleIndex];
    const authors = row[authorIndex] || "";
    
    if (!title) continue;

    const cleanTitle = cleanString(title);
    const firstAuthor = authors.split(';')[0].split(' ')[0]; // Take first name of first author
    const cleanFirstAuthor = cleanString(firstAuthor);

    // Matching strategy:
    // 1. Check if filename contains a significant portion of the title
    // 2. Check if filename contains author name + year (common in manual filenames)
    
    let bestMatch = null;
    let maxOverlap = 0;

    for (const file of localFiles) {
      const cleanFile = cleanString(file);
      
      // Calculate overlap of words
      const titleWords = cleanTitle.split(" ").filter(w => w.length > 3);
      const matchedWords = titleWords.filter(w => cleanFile.includes(w));
      const overlap = matchedWords.length / titleWords.length;

      if (overlap > maxOverlap && overlap > 0.4) {
        maxOverlap = overlap;
        bestMatch = file;
      }
      
      // Author check if no good title match yet
      if (overlap < 0.4 && cleanFirstAuthor && cleanFile.includes(cleanFirstAuthor)) {
          // If it has author and year, it's a very likely match
          const year = row[headers.indexOf("Ano")];
          if (year && cleanFile.includes(year.toString())) {
              bestMatch = file;
              maxOverlap = 0.9; // Arbitrary high value
          }
      }
    }

    if (bestMatch) {
      console.log(`Row ${i + 1}: Matched "${title.substring(0, 40)}..." to -> ${bestMatch}`);
      row[urlIndex] = bestMatch;
      matchedCount++;
    } else {
      skippedCount++;
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);

  console.log(`
Correlation finished!`);
  console.log(`Matched and updated ${matchedCount} rows in Excel.`);
  console.log(`${skippedCount} rows could not be matched.`);
}

run();
