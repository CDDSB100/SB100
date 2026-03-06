#!/usr/bin/env node
/**
 * Script de Migração de Categorias
 * 
 * Migra categorias antigas para o novo padrão:
 * - "MANEJO DE NUTRIENTES E AGUA" → usará API para recategorizar
 * - "BIOINSUMOS" → usará API para recategorizar
 * - "MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE" → "citros e cana"
 * - Vazio/inválido → usará API para recategorizar
 * 
 * Categorias válidas: "solos", "citros e cana"
 */

const xlsx = require('xlsx');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const axios = require('axios');

// Configuração
const BASE_DIR = path.join(__dirname, '..');
const CONSOLIDADO_PATH = path.join(BASE_DIR, 'Consolidado - Respostas Gerais.xlsx');
const DOCUMENTS_DIR = path.join(BASE_DIR, 'documents');
const APROVADOS_DIR = path.join(DOCUMENTS_DIR, 'aprovados');
const REPROVADOS_DIR = path.join(DOCUMENTS_DIR, 'reprovados');
const SHEET_NAME = 'Tabela completa';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

// Configuração de categorias
const VALID_CATEGORIES = ['solos', 'citros e cana'];
const OLD_CATEGORIES = [
  'MANEJO DE NUTRIENTES E AGUA',
  'BIOINSUMOS',
  'MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE'
];

const CATEGORY_HINTS = {
  'MANEJO ECOFISIOLÓGICO E NUTRICIONAL DA CITRICULTURA DE ALTA PERFORMANCE': 'citros e cana',
  'MANEJO DE NUTRIENTES E AGUA': 'citros e cana', // Pode ser solos ou citros, deixar para API decidir
  'BIOINSUMOS': 'solos' // Provavelmente solos, mas deixar para API decidir
};

// Função para encontrar arquivo
function findFileInFolders(fileName) {
  if (!fileName) return null;
  
  const locations = [
    path.join(DOCUMENTS_DIR, fileName),
    path.join(APROVADOS_DIR, fileName),
    path.join(REPROVADOS_DIR, fileName)
  ];

  for (const loc of locations) {
    if (fsSync.existsSync(loc)) {
      return loc;
    }
  }
  return null;
}

