const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

// Conexão com tratamento de erro resiliente
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (err) {
    console.error('⚠️ ATENÇÃO: Falha ao conectar ao MongoDB. Algumas funcionalidades de persistência podem não estar disponíveis.');
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Erro crítico em produção. Encerrando...');
      process.exit(1);
    }
  }
};

connectDB();

const articleSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  authors: String,
  year: String,
  citationsCount: String,
  keywords: String,
  abstract: String,
  documentType: String,
  publisher: String,
  institution: String,
  location: String,
  workType: String,
  journalTitle: String,
  journalQuartile: String,
  volume: String,
  issue: String,
  pages: String,
  doi: String,
  numbering: String,
  qualis: String,
  category: String,
  soilAndRegionCharacteristics: String,
  toolsAndTechniques: String,
  nutrients: String,
  nutrientSupplyStrategies: String,
  cropGroups: String,
  cropsPresent: String,
  aiFeedback: mongoose.Schema.Types.Mixed,
  curatorFeedback: mongoose.Schema.Types.Mixed,
  feedbackOnAi: mongoose.Schema.Types.Mixed,
  documentUrl: String,
  insertedBy: String,
  approvedBy: String,
  status: {
    type: String,
    enum: ['pending', 'approved_ia', 'approved_manual', 'rejected'],
    default: 'pending'
  },
  scientometricScore: Number,
  workId: String,
}, { 
  strict: false,
  timestamps: true 
});

const Article = mongoose.model('Article', articleSchema);

module.exports = { Article };
