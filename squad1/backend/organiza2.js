const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Article } = require('./src/models/Article');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = __dirname;
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

// Garantir que as pastas existam
[DOCUMENTS_DIR, APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO DE DOCUMENTOS VIA MONGODB ---');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado ao MongoDB.');
    }

    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} artigos no banco...`);

    // 1. Mapear onde cada arquivo PDF está atualmente no disco
    const fileLocations = new Map(); // fileName -> currentPath
    
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // Evita recursão infinita, escaneia apenas as subpastas conhecidas que podem conter PDFs
          if (fullPath === APROVADOS_DIR || fullPath === REPROVADOS_DIR) {
            scan(fullPath);
          }
        } else if (item.toLowerCase().endsWith('.pdf')) {
          fileLocations.set(item, fullPath);
        }
      }
    }
    
    // Escaneia a raiz e as subpastas
    scan(DOCUMENTS_DIR);
    console.log(`📂 Encontrados ${fileLocations.size} arquivos PDF no disco.`);

    let stats = { moved: 0, kept: 0, notFound: 0 };

    // 2. Processar cada artigo do banco
    for (const art of articles) {
      const fileName = art["URL DO DOCUMENTO"];
      if (!fileName) continue;

      // Determinar o status baseado nas colunas do banco
      let status = 'pendente'; 
      
      const isRejected = String(art["ARTIGOS REJEITADOS"] || '').toUpperCase() === 'TRUE';
      const isApproved = String(art["APROVAÇÃO MANUAL"] || '').toUpperCase() === 'TRUE' || 
                         String(art["APROVAÇÃO CURADOR (marcar)"] || '').toUpperCase() === 'TRUE';

      if (isRejected) status = 'rejeitado';
      else if (isApproved) status = 'aprovado';

      // Definir pasta de destino
      let targetDir = DOCUMENTS_DIR;
      if (status === 'aprovado') targetDir = APROVADOS_DIR;
      else if (status === 'rejeitado') targetDir = REPROVADOS_DIR;

      const targetPath = path.join(targetDir, fileName);
      const currentPath = fileLocations.get(fileName);

      if (!currentPath) {
        stats.notFound++;
        continue;
      }

      if (currentPath === targetPath) {
        stats.kept++;
        continue;
      }

      // Mover o arquivo
      try {
        fs.renameSync(currentPath, targetPath);
        console.log(`🚚 [${status.toUpperCase()}] Movido: ${fileName}`);
        stats.moved++;
        
        // Sincronizar TXT se existir
        const txtSource = currentPath.replace(/\.pdf$/i, '.txt');
        const txtTarget = targetPath.replace(/\.pdf$/i, '.txt');
        if (fs.existsSync(txtSource)) {
          fs.renameSync(txtSource, txtTarget);
        }
      } catch (err) {
        console.error(`❌ Erro ao mover ${fileName}:`, err.message);
      }
    }

    console.log('\n--- RESUMO ---');
    console.log(`🚚 Movidos: ${stats.moved}`);
    console.log(`✨ Já estavam no lugar: ${stats.kept}`);
    console.log(`❓ Não encontrados no disco: ${stats.notFound}`);

  } catch (err) {
    console.error('❌ Erro crítico:', err);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(0);
  }
}

organize();

