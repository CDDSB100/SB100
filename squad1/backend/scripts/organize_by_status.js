const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Article } = require('../src/models/Article');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

// Garantir que as pastas existam
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function findFileInFolders(fileName) {
  if (!fileName) return null;
  const cleanName = path.basename(fileName);

  const directPaths = [
    path.join(DOCUMENTS_DIR, cleanName),
    path.join(APROVADOS_DIR, cleanName),
    path.join(REPROVADOS_DIR, cleanName)
  ];

  for (const p of directPaths) {
    if (fs.existsSync(p)) return p;
  }

  // Case-insensitive fallback
  const searchInDir = (dir) => {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const found = files.find(f => f.toLowerCase() === cleanName.toLowerCase());
    return found ? path.join(dir, found) : null;
  };

  return searchInDir(DOCUMENTS_DIR) || searchInDir(APROVADOS_DIR) || searchInDir(REPROVADOS_DIR);
}

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO DE DOCUMENTOS POR STATUS (SQLite) ---');

  try {
    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} registros no banco de dados SQLite...`);

    let stats = { moved: 0, kept: 0, notFound: 0, errors: 0 };
    const missingArticles = [];

    for (const art of articles) {
      const fileName = art.documentUrl;
      if (!fileName || fileName.startsWith('http')) continue;

      const cleanName = path.basename(fileName);
      const pdfPath = findFileInFolders(cleanName);
      
      const txtName = cleanName.replace(/\.[^/.]+$/, "") + ".txt";
      const txtPath = findFileInFolders(txtName);

      if (!pdfPath && !txtPath) {
        stats.notFound++;
        missingArticles.push(cleanName);
        continue;
      }

      // Determinar pasta de destino
      let targetDir = DOCUMENTS_DIR;
      let label = 'PENDENTE';

      if (art.status === 'Aprovado Manualmente' || art.status === 'Aprovado por IA') {
        targetDir = APROVADOS_DIR;
        label = art.status === 'Aprovado Manualmente' ? 'APROVADO (MANUAL)' : 'APROVADO (IA)';
      } else if (art.status === 'Rejeitado') {
        targetDir = REPROVADOS_DIR;
        label = 'REJEITADO';
      }

      const moveFile = (source, targetName) => {
        if (!source) return false;
        const target = path.join(targetDir, targetName);
        if (source === target) return false;

        if (fs.existsSync(target)) {
          fs.unlinkSync(source);
          console.log(`🗑️ [DUPLICATA] Removido: ${targetName} de ${path.relative(BASE_DIR, path.dirname(source))}`);
        } else {
          fs.renameSync(source, target);
          console.log(`🚚 [${label}] Movido: ${targetName} para ${path.relative(DOCUMENTS_DIR, targetDir) || 'raiz'}`);
        }
        return true;
      };

      try {
        const pdfMoved = moveFile(pdfPath, cleanName);
        const txtMoved = moveFile(txtPath, txtName);

        if (pdfMoved || txtMoved) {
          stats.moved++;
        } else {
          stats.kept++;
        }
      } catch (err) {
        console.error(`❌ Erro ao processar ${cleanName}:`, err.message);
        stats.errors++;
      }
    }

    console.log('\n--- RESUMO FINAL ---');
    console.log(`🚚 Movidos/Sincronizados: ${stats.moved}`);
    console.log(`✨ Já estavam no lugar: ${stats.kept}`);
    console.log(`❓ Não encontrados (PDF nem TXT): ${stats.notFound}`);
    console.log(`❌ Erros: ${stats.errors}`);

    if (missingArticles.length > 0) {
      console.log('\n🔍 Documentos totalmente não encontrados (primeiros 20):');
      missingArticles.slice(0, 20).forEach(m => console.log(` - ${m}`));
      if (missingArticles.length > 20) {
        console.log(` ... e mais ${missingArticles.length - 20} documentos.`);
      }
    }

  } catch (err) {
    console.error('❌ Erro crítico:', err);
  } finally {
    process.exit(0);
  }
}

organize();
