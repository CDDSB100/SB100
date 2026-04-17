const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Article } = require('../src/models/Article');
const { 
  processSinglePdfForInsert, 
  manualInsert, 
  listPdfsRecursive 
} = require('../src/services/api_logic');

const BASE_DIR = path.join(__dirname, '..');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');

async function importUnlinked() {
  console.log('--- INICIANDO IMPORTAÇÃO DE PDFs NÃO CADASTRADOS ---');

  try {
    const allPdfs = await listPdfsRecursive(DOCUMENTS_DIR);
    console.log(`📂 Encontrados ${allPdfs.length} PDFs no sistema de arquivos.`);

    const registeredArticles = await Article.find({});
    const registeredFiles = new Set(registeredArticles.map(a => a.documentUrl));
    console.log(`🔍 ${registeredFiles.size} arquivos já estão registrados no banco.`);

    const unlinkedPdfs = allPdfs.filter(file => !registeredFiles.has(file.name));
    
    if (unlinkedPdfs.length === 0) {
      console.log('✨ Todos os PDFs já estão cadastrados! Nada a fazer.');
      return;
    }

    console.log(`🚀 Iniciando processamento de ${unlinkedPdfs.length} novos documentos...\n`);

    let stats = { success: 0, skipped: 0, error: 0 };

    for (let i = 0; i < unlinkedPdfs.length; i++) {
      const file = unlinkedPdfs[i];
      console.log(`[${i + 1}/${unlinkedPdfs.length}] Processando: ${file.name}...`);

      let retryCount = 0;
      const maxRetries = 2;
      let processed = false;

      while (retryCount <= maxRetries && !processed) {
        try {
          if (retryCount > 0) console.log(`   🔄 Tentativa ${retryCount + 1}...`);
          
          const pdfBuffer = await fs.readFile(file.localPath);
          const articleData = await processSinglePdfForInsert(pdfBuffer, file.name, "Importador Automático");
          const result = await manualInsert(articleData, "Importador Automático");
          
          if (result.status === 'success') {
            console.log(`   ✅ ${result.updated ? 'Vínculo atualizado' : 'Cadastrado'}: ${articleData.title}`);
            stats.success++;
          } else if (result.status === 'skipped') {
            console.log(`   ⏭️ Pulado (já existe registro completo)`);
            stats.skipped++;
          }
          processed = true;
        } catch (err) {
          retryCount++;
          if (retryCount > maxRetries) {
            console.error(`   ❌ Erro persistente:`, err.message);
            stats.error++;
          } else {
            // Espera um pouco antes de tentar de novo
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      // Pequeno delay entre arquivos para não sufocar a API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n--- RESUMO DA IMPORTAÇÃO ---');
    console.log(`✅ Novos cadastros: ${stats.success}`);
    console.log(`⏭️ Puldados (já existentes): ${stats.skipped}`);
    console.log(`❌ Erros no processamento: ${stats.error}`);
    console.log(`✨ Total analisado: ${unlinkedPdfs.length}`);

  } catch (err) {
    console.error('❌ Erro crítico no script:', err);
  } finally {
    process.exit(0);
  }
}

importUnlinked();
