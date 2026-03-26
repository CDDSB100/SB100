const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Article } = require("../src/models/Article");
const {
  ALL_METADATA_FIELDS,
} = require("../src/controllers/metadata_controller.js");

const DOCUMENTS_DIR = path.join(__dirname, "../documents");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';
const API_BASE_URL = "https://curadoria-llm-curadoria.hf.space";

async function callCustomCuradorApi(pdfBuffer, headers) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers,
    category: null,
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/curadoria`, payload, {
      timeout: 300000, // Aumentado para 5 min
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (error) {
    console.error("API Error:", error.message);
    return null;
  }
}

async function callCategorizationApi(pdfBuffer) {
  const payload = {
    encoded_content: pdfBuffer.toString("base64"),
    content_type: "pdf",
    headers: [],
  };
  try {
    const res = await axios.post(`${API_BASE_URL}/categorize`, payload, {
      timeout: 120000,
      headers: { "Content-Type": "application/json" },
    });
    return res.data.category;
  } catch (error) {
    return "N/A";
  }
}

async function run() {
  console.log("--- INICIANDO IMPORTAÇÃO DE DOCUMENTOS NÃO VINCULADOS (MODO MONGODB) ---");
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Conectado ao MongoDB.");

    // Buscar todos os arquivos já vinculados no banco
    const linkedArticles = await Article.find({ 
      "URL DO DOCUMENTO": { $exists: true, $ne: "", $ne: null } 
    }).select("URL DO DOCUMENTO DOI");
    
    const linkedFiles = linkedArticles.map(a => a["URL DO DOCUMENTO"]);
    const localFiles = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.toLowerCase().endsWith(".pdf"));
    
    const unlinkedFiles = localFiles.filter(f => !linkedFiles.includes(f));
    console.log(`🔍 Encontrados ${unlinkedFiles.length} arquivos no disco não vinculados no MongoDB.`);

    if (unlinkedFiles.length === 0) {
      console.log("Nenhum arquivo novo para importar.");
      process.exit(0);
    }

    for (const file of unlinkedFiles) {
      console.log(`\n📄 Processando: ${file}`);
      const filePath = path.join(DOCUMENTS_DIR, file);
      const pdfBuffer = fs.readFileSync(filePath);

      console.log("  > Extraindo metadados e categorizando via IA...");
      const category = await callCategorizationApi(pdfBuffer);
      const extractedData = await callCustomCuradorApi(pdfBuffer, ALL_METADATA_FIELDS);

      if (!extractedData) {
          console.error(`  > ❌ Falha ao extrair dados para ${file}`);
          continue;
      }

      // Verificar duplicidade por DOI no MongoDB
      const doi = extractedData["DOI"];
      if (doi && doi !== "N/A" && doi !== "") {
          const duplicate = await Article.findOne({ DOI: doi });
          if (duplicate) {
              console.log(`  > ⚠️ Pulando ${file}: DOI ${doi} já existe no MongoDB.`);
              continue;
          }
      }

      // Preparar objeto do artigo
      const articleData = {
        ...extractedData,
        "URL DO DOCUMENTO": file,
        "CATEGORIA": category,
        "APROVAÇÃO CURADOR (marcar)": "FALSE",
        "ARTIGOS REJEITADOS": "FALSE",
        "INSERIDO POR": "Sistema (Auto-Import)",
        "work_id": `auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      };

      const newArticle = new Article(articleData);
      await newArticle.save();
      
      console.log(`  > ✅ Importado com sucesso: ${extractedData["Título"] || extractedData["Titulo"] || file}`);
    }

    console.log("\n🎉 Processo de importação concluído!");
  } catch (error) {
    console.error("❌ Erro durante o processamento:", error);
  } finally {
    await mongoose.connection.close();
  }
}

run();
