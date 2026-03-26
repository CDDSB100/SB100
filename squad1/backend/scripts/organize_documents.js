const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Article } = require('../src/models/Article');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

// Garantir que as pastas existam
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO E LIMPEZA DE DOCUMENTOS (MODO MONGODB) ---');
  
  const statusMap = new Map(); // fileName -> { rank, label }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado ao MongoDB.');
    } else {
      console.log('✅ Já conectado ao MongoDB (via Model).');
    }
    
    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} registros no MongoDB...`);
    
    articles.forEach(art => {
      const fileName = art["URL DO DOCUMENTO"];
      if (!fileName) return;
      
      const manual = String(art["APROVAÇÃO MANUAL"] || '').toUpperCase() === 'TRUE';
      const curador = String(art["APROVAÇÃO CURADOR (marcar)"] || '').toUpperCase() === 'TRUE';
      const rejected = String(art["ARTIGOS REJEITADOS"] || '').toUpperCase() === 'TRUE';
      
      let rank = manual ? 3 : (rejected ? 2 : (curador ? 1 : 0));
      
      const current = statusMap.get(fileName);
      if (!current || rank > current.rank) {
        statusMap.set(fileName, { 
          rank, 
          label: rank === 3 ? 'APROVADO' : (rank === 2 ? 'REPROVADO' : (rank === 1 ? 'IA' : 'PENDENTE')) 
        });
      }
    });
  } catch (err) {
    console.error('❌ Erro crítico ao conectar ao MongoDB:', err.message);
    process.exit(1);
  }

  // 2. ESCANEAMENTO DO DISCO
  console.log('📂 Escaneando arquivos no disco...');
  const allFiles = new Map(); // fileName -> [caminhos onde foi encontrado]

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        // Não reentrar nas pastas de destino para evitar loops se forem subpastas, 
        // mas aqui elas são subpastas de DOCUMENTS_DIR.
        if (item !== 'aprovados' && item !== 'reprovados') scanDir(fullPath);
      } else if (item.toLowerCase().endsWith('.pdf')) {
        const list = allFiles.get(item) || [];
        list.push(fullPath);
        allFiles.set(item, list);
      } else if (item.toLowerCase().endsWith('.txt') && dir === DOCUMENTS_DIR) {
        // Limpar TXT órfão na raiz se desejar
        try { fs.unlinkSync(fullPath); } catch(e) {}
      }
    });
  }

  scanDir(DOCUMENTS_DIR);
  scanDir(APROVADOS_DIR);
  scanDir(REPROVADOS_DIR);

  console.log(`📊 Encontrados ${allFiles.size} arquivos PDF únicos.`);

  let stats = { moved: 0, deleted: 0, kept: 0 };

  for (const [fileName, locations] of allFiles.entries()) {
    const status = statusMap.get(fileName) || { rank: 0, label: 'PENDENTE' };
    let targetDir = DOCUMENTS_DIR;
    
    // Regra: Aprovado Manual (3) ou Aprovado IA (1) -> Aprovados
    // Rejeitado (2) -> Reprovados
    if (status.rank === 3 || status.rank === 1) targetDir = APROVADOS_DIR;
    else if (status.rank === 2) targetDir = REPROVADOS_DIR;

    const targetPath = path.join(targetDir, fileName);
    let mainFileProcessed = false;

    // Ordenar caminhos para priorizar o que já está no lugar certo
    locations.sort((a, b) => (a === targetPath ? -1 : 1));

    for (const loc of locations) {
      if (loc === targetPath && !mainFileProcessed) {
        mainFileProcessed = true;
        stats.kept++;
        continue;
      }

      if (mainFileProcessed) {
        // Já temos uma cópia no lugar certo, deletar esta duplicata
        try {
          fs.unlinkSync(loc);
          console.log(`🗑️  Duplicata removida: ${path.relative(BASE_DIR, loc)}`);
          stats.deleted++;
        } catch (e) { console.error(`Erro ao deletar: ${e.message}`); }
      } else {
        // Mover para o lugar certo
        try {
          fs.renameSync(loc, targetPath);
          console.log(`🚚 Movido para ${status.label}: ${fileName}`);
          mainFileProcessed = true;
          stats.moved++;
        } catch (e) { console.error(`Erro ao mover: ${e.message}`); }
      }

      // Sincronizar TXT se existir
      const txtSource = loc.replace(/\.pdf$/i, '.txt');
      const txtTarget = targetPath.replace(/\.pdf$/i, '.txt');
      if (fs.existsSync(txtSource)) {
        try {
          if (txtSource !== txtTarget) {
            if (fs.existsSync(txtTarget)) fs.unlinkSync(txtSource);
            else fs.renameSync(txtSource, txtTarget);
          }
        } catch (e) {}
      }
    }
  }

  console.log('\n--- RESUMO FINAL ---');
  console.log(`🚚 Movidos para pasta correta: ${stats.moved}`);
  console.log(`🗑️  Duplicatas deletadas: ${stats.deleted}`);
  console.log(`✨ Já estavam no lugar: ${stats.kept}`);
  
  await mongoose.connection.close();
  process.exit(0);
}

organize();