// Função para chamar API de categorização
async function callCategorizationApi(pdfBuffer) {
  const payload = {
    encoded_content: pdfBuffer.toString('base64'),
    content_type: 'pdf',
    headers: []
  };

  try {
    const res = await axios.post(`${API_BASE_URL}/categorize`, payload, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data.category;
  } catch (error) {
    console.error(`  ✗ Erro na API de categorização: ${error.message}`);
    throw error;
  }
}

// Função principal de migração
async function migrateCategories() {
  console.log('📋 Iniciando migração de categorias...\n');

  // Carregar workbook
  if (!fsSync.existsSync(CONSOLIDADO_PATH)) {
    console.error(`✗ Arquivo não encontrado: ${CONSOLIDADO_PATH}`);
    process.exit(1);
  }

  const wb = xlsx.readFile(CONSOLIDADO_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const allData = xlsx.utils.sheet_to_aoa(ws);

  if (allData.length === 0) {
    console.error('✗ Planilha vazia');
    process.exit(1);
  }

  // Encontrar coluna CATEGORIA
  const headers = allData[0];
  let colCategoriaIndex = headers.indexOf('CATEGORIA');
  if (colCategoriaIndex === -1) {
    console.error('✗ Coluna CATEGORIA não encontrada');
    process.exit(1);
  }

  const colUrlDocumentoIndex = headers.indexOf('URL DO DOCUMENTO');
  const colTituloIndex = headers.indexOf('TÍTULO');

  let modified = false;
  let repairsApplied = 0;
  let errorsEncountered = 0;

  console.log(`📊 Total de linhas: ${allData.length - 1}`);
  console.log(`🔍 Procurando categorias inválidas...\n`);

  // Processar cada linha
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    let category = String(row[colCategoriaIndex] || '').trim();
    const fileName = row[colUrlDocumentoIndex];
    const titulo = row[colTituloIndex] || `Artigo ${i}`;

    // Verificar se categoria é inválida
    const isOldCategory = OLD_CATEGORIES.includes(category);
    const isEmpty = category === '' || category === null;
    const isInvalid = !VALID_CATEGORIES.includes(category);

    if ((isOldCategory || isEmpty || isInvalid) && repairsApplied < 50) {
      console.log(`\n📝 Linha ${i}: "${titulo}"`);
      console.log(`  Categoria atual: "${category}"`);

      if (fileName && fsSync.existsSync(findFileInFolders(fileName) || '')) {
        const filePath = findFileInFolders(fileName);
        
        try {
          console.log(`  🔄 Recategorizando via API...`);
          const pdfBuffer = await fsSync.promises.readFile(filePath);
          const newCategory = await callCategorizationApi(pdfBuffer);

          if (VALID_CATEGORIES.includes(newCategory)) {
            allData[i][colCategoriaIndex] = newCategory;
            console.log(`  ✓ Nova categoria: "${newCategory}"`);
            modified = true;
            repairsApplied++;
          } else {
            console.log(`  ⚠ Categoria retornada inválida: "${newCategory}"`);
            errorsEncountered++;
          }
        } catch (error) {
          console.log(`  ✗ Erro ao recategorizar: ${error.message}`);
          errorsEncountered++;
          
          // Se há uma dica, usar
          if (CATEGORY_HINTS[category]) {
            console.log(`  💡 Aplicando dica: "${CATEGORY_HINTS[category]}"`);
            allData[i][colCategoriaIndex] = CATEGORY_HINTS[category];
            modified = true;
            repairsApplied++;
          }
        }
      } else {
        // Arquivo não encontrado, aplicar dica se houver
        if (CATEGORY_HINTS[category]) {
          console.log(`  🔗 Arquivo não encontrado, aplicando dica: "${CATEGORY_HINTS[category]}"`);
          allData[i][colCategoriaIndex] = CATEGORY_HINTS[category];
          modified = true;
          repairsApplied++;
        } else if (isEmpty) {
          console.log(`  ⚠ Categoria vazia e arquivo não encontrado - será deixado em branco`);
        }
      }
    }
  }

  // Salvar se houver modificações
  if (modified) {
    console.log(`\n💾 Salvando arquivo com ${repairsApplied} correções...`);
    const newWs = xlsx.utils.aoa_to_sheet(allData);
    wb.Sheets[SHEET_NAME] = newWs;
    
    // Criar backup
    const backupPath = CONSOLIDADO_PATH.replace('.xlsx', `_backup_${Date.now()}.xlsx`);
    xlsx.writeFile(wb, backupPath);
    console.log(`  ✓ Backup criado: ${path.basename(backupPath)}`);
    
    // Salvar arquivo principal
    xlsx.writeFile(wb, CONSOLIDADO_PATH);
    console.log(`  ✓ Arquivo principal atualizado`);
  }

  // Resumo
  console.log(`\n📊 Resumo da Migração:`);
  console.log(`  ✓ Reparos aplicados: ${repairsApplied}`);
  console.log(`  ✗ Erros encontrados: ${errorsEncountered}`);
  console.log(`  ✓ Arquivo modificado: ${modified ? 'Sim' : 'Não'}`);

  // Validação final
  console.log(`\n🔍 Validação Final:`);
  let invalidCount = 0;
  let emptyCount = 0;
  
  for (let i = 1; i < allData.length; i++) {
    const category = String(allData[i][colCategoriaIndex] || '').trim();
    if (category === '') {
      emptyCount++;
    } else if (!VALID_CATEGORIES.includes(category)) {
      invalidCount++;
      console.log(`  ⚠ Linha ${i}: Categoria inválida ainda presente: "${category}"`);
    }
  }

  console.log(`  Categorias vazias: ${emptyCount}`);
  console.log(`  Categorias inválidas: ${invalidCount}`);
  console.log(`  Categorias válidas: ${allData.length - 1 - emptyCount - invalidCount}`);

  console.log(`\n✅ Migração concluída!`);
}

// Executar
migrateCategories().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
