const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho absoluto para ./backend/api.db
const dbPath = path.resolve(__dirname, '../api.db');
console.log('Utilizando banco em:', dbPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Iniciando migração de colunas de contradição...');

  db.run("ALTER TABLE articles ADD COLUMN CONTRADICAO_DETECTADA BOOLEAN DEFAULT 0", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Coluna CONTRADICAO_DETECTADA já existe.');
      } else {
        console.error('Erro ao adicionar CONTRADICAO_DETECTADA:', err.message);
      }
    } else {
      console.log('Coluna CONTRADICAO_DETECTADA adicionada com sucesso.');
    }
  });

  db.run("ALTER TABLE articles ADD COLUMN MOTIVO_CONTRADICAO TEXT", (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('Coluna MOTIVO_CONTRADICAO já existe.');
      } else {
        console.error('Erro ao adicionar MOTIVO_CONTRADICAO:', err.message);
      }
    } else {
      console.log('Coluna MOTIVO_CONTRADICAO adicionada com sucesso.');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Erro ao fechar o banco:', err.message);
  } else {
    console.log('Migração concluída.');
  }
});
