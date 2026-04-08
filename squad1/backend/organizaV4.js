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

// Garantir que as pastas existam
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Normalização ultra-agressiva para ignorar QUALQUER extensão no meio do nome
function normalize(name) {
  if (!name) return "";
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf/g, "").replace(/\.txt/g, "") // Remove .pdf e .txt de qualquer lugar do nome
    .replace(/[^a-z0-9]/g, "");                 // Remove símbolos e espaços
}

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO V4 (LIMPEZA TOTAL) ---');

  try {
    await mongoose.connect(MONGODB_URI);
    const articles = await Article.find({});
    console.log(`🔍 Registros no Banco: ${articles.length}`);

    // 1. Mapear disco
    const diskFiles = new Map();
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          // Garante que entra em aprovados e reprovados para resgatar arquivos
          if (item === 'aprovados' || item === 'reprovados') scan(fullPath);
        } else {
          const norm = normalize(item);
          if (norm) {
            // Prioriza PDF na busca se houver conflito
            if (!diskFiles.has(norm) || item.toLowerCase().endsWith('.pdf')) {
              diskFiles.set(norm, fullPath);
            }
          }
        }
      });
    }
    scan(DOCUMENTS_DIR);
    console.log(`📂 Arquivos identificados no disco: ${diskFiles.size}`);

    let stats = { moved: 0, kept: 0, notFound: 0 };
    let missingList = [];

    for (const art of articles) {
      let dbValue = art["URL DO DOCUMENTO"] || "";
      if (!dbValue) continue;

      let dbOriginalName = path.basename(dbValue.trim());
      let normDB = normalize(dbOriginalName);
      let currentPath = diskFiles.get(normDB);

      let status = 'pendente';
      if (String(art["ARTIGOS REJEITADOS"]).toUpperCase() === 'TRUE') status = 'rejeitado';
      else if (String(art["APROVAÇÃO MANUAL"]).toUpperCase() === 'TRUE' ||
               String(art["APROVAÇÃO CURADOR (marcar)"]).toUpperCase() === 'TRUE') status = 'aprovado';

      const targetDir = status === 'aprovado' ? APROVADOS_DIR : (status === 'rejeitado' ? REPROVADOS_DIR : DOCUMENTS_DIR);

      if (!currentPath) {
        stats.notFound++;
        missingList.push(dbOriginalName);
        continue;
      }

      // Descobre se o que temos é um PDF ou TXT original
      const diskExt = currentPath.toLowerCase().endsWith('.pdf') ? '.pdf' : '.txt';
      // Limpa o nome do banco de qualquer .pdf ou .txt residual
      const cleanBaseName = dbOriginalName.replace(/\.pdf$/i, "").replace(/\.txt$/i, "");
      const finalName = cleanBaseName + diskExt;
      const targetPath = path.join(targetDir, finalName);

      if (currentPath === targetPath) {
        stats.kept++;
        continue;
      }

      try {
        fs.renameSync(currentPath, targetPath);
        console.log(`🚚 [${status.toUpperCase()}] Corrigido: ${finalName}`);
        stats.moved++;

        // Tenta achar e mover o par (.txt ou .pdf) que pode estar com nome sujo também
        const otherExt = diskExt === '.pdf' ? '.txt' : '.pdf';
        const otherSource = currentPath.replace(new RegExp(`\\${diskExt}$`, 'i'), otherExt);
        if (fs.existsSync(otherSource)) {
            const otherTarget = targetPath.replace(new RegExp(`\\${diskExt}$`, 'i'), otherExt);
            fs.renameSync(otherSource, otherTarget);
        }
      } catch (err) {
        console.error(`❌ Erro ao mover ${dbOriginalName}: ${err.message}`);
      }
    }

    fs.writeFileSync('NAO_ENCONTRADOS.txt', missingList.join('\n'));
    console.log(`\n--- RESULTADO FINAL ---`);
    console.log(`🚚 Corrigidos/Movidos: ${stats.moved}`);
    console.log(`✨ Já estavam corretos: ${stats.kept}`);
    console.log(`❓ Ainda não encontrados: ${stats.notFound}`);

  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

organize();
