const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cientometria';

async function check() {
  await mongoose.connect(MONGODB_URI);
  const articleSchema = new mongoose.Schema({}, { strict: false });
  const Article = mongoose.model('Article', articleSchema);
  
  const docs = await Article.find({ $or: [{ "Título": /Alva/i }, { "Titulo": /Alva/i }] });
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
