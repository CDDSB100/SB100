const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..');
const CONSOLIDADO_PATH = path.join(BASE_DIR, 'Consolidado - Respostas Gerais.xlsx');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

const SHEET_NAME = 'Tabela completa';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://172.28.181.92:27017/cientometria';

// Definir o Schema do Artigo
const articleSchema = new mongoose.Schema({
  "URL DO DOCUMENTO": String,
  "APROVAÇÃO MANUAL": String,
  "ARTIGOS REJEITADOS": String,
  "APROVAÇÃO CURADOR (marcar)": String,
}, { strict: false });

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

// Garantir que as pastas existam
[APROVADOS_DIR, REPROVADOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function findFileAnywhere(fileName) {
  if (!fileName) return null;
  const locations = [
    path.join(DOCUMENTS_DIR, fileName),
    path.join(APROVADOS_DIR, fileName),
    path.join(REPROVADOS_DIR, fileName)
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) return loc;
  }
  return null;
}

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO E LIMPEZA DE DOCUMENTOS ---');
  
  // 1. LIMPEZA DE .TXT NO PENDENTES
  console.log('🧹 Limpando arquivos .txt da pasta de pendentes...');
  const filesInRoot = fs.readdirSync(DOCUMENTS_DIR);
  let txtDeleted = 0;
  filesInRoot.forEach(file => {
    if (file.toLowerCase().endsWith('.txt')) {
      try {
        fs.unlinkSync(path.join(DOCUMENTS_DIR, file));
        txtDeleted++;
      } catch (e) {
        console.error(`Erro ao deletar ${file}: ${e.message}`);
      }
    }
  });
  if (txtDeleted > 0) console.log(`✨ Removidos ${txtDeleted} arquivos .txt prematuros.`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB.');
  } catch (err) {
    console.error('⚠️ Erro ao conectar ao MongoDB.', err.message);
  }

  // 2. CONSOLIDAÇÃO E DEDUPLICAÇÃO DE STATUS
  // Prioridade: 3 (Manual), 2 (Rejeitado), 1 (IA), 0 (Pendente)
  const statusMap = new Map();

  function updateStatusMap(fileName, manual, curador, rejected, sourceId = null) {
    if (!fileName || fileName.toString().startsWith('http')) return;
    
    let rank = 0;
    if (manual) rank = 3;
    else if (rejected) rank = 2;
    else if (curador) rank = 1;

    const current = statusMap.get(fileName);
    if (!current || rank > current.rank) {
      statusMap.set(fileName, { manual, curador, rejected, rank, sourceId });
    } else if (rank === current.rank && sourceId && current.sourceId && sourceId !== current.sourceId) {
      // Se tiver rank igual e for de IDs diferentes, marcar para remoção depois
      // (Isso será usado na limpeza do MongoDB)
    }
  }

  // Ler MongoDB
  if (mongoose.connection.readyState === 1) {
    const articles = await Article.find({});
    console.log(`🔍 Analisando ${articles.length} registros no MongoDB...`);
    
    // Agrupar para detectar duplicatas reais no banco
    const duplicatesToRemove = [];
    const seenFiles = new Map();

    articles.forEach(art => {
      const fileName = art["URL DO DOCUMENTO"];
      if (!fileName) return;

      const manual = String(art["APROVAÇÃO MANUAL"] || '').toUpperCase() === 'TRUE';
      const curador = String(art["APROVAÇÃO CURADOR (marcar)"] || '').toUpperCase() === 'TRUE';
      const rejected = String(art["ARTIGOS REJEITADOS"] || '').toUpperCase() === 'TRUE';
      
      let rank = 0;
      if (manual) rank = 3;
      else if (rejected) rank = 2;
      else if (curador) rank = 1;

      if (seenFiles.has(fileName)) {
        const prev = seenFiles.get(fileName);
        if (rank > prev.rank) {
          duplicatesToRemove.push(prev.id);
          seenFiles.set(fileName, { id: art._id, rank });
        } else {
          duplicatesToRemove.push(art._id);
        }
      } else {
        seenFiles.set(fileName, { id: art._id, rank });
      }

      updateStatusMap(fileName, manual, curador, rejected, art._id);
    });

    if (duplicatesToRemove.length > 0) {
      console.log(`🗑️ Removendo ${duplicatesToRemove.length} duplicatas do MongoDB...`);
      await Article.deleteMany({ _id: { $in: duplicatesToRemove } });
    }
  }

  // Ler Excel
  if (fs.existsSync(CONSOLIDADO_PATH)) {
    const wb = xlsx.readFile(CONSOLIDADO_PATH);
    const ws = wb.Sheets[SHEET_NAME];
    if (ws) {
      const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
      const headers = allData[0];
      const rows = allData.slice(1);

      const colUrlIdx = headers.indexOf('URL DO DOCUMENTO');
      const colAprovManualIdx = headers.indexOf('APROVAÇÃO MANUAL');
      const colAprovIaIdx = headers.indexOf('APROVAÇÃO CURADOR (marcar)');
      const colRejeitadosIdx = headers.indexOf('ARTIGOS REJEITADOS');

      rows.forEach(row => {
        updateStatusMap(
          row[colUrlIdx],
          String(row[colAprovManualIdx] || '').toUpperCase() === 'TRUE',
          String(row[colAprovIaIdx] || '').toUpperCase() === 'TRUE',
          String(row[colRejeitadosIdx] || '').toUpperCase() === 'TRUE'
        );
      });
    }
  }

  // 3. EXECUÇÃO DA MOVIMENTAÇÃO
  let stats = { movedToAprovados: 0, movedToReprovados: 0, movedToRoot: 0, alreadyCorrect: 0 };

  for (const [fileName, statusInfo] of statusMap.entries()) {
    let targetDir = DOCUMENTS_DIR;
    let label = 'PENDENTE';

    if (statusInfo.rank === 3 || statusInfo.rank === 1) {
      targetDir = APROVADOS_DIR;
      label = statusInfo.rank === 3 ? 'APROVADO (MANUAL)' : 'APROVADO (IA)';
    } else if (statusInfo.rank === 2) {
      targetDir = REPROVADOS_DIR;
      label = 'REJEITADO';
    }

    const targetPath = path.join(targetDir, fileName);
    const locations = [
      path.join(DOCUMENTS_DIR, fileName),
      path.join(APROVADOS_DIR, fileName),
      path.join(REPROVADOS_DIR, fileName)
    ];

    let processedMainFile = false;

    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        if (loc === targetPath) {
          if (!processedMainFile) {
            stats.alreadyCorrect++;
            processedMainFile = true;
          }
          continue;
        }

        // Arquivo está em uma pasta errada ou é duplicata
        try {
          if (fs.existsSync(targetPath) || processedMainFile) {
            // Se já existe no destino ou já processamos uma cópia, remove esta duplicata
            fs.unlinkSync(loc);
            console.log(`[DUPLICATA] Removido: ${path.relative(BASE_DIR, loc)} (Já existe no destino: ${label})`);
            
            // Tenta remover .txt duplicado também
            const txtLoc = loc.replace(/\.[^/.]+$/, "") + ".txt";
            if (fs.existsSync(txtLoc)) {
              try { fs.unlinkSync(txtLoc); } catch (e) {}
            }
          } else {
            // Se não existe no destino e ainda não processamos, move para lá
            fs.renameSync(loc, targetPath);
            
            // Tenta mover o .txt correspondente de onde quer que ele esteja
            const txtName = fileName.replace(/\.[^/.]+$/, "") + ".txt";
            const possibleTxtLocations = [
              path.join(DOCUMENTS_DIR, txtName),
              path.join(APROVADOS_DIR, txtName),
              path.join(REPROVADOS_DIR, txtName)
            ];
            
            const targetTxtPath = targetPath.replace(/\.[^/.]+$/, "") + ".txt";
            let movedTxt = false;

            for (const txtLoc of possibleTxtLocations) {
              if (fs.existsSync(txtLoc)) {
                if (txtLoc === targetTxtPath) {
                  movedTxt = true;
                  continue;
                }
                if (movedTxt) {
                  fs.unlinkSync(txtLoc); // Remove duplicata de .txt
                } else {
                  fs.renameSync(txtLoc, targetTxtPath);
                  movedTxt = true;
                }
              }
            }

            if (targetDir === APROVADOS_DIR) stats.movedToAprovados++;
            else if (targetDir === REPROVADOS_DIR) stats.movedToReprovados++;
            else stats.movedToRoot++;

            console.log(`[${label}] Movido: ${fileName} (de ${path.relative(BASE_DIR, path.dirname(loc))})`);
            processedMainFile = true;
          }
        } catch (e) {
          console.error(`Erro ao processar ${fileName} em ${loc}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n--- RESUMO FINAL ---');
  console.log(`✅ Aprovados: ${stats.movedToAprovados}`);
  console.log(`❌ Reprovados: ${stats.movedToReprovados}`);
  console.log(`⏳ Pendentes: ${stats.movedToRoot}`);
  console.log(`✨ Já estavam corretos: ${stats.alreadyCorrect}`);
  
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

organize();

