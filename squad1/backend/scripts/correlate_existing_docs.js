const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Article } = require('../src/models/Article');
const { pool } = require('../src/services/database');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');

function normalize(str) {
  if (!str) return "";
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function correlate() {
  console.log('--- INICIANDO CORRELAÇÃO DE DOCUMENTOS ---');

  try {
    // 1. Mapear arquivos no disco recursivamente
    const filesMap = new Map(); // normalizedName -> fullPath
    const allFiles = [];

    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          scan(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (ext === '.pdf' || ext === '.txt') {
            const norm = normalize(path.basename(item, ext));
            if (!filesMap.has(norm) || ext === '.pdf') {
                filesMap.set(norm, fullPath);
            }
            allFiles.push({ name: item, path: fullPath, norm, ext });
          }
        }
      }
    }

    scan(DOCUMENTS_DIR);
    console.log(`📂 Encontrados ${allFiles.length} arquivos (PDF/TXT) no disco.`);

    // Criar mapas separados por extensão para facilitar priorização
    const pdfMap = new Map();
    const txtMap = new Map();
    allFiles.forEach(f => {
      if (f.ext === '.pdf') pdfMap.set(f.norm, f.path);
      else if (f.ext === '.txt') txtMap.set(f.norm, f.path);
    });

    // 2. Buscar artigos no banco
    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} registros no banco.`);

    let stats = { pdfMatched: 0, txtMatched: 0, notFound: 0, updated: 0 };

    for (const art of articles) {
      let foundPath = null;
      let matchMethod = "";

      const currentUrl = art.documentUrl || "";
      const baseName = path.basename(currentUrl, path.extname(currentUrl));
      const normBase = normalize(baseName);
      const titleNorm = normalize(art.title);

      // --- ESTRATÉGIA DE PRIORIDADE ---
      
      // 1. Tentar achar o PDF (Prioridade Máxima)
      // 1.1 PDF por nome exato (se a URL já for .pdf)
      if (currentUrl.toLowerCase().endsWith('.pdf')) {
        const exactPdf = allFiles.find(f => f.name === currentUrl && f.ext === '.pdf');
        if (exactPdf) {
            foundPath = exactPdf.path;
            matchMethod = "PDF EXATO";
        }
      }

      // 1.2 PDF por nome normalizado (mesmo que a URL seja .txt ou .pdf errado)
      if (!foundPath && pdfMap.has(normBase)) {
        foundPath = pdfMap.get(normBase);
        matchMethod = "PDF NORMALIZADO (URL)";
      }

      // 1.3 PDF por título normalizado
      if (!foundPath && titleNorm && titleNorm.length > 10 && pdfMap.has(titleNorm)) {
        foundPath = pdfMap.get(titleNorm);
        matchMethod = "PDF NORMALIZADO (TITULO)";
      }

      // 2. Tentar achar o TXT (Apenas se não achou o PDF)
      if (!foundPath) {
        // 2.1 TXT por nome exato
        const exactTxt = allFiles.find(f => f.name === currentUrl && f.ext === '.txt');
        if (exactTxt) {
            foundPath = exactTxt.path;
            matchMethod = "TXT EXATO";
        } else if (txtMap.has(normBase)) {
            foundPath = txtMap.get(normBase);
            matchMethod = "TXT NORMALIZADO (URL)";
        } else if (titleNorm && titleNorm.length > 10 && txtMap.has(titleNorm)) {
            foundPath = txtMap.get(titleNorm);
            matchMethod = "TXT NORMALIZADO (TITULO)";
        }
      }

      if (foundPath) {
        const newFileName = path.basename(foundPath);
        const isPdf = newFileName.toLowerCase().endsWith('.pdf');

        if (newFileName !== currentUrl) {
          await pool.execute("UPDATE articles SET documentUrl = ? WHERE _id = ?", [newFileName, art._id]);
          console.log(`✅ [${matchMethod}] Atualizado: ID ${art._id} -> ${newFileName} (era: ${currentUrl})`);
          stats.updated++;
        }
        
        if (isPdf) stats.pdfMatched++;
        else stats.txtMatched++;
      } else {
        stats.notFound++;
      }
    }

    console.log('\n--- RESUMO DA CORREÇÃO ---');
    console.log(`📄 PDFs Correlacionados: ${stats.pdfMatched}`);
    console.log(`📝 TXTs Correlacionados (sem PDF): ${stats.txtMatched}`);
    console.log(`📝 Registros atualizados no banco: ${stats.updated}`);
    console.log(`❓ Não correlacionados: ${stats.notFound}`);

  } catch (err) {
    console.error('❌ Erro crítico:', err);
  } finally {
    process.exit(0);
  }
}

correlate();
