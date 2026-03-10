const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const BACKUP_PATH = path.join(__dirname, "../Consolidado - ORIGINAL_BACKUP.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

async function downloadFile(url, targetPath) {
  try {
    let downloadUrl = url;
    if (url.includes("drive.google.com/file/d/")) {
      const fileId = url.match(/\/d\/([-\w]{25,})/);
      if (fileId && fileId[1]) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId[1]}`;
      }
    }

    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      validateStatus: false
    });

    if (response.status !== 200) {
        console.error(`  > HTTP ${response.status} for ${url}`);
        return false;
    }

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      const htmlContent = response.data.toString();
      if (htmlContent.includes('uc-download-link')) {
        const confirmMatch = htmlContent.match(/href="([^"]+confirm=[^"]+)"/);
        if (confirmMatch) {
          const confirmUrl = confirmMatch[1].replace(/&amp;/g, '&');
          return downloadFile(`https://drive.google.com${confirmUrl}`, targetPath);
        }
      }
      return "HTML_ERROR";
    }

    const buffer = Buffer.from(response.data);
    if (buffer.toString('utf8', 0, 4) !== '%PDF') {
        return false;
    }

    fs.writeFileSync(targetPath, buffer);
    return true;
  } catch (error) {
    console.error(`  > Error downloading ${url}: ${error.message}`);
    return false;
  }
}

async function run() {
  console.log("Fixing PDF downloads using backup...");
  
  if (!fs.existsSync(BACKUP_PATH)) {
      console.error("Backup file not found!");
      return;
  }

  const wbBackup = xlsx.readFile(BACKUP_PATH);
  const dataBackup = xlsx.utils.sheet_to_json(wbBackup.Sheets[SHEET_NAME], { header: 1 });
  
  const wbCurrent = xlsx.readFile(CONSOLIDADO_PATH);
  const dataCurrent = xlsx.utils.sheet_to_json(wbCurrent.Sheets[SHEET_NAME], { header: 1 });
  
  const headers = dataCurrent[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  let fixedCount = 0;
  let failCount = 0;

  for (let i = 1; i < dataCurrent.length; i++) {
    const row = dataCurrent[i];
    const backupRow = dataBackup[i];
    
    if (!backupRow) continue;

    const originalUrl = backupRow[urlIndex];
    const title = row[titleIndex] || `doc_${i}`;
    const currentVal = row[urlIndex];

    if (!originalUrl || !originalUrl.startsWith("http")) continue;

    let needsFix = false;
    if (!currentVal || currentVal.startsWith("http")) {
        needsFix = true;
    } else {
        const filePath = path.join(DOCUMENTS_DIR, currentVal);
        if (fs.existsSync(filePath)) {
            const buffer = Buffer.alloc(4);
            try {
                const fd = fs.openSync(filePath, 'r');
                fs.readSync(fd, buffer, 0, 4, 0);
                fs.closeSync(fd);
                if (buffer.toString() !== '%PDF') {
                    needsFix = true;
                }
            } catch (e) {
                needsFix = true;
            }
        } else {
            needsFix = true;
        }
    }

    if (needsFix) {
        console.log(`Processing row ${i+1}: ${title}`);
        const fileName = title.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
        const targetPath = path.join(DOCUMENTS_DIR, fileName);
        
        const result = await downloadFile(originalUrl, targetPath);
        if (result === true) {
            console.log(`  > Fixed! Saved as ${fileName}`);
            row[urlIndex] = fileName;
            fixedCount++;
        } else if (result === "HTML_ERROR") {
            console.error(`  > Row ${i+1} failed: Needs manual permission/login to download from Drive.`);
            failCount++;
        } else {
            failCount++;
        }
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(dataCurrent);
  wbCurrent.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wbCurrent, CONSOLIDADO_PATH);
  
  console.log(`\nResults: ${fixedCount} files fixed/downloaded, ${failCount} files still need attention.`);
}

run();
