const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

// Conexão com tratamento de erro resiliente
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Tenta por 5 segundos no máximo
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (err) {
    console.error('⚠️ ATENÇÃO: Falha ao conectar ao MongoDB. Algumas funcionalidades de persistência podem não estar disponíveis.');
    // No ambiente de teste/dev, não encerramos o processo para permitir rodar apenas partes do sistema.
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Erro crítico em produção. Encerrando...');
      process.exit(1);
    }
  }
};

connectDB();

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
  "FEEDBACK DA IA": mongoose.Schema.Types.Mixed,
  "FEEDBACK DO CURADOR": mongoose.Schema.Types.Mixed,
  "FEEDBACK SOBRE IA": mongoose.Schema.Types.Mixed,
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
