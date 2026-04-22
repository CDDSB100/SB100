const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { pool } = require('./database');

const CONSOLIDADO_PATH = path.join(__dirname, '../../Consolidado - Respostas Gerais.xlsx');

async function migrateExcelToSqlite() {
    console.log('--- Verificando Migração Automática (Excel -> SQLite) ---');
    
    if (!fs.existsSync(CONSOLIDADO_PATH)) {
        console.warn('  > Aviso: Arquivo Excel não encontrado em:', CONSOLIDADO_PATH);
        return;
    }

    const stats = fs.statSync(CONSOLIDADO_PATH);
    if (stats.isDirectory()) {
        console.error('  > Erro: O caminho do Excel aponta para um diretório, não um arquivo:', CONSOLIDADO_PATH);
        return;
    }

    try {
        const wb = xlsx.readFile(CONSOLIDADO_PATH);
        const ws = wb.Sheets["Tabela completa"];
        
        if (!ws) {
            console.error('  > Erro: Aba "Tabela completa" não encontrada no Excel.');
            return;
        }

        const data = xlsx.utils.sheet_to_json(ws);
        
        // Verificar se o banco já tem dados para não duplicar toda vez
        const [rows] = await pool.execute("SELECT COUNT(*) as count FROM articles");
        if (rows[0].count > 0) {
            console.log(`  > Banco já possui ${rows[0].count} registros. Verificando novos itens...`);
            // Se já tem dados, você pode optar por pular ou implementar uma lógica de "apenas novos"
            // Por segurança e performance no boot, vamos pular se já houver dados.
            return;
        }

        console.log(`  > Importando ${data.length} registros...`);

        for (const row of data) {
            const title = row["Título"] || row["Titulo"];
            if (!title) continue;

            const fields = {
                authors: row["Autor(es)"] || "",
                title: title,
                subtitle: row["Subtítulo"] || "",
                year: row["Ano"] || "",
                citationsCount: row["Número de citações recebidas (Google Scholar)"] || "0",
                keywords: row["Palavras-chave"] || "",
                abstract: row["Resumo"] || "",
                documentType: row["Tipo de documento"] || "",
                publisher: row["Editora"] || "",
                institution: row["Instituição"] || "",
                location: row["Local"] || "",
                workType: row["Tipo de trabalho"] || "",
                journalTitle: row["Título do periódico"] || "",
                journalQuartile: row["Quartil do periódico"] || "",
                volume: row["Volume"] || "",
                issue: row["Número/fascículo"] || "",
                pages: row["Páginas"] || "",
                doi: row["DOI"] || "",
                numbering: row["Numeração"] || "",
                qualis: row["Qualis"] || "",
                category: row["CATEGORIA"] || "Geral",
                soilAndRegionCharacteristics: row["Caracteristicas do solo e região (escrever)"] || "",
                toolsAndTechniques: row["ferramentas e técnicas (seleção)"] || "",
                nutrients: row["nutrientes (seleção)"] || "",
                nutrientSupplyStrategies: row["estratégias de fornecimento de nutrientes (seleção)"] || "",
                cropGroups: row["grupos de culturas (seleção)"] || "",
                cropsPresent: row["culturas presentes (seleção)"] || "",
                documentUrl: row["URL DO DOCUMENTO"] || "",
                workId: row["work_id"] || `init-${Date.now()}-${Math.random()}`,
                status: "pending"
            };

            const columns = Object.keys(fields).map(c => `"${c}"`).join(', ');
            const placeholders = Object.keys(fields).map(() => '?').join(', ');
            const values = Object.values(fields);

            await pool.execute(`INSERT INTO articles (${columns}) VALUES (${placeholders})`, values);
        }

        console.log('  > Migração concluída com sucesso!');
    } catch (error) {
        console.error('  > Erro crítico na migração:', error.message);
    }
}

module.exports = { migrateExcelToSqlite };
