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

function normalize(name) {
  if (!name) return "";
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "").replace(/\.txt$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

async function organize() {
  console.log('--- ORGANIZAÇÃO FINAL (CORREÇÃO DE EXTENSÕES) ---');

  try {
    await mongoose.connect(MONGODB_URI);
    const articles = await Article.find({});

    // 1. Mapear disco
    const diskFiles = new Map();
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          if (fullPath === APROVADOS_DIR || fullPath === REPROVADOS_DIR) scan(fullPath);
        } else {
          const norm = normalize(item);
          if (norm) {
            if (!diskFiles.has(norm) || item.toLowerCase().endsWith('.pdf')) {
              diskFiles.set(norm, fullPath);
            }
          }
        }
      });
    }
    scan(DOCUMENTS_DIR);

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

      // Lógica de nome limpo (sem duplicar extensão)
      const diskExt = path.extname(currentPath); // .pdf ou .txt
      const nameWithoutExt = dbOriginalName.replace(/\.pdf$/i, "").replace(/\.txt$/i, "");
      const finalName = nameWithoutExt + diskExt;
      const targetPath = path.join(targetDir, finalName);

      if (currentPath === targetPath) {
        stats.kept++;
        continue;
      }

      try {
        fs.renameSync(currentPath, targetPath);
        console.log(`🚚 [${status.toUpperCase()}] ${finalName}`);
        stats.moved++;

        // Mover o par (se moveu pdf, tenta mover txt e vice-versa)
        const otherExt = diskExt.toLowerCase() === '.pdf' ? '.txt' : '.pdf';
        const otherSource = currentPath.replace(new RegExp(`${diskExt}$`, 'i'), otherExt);
        if (fs.existsSync(otherSource)) {
          const otherTarget = targetPath.replace(new RegExp(`${diskExt}$`, 'i'), otherExt);
          fs.renameSync(otherSource, otherTarget);
        }
      } catch (err) { 
        console.error(`❌ Erro: ${err.message}`); 
      }
    }

    fs.writeFileSync('NAO_ENCONTRADOS.txt', missingList.join('\n'));
    console.log(`\n--- CONCLUÍDO ---`);
    console.log(`🚚 Movidos: ${stats.moved} | ✨ No lugar: ${stats.kept} | ❓ Faltando: ${stats.notFound}`);
    console.log(`📄 Lista de faltantes salva em: NAO_ENCONTRADOS.txt`);

  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

organize();
