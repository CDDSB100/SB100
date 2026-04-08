const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Article } = require('./src/models/Article');

const BASE_DIR = __dirname;
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Normalização ultra-robusta para ignorar acentos, símbolos e espaços
function normalize(name) {
  if (!name) return "";
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\.pdf$/i, "").replace(/\.txt$/i, "")     // Remove extensões
    .replace(/[^a-z0-9]/g, "");                       // Remove tudo que não é letra ou número
}

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO V (VERSÃO FINAL) ---');

  try {
    await mongoose.connect(MONGODB_URI);
    const articles = await Article.find({});
    console.log(`🔍 Registros no Banco: ${articles.length}`);

    // 1. Mapear TUDO que existe no disco (PDF e TXT)
    const diskFiles = new Map(); // normalizedName -> originalFullPath

    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          if (fullPath === APROVADOS_DIR || fullPath === REPROVADOS_DIR) scan(fullPath);
        } else {
          const norm = normalize(item);
          if (norm && (item.toLowerCase().endsWith('.pdf') || item.toLowerCase().endsWith('.txt'))) {
            // Prioriza PDF se houver duplicata de nome normalizado
            if (!diskFiles.has(norm) || item.toLowerCase().endsWith('.pdf')) {
              diskFiles.set(norm, fullPath);
            }
          }
        }
      }
    }

    scan(DOCUMENTS_DIR);
    console.log(`📂 Arquivos únicos encontrados no disco: ${diskFiles.size}`);

    let stats = { moved: 0, kept: 0, notFound: 0 };
    let missingExamples = [];

    for (const art of articles) {
      let dbValue = art["URL DO DOCUMENTO"] || "";
      if (!dbValue) continue;

      // Extrai apenas o nome do arquivo caso seja uma URL ou caminho completo
      let fileName = path.basename(dbValue.trim());
      let normDB = normalize(fileName);

      let status = 'pendente';
      if (String(art["ARTIGOS REJEITADOS"]).toUpperCase() === 'TRUE') status = 'rejeitado';
      else if (String(art["APROVAÇÃO MANUAL"]).toUpperCase() === 'TRUE' ||
               String(art["APROVAÇÃO CURADOR (marcar)"]).toUpperCase() === 'TRUE') status = 'aprovado';

      const targetDir = status === 'aprovado' ? APROVADOS_DIR : (status === 'rejeitado' ? REPROVADOS_DIR : DOCUMENTS_DIR);

      let currentPath = diskFiles.get(normDB);

      if (!currentPath) {
        stats.notFound++;
        if (missingExamples.length < 10) missingExamples.push(fileName);
        continue;
      }

      // Define o nome final mantendo a extensão correta do arquivo físico
      const extension = path.extname(currentPath);
      const finalName = fileName.toLowerCase().endsWith(extension.toLowerCase()) ? fileName : fileName + extension;
      const targetPath = path.join(targetDir, finalName);

      if (currentPath === targetPath) {
        stats.kept++;
        continue;
      }

      try {
        fs.renameSync(currentPath, targetPath);
        console.log(`🚚 [${status.toUpperCase()}] ${finalName}`);
        stats.moved++;

        // Tenta mover o par (.txt se moveu .pdf, ou vice-versa)
        const otherExt = extension.toLowerCase() === '.pdf' ? '.txt' : '.pdf';
        const otherSource = currentPath.replace(new RegExp(`${extension}$`, 'i'), otherExt);
        if (fs.existsSync(otherSource)) {
          const otherTarget = targetPath.replace(new RegExp(`${extension}$`, 'i'), otherExt);
          fs.renameSync(otherSource, otherTarget);
        }
      } catch (err) {
        console.error(`❌ Erro: ${err.message}`);
      }
    }

    console.log('\n--- RESUMO ---');
    console.log(`🚚 Movidos: ${stats.moved} | ✨ No lugar: ${stats.kept} | ❓ Não encontrados: ${stats.notFound}`);

    if (missingExamples.length > 0) {
      console.log('\nExemplos de nomes no banco que NÃO foram achados no disco:');
      missingExamples.forEach(ex => console.log(` - "${ex}"`));
    }

  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

organize();