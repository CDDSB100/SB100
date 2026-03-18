const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CONSOLIDADO_PATH = path.join(__dirname, '../Consolidado - Respostas Gerais.xlsx');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

// Define the Article Schema based on ALL_METADATA_FIELDS and additional fields
const articleSchema = new mongoose.Schema({
    "Autor(es)": String,
    "Título": String,
    "Subtítulo": String,
    "Ano": String,
    "Número de citações recebidas (Google Scholar)": String,
    "Palavras-chave": String,
    "Resumo": String,
    "Tipo de documento": String,
    "Editora": String,
    "Instituição": String,
    "Local": String,
    "Tipo de trabalho": String,
    "Título do periódico": String,
    "Quartil do periódico": String,
    "Volume": String,
    "Número/fascículo": String,
    "Páginas": String,
    "DOI": String,
    "Numeração": String,
    "Qualis": String,
    "CATEGORIA": String,
    "Caracteristicas do solo e região (escrever)": String,
    "ferramentas e técnicas (seleção)": String,
    "nutrientes (seleção)": String,
    "estratégias de fornecimento de nutrientes (seleção)": String,
    "grupos de culturas (seleção)": String,
    "culturas presentes (seleção)": String,
    "FEEDBACK DO CURADOR (escrever)": String,
    "URL DO DOCUMENTO": String,
    "INSERIDO POR": String,
    "APROVADO POR": String,
    "APROVAÇÃO MANUAL": String,
    "ARTIGOS REJEITADOS": String,
    "APROVAÇÃO CURADOR (marcar)": String,
    "work_id": String,
    "migrated_at": { type: Date, default: Date.now }
}, { strict: false }); // allow extra fields just in case

const Article = mongoose.model('Article', articleSchema);

async function migrate() {
    console.log('--- Iniciando Migração para MongoDB ---');
    console.log(`Planilha: ${CONSOLIDADO_PATH}`);
    
    if (!fs.existsSync(CONSOLIDADO_PATH)) {
        console.error('ERRO: Arquivo Excel não encontrado.');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Conectado ao MongoDB.');

        const wb = xlsx.readFile(CONSOLIDADO_PATH);
        const SHEET_NAME = "Tabela completa";
        const ws = wb.Sheets[SHEET_NAME];
        
        if (!ws) {
            console.error(`ERRO: Aba "${SHEET_NAME}" não encontrada.`);
            process.exit(1);
        }

        const data = xlsx.utils.sheet_to_json(ws);
        console.log(`Total de registros na planilha: ${data.length}`);

        // Limpar coleção atual antes da migração (opcional, mas recomendado para migração total)
        const confirmDelete = true;
        if (confirmDelete) {
            await Article.deleteMany({});
            console.log('Coleção "articles" limpa.');
        }

        let count = 0;
        for (const row of data) {
            // Normalização básica de dados
            const articleData = {};
            for (let key in row) {
                articleData[key] = String(row[key] || "").trim();
            }

            // Gerar um work_id se não existir
            if (!articleData["work_id"]) {
                articleData["work_id"] = `migrated-${Date.now()}-${count}`;
            }

            const article = new Article(articleData);
            await article.save();
            count++;
            if (count % 50 === 0) console.log(`Processados: ${count}/${data.length}`);
        }

        console.log(`
✅ Sucesso! ${count} registros migrados.`);
    } catch (error) {
        console.error('ERRO durante a migração:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexão MongoDB fechada.');
    }
}

migrate();
