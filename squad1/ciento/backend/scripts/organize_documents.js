const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// --- CONFIGURAÇÃO DE CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..');
const CONSOLIDADO_PATH = path.join(BASE_DIR, 'Consolidado - Respostas Gerais.xlsx');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');

const SHEET_NAME = 'Tabela completa';

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
  console.log('--- INICIANDO ORGANIZAÇÃO DE DOCUMENTOS ---');
  
  if (!fs.existsSync(CONSOLIDADO_PATH)) {
    console.error('Erro: Planilha não encontrada em ' + CONSOLIDADO_PATH);
    return;
  }

  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    console.error(`Erro: Aba "${SHEET_NAME}" não encontrada.`);
    return;
  }

  const allData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  const headers = allData[0];
  const rows = allData.slice(1);

  const colUrlIdx = headers.indexOf('URL DO DOCUMENTO');
  const colAprovManualIdx = headers.indexOf('APROVAÇÃO MANUAL');
  const colAprovIaIdx = headers.indexOf('APROVAÇÃO CURADOR (marcar)');
  const colRejeitadosIdx = headers.indexOf('ARTIGOS REJEITADOS');

  let stats = { movedToAprovados: 0, movedToReprovados: 0, movedToRoot: 0, alreadyCorrect: 0, notFound: 0 };

  rows.forEach((row, index) => {
    const fileName = row[colUrlIdx];
    if (!fileName || fileName.toString().startsWith('http')) return; // Pula se não for arquivo local

    const isManualApproved = String(row[colAprovManualIdx] || '').toUpperCase() === 'TRUE';
    const isIaApproved = String(row[colAprovIaIdx] || '').toUpperCase() === 'TRUE';
    const isRejected = String(row[colRejeitadosIdx] || '').toUpperCase() === 'TRUE';

    let targetDir = DOCUMENTS_DIR; // Default: pendente (raiz)
    let status = 'PENDENTE';

    if (isManualApproved) {
      targetDir = APROVADOS_DIR;
      status = 'APROVADO (MANUAL)';
    } else if (isRejected) {
      targetDir = REPROVADOS_DIR;
      status = 'REJEITADO';
    } else if (isIaApproved) {
      targetDir = APROVADOS_DIR;
      status = 'APROVADO (IA)';
    }

    const currentPath = findFileAnywhere(fileName);
    const targetPath = path.join(targetDir, fileName);

    if (currentPath) {
      if (currentPath !== targetPath) {
        try {
          fs.renameSync(currentPath, targetPath);
          
          // Tentar mover o .txt correspondente também
          const txtName = fileName.replace(/\.[^/.]+$/, "") + ".txt";
          const currentTxtPath = findFileAnywhere(txtName);
          if (currentTxtPath) {
            fs.renameSync(currentTxtPath, path.join(targetDir, txtName));
          }

          if (targetDir === APROVADOS_DIR) stats.movedToAprovados++;
          else if (targetDir === REPROVADOS_DIR) stats.movedToReprovados++;
          else stats.movedToRoot++;
          
          console.log(`[${status}] Moveu: ${fileName}`);
        } catch (e) {
          console.error(`Erro ao mover ${fileName}: ${e.message}`);
        }
      } else {
        stats.alreadyCorrect++;
      }
    } else {
      stats.notFound++;
    }
  });

  console.log('\n--- RESUMO ---');
  console.log(`Aprovados (Movidos): ${stats.movedToAprovados}`);
  console.log(`Reprovados (Movidos): ${stats.movedToReprovados}`);
  console.log(`Pendentes (Movidos p/ Raiz): ${stats.movedToRoot}`);
  console.log(`Arquivos já na pasta correta: ${stats.alreadyCorrect}`);
  console.log(`Arquivos físicos não localizados: ${stats.notFound}`);
}

organize();
