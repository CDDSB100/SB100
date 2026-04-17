const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

const saltRounds = 10;
const dbPath = path.resolve(__dirname, "../../api.db");
console.log(`  > database.js: using db at ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("  > database.js: Erro ao conectar ao banco de dados SQLite:", err.message);
  } else {
    console.log("  > database.js: Conectado ao banco de dados SQLite local.");
  }
});

const pool = {
  execute: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith("SELECT");

      if (isSelect) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve([rows, null]);
        });
      } else {
        db.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve([{ insertId: this.lastID, affectedRows: this.changes }, null]);
        });
      }
    });
  },
};

const initDb = async () => {
  console.log("Initializing SQLite database for backend-2...");

  const createTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'cientometria',
            is_active INTEGER DEFAULT 1,
            allowed_categories TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

  const createArticlesTableSql = `
        CREATE TABLE IF NOT EXISTS articles (
            _id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            subtitle TEXT,
            authors TEXT,
            year TEXT,
            citationsCount TEXT,
            keywords TEXT,
            abstract TEXT,
            documentType TEXT,
            publisher TEXT,
            institution TEXT,
            location TEXT,
            workType TEXT,
            journalTitle TEXT,
            journalQuartile TEXT,
            volume TEXT,
            issue TEXT,
            pages TEXT,
            doi TEXT,
            numbering TEXT,
            qualis TEXT,
            category TEXT,
            soilAndRegionCharacteristics TEXT,
            toolsAndTechniques TEXT,
            nutrients TEXT,
            nutrientSupplyStrategies TEXT,
            cropGroups TEXT,
            cropsPresent TEXT,
            aiFeedback TEXT,
            curatorFeedback TEXT,
            feedbackOnAi TEXT,
            documentUrl TEXT,
            insertedBy TEXT,
            approvedBy TEXT,
            status TEXT DEFAULT 'pending',
            scientometricScore REAL,
            workId TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      db.run(createTableSql, async (err) => {
        if (err) return reject(err);
        
        db.run(createArticlesTableSql, async (err) => {
          if (err) return reject(err);

          // Admin user details
          const adminUsername = process.env.ADMIN_USERNAME || "admin";
          const adminPassword = process.env.ADMIN_PASSWORD || "password123";
          const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
          const adminRole = "admin";

          try {
            const [rows] = await pool.execute("SELECT * FROM users WHERE username = ?", [adminUsername]);

            if (rows.length === 0) {
              const hash = await bcrypt.hash(adminPassword, saltRounds);
              await pool.execute(
                "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                [adminUsername, adminEmail, hash, adminRole]
              );
            }
            resolve();
          } catch (initErr) {
            reject(initErr);
          }
        });
      });
    });
  });
};

module.exports = { pool, initDb, saltRounds };
