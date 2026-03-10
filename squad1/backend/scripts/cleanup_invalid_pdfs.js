const fs = require("fs");
const path = require("path");

const DOCUMENTS_DIR = path.join(__dirname, "../documents");

function run() {
  const files = fs.readdirSync(DOCUMENTS_DIR);
  let invalidCount = 0;

  files.forEach(file => {
    if (!file.endsWith(".pdf")) return;
    
    const filePath = path.join(DOCUMENTS_DIR, file);
    if (fs.lstatSync(filePath).isDirectory()) return;

    const buffer = Buffer.alloc(4);
    try {
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        
        if (buffer.toString() !== '%PDF') {
            console.log(`Invalid PDF (HTML/Other): ${file}`);
            fs.unlinkSync(filePath);
            invalidCount++;
        }
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
  });

  console.log(`
Cleaned up ${invalidCount} invalid files.`);
  console.log("Please download these files manually and place them in the documents/ folder.");
}

run();
