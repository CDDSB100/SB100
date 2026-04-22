const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const CONSOLIDADO_PATH = path.join(__dirname, '../Consolidado - Respostas Gerais.xlsx');
const DB_PATH = path.join(__dirname, '../api.db');

async function importExcelToSqlite() {
    console.log('--- Iniciando Importação Excel -> SQLite ---');
    
    if (!fs.existsSync(CONSOLIDADO_PATH)) {
        console.error('ERRO: Arquivo Excel não encontrado em:', CONSOLIDADO_PATH);
        return;
    }

    const db = new sqlite3.Database(DB_PATH);
    const wb = xlsx.readFile(CONSOLIDADO_PATH);
    const ws = wb.Sheets["Tabela completa"];
    
    if (!ws) {
        console.error('ERRO: Aba "Tabela completa" não encontrada.');
        return;
    }

    const data = xlsx.utils.sheet_to_json(ws);
    console.log(`Registros no Excel: ${data.length}`);

    // Mapeamento de campos do Excel para as colunas do SQLite
    const mapping = {
        "Autor(es)": "authors",
        "Título": "title",
        "Subtítulo": "subtitle",
        "Ano": "year",
        "Número de citações recebidas (Google Scholar)": "citationsCount",
        "Palavras-chave": "keywords",
        "Resumo": "abstract",
        "Tipo de documento": "documentType",
        "Editora": "publisher",
        "Instituição": "institution",
        "Local": "location",
        "Tipo de trabalho": "workType",
        "Título do periódico": "journalTitle",
        "Quartil do periódico": "journalQuartile",
        "Volume": "volume",
        "Número/fascículo": "issue",
        "Páginas": "pages",
        "DOI": "doi",
        "Numeração": "numbering",
        "Qualis": "qualis",
        "CATEGORIA": "category",
        "Caracteristicas do solo e região (escrever)": "soilAndRegionCharacteristics",
        "ferramentas e técnicas (seleção)": "toolsAndTechniques",
        "nutrientes (seleção)": "nutrients",
        "estratégias de fornecimento de nutrientes (seleção)": "nutrientSupplyStrategies",
        "grupos de culturas (seleção)": "cropGroups",
        "culturas presentes (seleção)": "cropsPresent",
        "URL DO DOCUMENTO": "documentUrl",
        "work_id": "workId"
    };

    db.serialize(() => {
        // Opcional: Limpar tabela antes de importar
        // db.run("DELETE FROM articles");

        const stmt = db.prepare(`
            INSERT INTO articles (
                authors, title, subtitle, year, citationsCount, keywords, abstract, 
                documentType, publisher, institution, location, workType, journalTitle, 
                journalQuartile, volume, issue, pages, doi, numbering, qualis, 
                category, soilAndRegionCharacteristics, toolsAndTechniques, nutrients, 
                nutrientSupplyStrategies, cropGroups, cropsPresent, documentUrl, workId, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);

        let imported = 0;
        let skipped = 0;

        for (const row of data) {
            const title = row["Título"] || row["Titulo"];
            if (!title) {
                skipped++;
                continue;
            }

            const values = [
                row["Autor(es)"] || "",
                title,
                row["Subtítulo"] || "",
                row["Ano"] || "",
                row["Número de citações recebidas (Google Scholar)"] || "0",
                row["Palavras-chave"] || "",
                row["Resumo"] || "",
                row["Tipo de documento"] || "",
                row["Editora"] || "",
                row["Instituição"] || "",
                row["Local"] || "",
                row["Tipo de trabalho"] || "",
                row["Título do periódico"] || "",
                row["Quartil do periódico"] || "",
                row["Volume"] || "",
                row["Número/fascículo"] || "",
                row["Páginas"] || "",
                row["DOI"] || "",
                row["Numeração"] || "",
                row["Qualis"] || "",
                row["CATEGORIA"] || "Geral",
                row["Caracteristicas do solo e região (escrever)"] || "",
                row["ferramentas e técnicas (seleção)"] || "",
                row["nutrientes (seleção)"] || "",
                row["estratégias de fornecimento de nutrientes (seleção)"] || "",
                row["grupos de culturas (seleção)"] || "",
                row["culturas presentes (seleção)"] || "",
                row["URL DO DOCUMENTO"] || "",
                row["work_id"] || `ex-${Date.now()}-${imported}`,
                "pending" // Garantir que entrem como pendentes para o lote
            ];

            stmt.run(values);
            imported++;
        }

        stmt.finalize();
        console.log(`Importação concluída: ${imported} inseridos, ${skipped} pulados.`);
    });

    db.close();
}

importExcelToSqlite();
