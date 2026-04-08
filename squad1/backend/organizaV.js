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

/**
 * Função para normalizar nomes de arquivos para comparação flexível.
 * Remove acentos, espaços extras e converte para minúsculas.
 */
function normalizeName(name) {
  if (!name) return "";
  return name.trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "");     // Mantém apenas letras e números
}

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO V (MODO ROBUSTO) ---');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Conectado ao MongoDB.');
    }

    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} artigos no banco...`);

    // 1. Mapear arquivos no disco (usando nome exato e nome normalizado)
    const exactFiles = new Map();     // fileName -> fullPath
    const normalizedFiles = new Map(); // normalizedName -> fullPath

    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          // Escaneia subpastas conhecidas para encontrar arquivos que já foram movidos antes
          if (fullPath === APROVADOS_DIR || fullPath === REPROVADOS_DIR) {
            scan(fullPath);
          }
        } else if (item.toLowerCase().endsWith('.pdf')) {
          exactFiles.set(item, fullPath);
          normalizedFiles.set(normalizeName(item), fullPath);
        }
      }
    }

    scan(DOCUMENTS_DIR);
    console.log(`📂 Encontrados ${exactFiles.size} arquivos PDF no disco.`);

    let stats = { moved: 0, kept: 0, notFound: 0 };

    // 2. Processar cada artigo do banco
    for (const art of articles) {
      const dbFileName = art["URL DO DOCUMENTO"] ? art["URL DO DOCUMENTO"].trim() : null;
      if (!dbFileName) continue;

      // Determinar o status
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

      const targetPath = path.join(targetDir, dbFileName);

      // Tenta encontrar o arquivo: 1º Nome Exato, 2º Nome Normalizado
      let currentPath = exactFiles.get(dbFileName) || normalizedFiles.get(normalizeName(dbFileName));

      if (!currentPath) {
        stats.notFound++;
        continue;
      }

      // Se já estiver no lugar certo (mesmo nome e mesma pasta), ignora
      if (currentPath === targetPath) {
        stats.kept++;
        continue;
      }

      // Mover o arquivo
      try {
        // Se o nome no disco for diferente do nome no banco (acentos/espaços), 
        // renomeamos para o nome que está no banco durante o movimento.
        fs.renameSync(currentPath, targetPath);
        console.log(`🚚 [${status.toUpperCase()}] ${dbFileName}`);
        stats.moved++;

        // Sincronizar arquivo .txt correspondente se existir
        const txtSource = currentPath.replace(/\.pdf$/i, '.txt');
        const txtTarget = targetPath.replace(/\.pdf$/i, '.txt');
        if (fs.existsSync(txtSource)) {
          fs.renameSync(txtSource, txtTarget);
        }
      } catch (err) {
        console.error(`❌ Erro ao mover ${dbFileName}:`, err.message);
      }
    }

    console.log('\n--- RESUMO FINAL ---');
    console.log(`🚚 Movidos/Renomeados: ${stats.moved}`);
    console.log(`✨ Já estavam no lugar correto: ${stats.kept}`);
    console.log(`❓ Não localizados no disco: ${stats.notFound}`);

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
