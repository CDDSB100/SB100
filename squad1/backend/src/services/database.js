const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const saltRounds = 10;
const dbPath = path.join(__dirname, '../../api.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening SQLite database:', err.message);
  else console.log('Connected to SQLite database at:', dbPath);
});

// Wrapper para manter compatibilidade com pool.execute
const pool = {
  execute: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve([rows]);
      });
    });
  }
};

const initDb = () => {
  // O SQLite já deve estar inicializado com seus usuários.
  // Apenas garantimos que a tabela existe se for um banco novo.
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT,
      password_hash TEXT,
      role TEXT,
      is_active INTEGER,
      allowed_categories TEXT
    )`);
  });
};

module.exports = { pool, initDb, saltRounds };
