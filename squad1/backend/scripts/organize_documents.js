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

// MongoDB URI - Fallback para localhost se falhar o IP específico
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cientometria';

// ... (schema e pastas permanecem iguais)

async function organize() {
  console.log('--- INICIANDO ORGANIZAÇÃO E LIMPEZA DE DOCUMENTOS ---');
  
  // 1. LIMPEZA DE .TXT NO PENDENTES
  // ... (código de limpeza de txt)

  try {
    console.log(`🔗 Tentando conectar ao MongoDB em: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Conectado ao MongoDB.');
  } catch (err) {
    console.error('⚠️ Erro ao conectar ao MongoDB.', err.message);
    console.log('⚠️ Continuando apenas com a lógica baseada no disco e pastas...');
  }

  // ... (statusMap e leitura do Mongo)

  // Ler Excel - Proteção contra EISDIR
  if (fs.existsSync(CONSOLIDADO_PATH)) {
    const stats = fs.statSync(CONSOLIDADO_PATH);
    if (stats.isFile()) {
      try {
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
      } catch (excelErr) {
        console.error(`⚠️ Erro ao ler Excel: ${excelErr.message}`);
      }
    } else {
      console.warn(`⚠️ Aviso: ${CONSOLIDADO_PATH} existe mas é um diretório, ignorando leitura do Excel.`);
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

