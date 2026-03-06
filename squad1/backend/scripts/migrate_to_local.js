const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONSOLIDADO_PATH = path.join(__dirname, "../Consolidado - Respostas Gerais.xlsx");
const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const SHEET_NAME = "Tabela completa";

if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

async function downloadFile(url, targetPath) {
  try {
    let downloadUrl = url;
    // Transform Google Drive URL to direct download URL if possible
    if (url.includes("drive.google.com/file/d/")) {
      const fileId = url.match(/\/d\/([-\w]{25,})/);
      if (fileId && fileId[1]) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId[1]}`;
      }
    }

    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'arraybuffer', // Use arraybuffer to check content type easily
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      // If it's HTML, it's likely a Google Drive permission page or error
      const htmlContent = response.data.toString();
      if (htmlContent.includes('uc-download-link')) {
        // Try to handle "Download anyway" page for large files
        const confirmMatch = htmlContent.match(/href="([^"]+confirm=[^"]+)"/);
        if (confirmMatch) {
          const confirmUrl = confirmMatch[1].replace(/&amp;/g, '&');
          return downloadFile(`https://drive.google.com${confirmUrl}`, targetPath);
        }
      }
      console.error(`  > Error: Received HTML instead of PDF for ${url}. Likely permission issue.`);
      return false;
    }

    await fs.promises.writeFile(targetPath, response.data);
    return true;
  } catch (error) {
    console.error(`  > Error downloading ${url}: ${error.message}`);
    return false;
  }
}

async function migrate() {
  console.log("Starting migration...");
  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  const urlIndex = headers.indexOf("URL DO DOCUMENTO");
  const titleIndex = headers.indexOf("Título") !== -1 ? headers.indexOf("Título") : headers.indexOf("Titulo");

  if (urlIndex === -1) {
    console.error("Column 'URL DO DOCUMENTO' not found.");
    return;
  }

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const url = row[urlIndex];
    const title = row[titleIndex] || `document_${i}`;

    if (url && (url.startsWith("http") || !fs.existsSync(path.join(DOCUMENTS_DIR, url)))) {
      const currentUrl = url.startsWith("http") ? url : null; // If it's already a filename, we might not have the URL anymore unless we search for it
      
      // If we don't have a URL and the file doesn't exist, we can't do much
      if (!currentUrl) {
        // Try to see if there's a backup of the original URL in some column? 
        // For now, let's just skip if it's already updated to a filename but file is missing or invalid
        const filePath = path.join(DOCUMENTS_DIR, url);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const buffer = Buffer.alloc(100);
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, buffer, 0, 100, 0);
          fs.closeSync(fd);
          const content = buffer.toString();
          if (!content.startsWith('%PDF')) {
            console.log(`Row ${i + 1}: Existing file ${url} is not a PDF. Will try to fix if URL is available.`);
            // In this specific case, the user said they still have Drive URLs in some places or want to fix them
          } else {
            continue; // Valid PDF exists
          }
        }
      }

      if (currentUrl) {
        console.log(`Processing row ${i + 1}: ${title}`);
        let fileName = title.substring(0, 50).replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".pdf";
        const targetPath = path.join(DOCUMENTS_DIR, fileName);

        const success = await downloadFile(currentUrl, targetPath);
        if (success) {
          console.log(`  > Downloaded to ${fileName}`);
          row[urlIndex] = fileName;
        }
      }
    }
  }

  const newWs = xlsx.utils.aoa_to_sheet(allData);
  wb.Sheets[SHEET_NAME] = newWs;
  xlsx.writeFile(wb, CONSOLIDADO_PATH);
  console.log("Migration finished! Excel file updated.");
}

migrate();
