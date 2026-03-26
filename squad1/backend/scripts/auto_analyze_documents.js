const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Article } = require("../src/models/Article");

const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

function cleanString(str) {
  if (!str) return "";
  return str.toString().toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ");
}

async function getPdfTextProxy(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    // Take first 500 chars of text as proxy for matching
    return cleanString(data.text.substring(0, 500));
  } catch (e) {
    return "";
  }
}

async function run() {
  console.log("Analyzing PDF contents to correlate with MongoDB records...");
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB.");

    const articles = await Article.find({ 
      $or: [
        { "URL DO DOCUMENTO": { $exists: false } },
        { "URL DO DOCUMENTO": "" },
        { "URL DO DOCUMENTO": null }
      ]
    });
    
    console.log(`🔍 Encontrados ${articles.length} registros no MongoDB sem URL do documento.`);

    if (articles.length === 0) {
      console.log("Nenhum registro pendente de vinculação.");
      process.exit(0);
    }

    const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
    console.log(`📂 Encontrados ${localFiles.length} arquivos no disco para analisar.`);

    const fileData = [];
    for (const file of localFiles) {
      const filePath = path.join(DOCUMENTS_DIR, file);
      const textProxy = await getPdfTextProxy(filePath);
      fileData.push({ file, textProxy });
      process.stdout.write(".");
    }
    console.log("\n✅ Análise de arquivos completa. Iniciando pareamento...");

    let matchedCount = 0;
    for (const article of articles) {
      const articleTitle = cleanString(article["Título"] || article["Titulo"]);
      if (!articleTitle) continue;

      // Matching logic: check if important words from Title are found in the PDF text
      const words = articleTitle.split(" ").filter(w => w.length > 4);
      if (words.length === 0) continue;

      let bestMatch = null;
      let maxScore = 0;

      for (const f of fileData) {
        if (!f.textProxy) continue;
        const matchCount = words.filter(w => f.textProxy.includes(w)).length;
        const score = matchCount / words.length;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = f.file;
        }
      }

      if (bestMatch && maxScore > 0.6) {
        article["URL DO DOCUMENTO"] = bestMatch;
        await article.save();
        matchedCount++;
        console.log(`✅ Artigo matched: "${article["Título"] || article["Titulo"]}" -> ${bestMatch} (Score: ${maxScore.toFixed(2)})`);
      }
    }

    console.log(`\n🎉 Processo concluído! ${matchedCount} documentos vinculados.`);
  } catch (error) {
    console.error("❌ Erro durante o processamento:", error);
  } finally {
    await mongoose.connection.close();
  }
}

run();
