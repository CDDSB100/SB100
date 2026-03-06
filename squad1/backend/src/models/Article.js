const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

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
}, { 
  strict: false,
  timestamps: true 
});

const Article = mongoose.model('Article', articleSchema);

module.exports = { Article };
