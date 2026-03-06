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

// Mock pool.execute to minimize changes in server.js
// mysql2's execute returns [rows, fields]
const pool = {
  execute: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Basic detection of SELECT vs INSERT/UPDATE/DELETE
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
  console.log("Initializing SQLite database...");

  // SQLite compatible schema
  // id INTEGER PRIMARY KEY AUTOINCREMENT
  // ENUM is not supported, using TEXT with check constraint or just TEXT
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

  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      db.run(createTableSql, async (err) => {
        if (err) {
          console.error("Error creating users table:", err.message);
          return reject(err);
        }
        console.log("Table 'users' checked/created successfully in SQLite.");

        // Admin user details
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "password123";
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const adminRole = "admin";

        try {
          const [rows] = await pool.execute("SELECT * FROM users WHERE username = ?", [adminUsername]);

          if (rows.length === 0) {
            console.log(`Admin user '${adminUsername}' not found, creating...`);
            const hash = await bcrypt.hash(adminPassword, saltRounds);
            await pool.execute(
              "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
              [adminUsername, adminEmail, hash, adminRole]
            );
            console.log(`Admin user '${adminUsername}' created successfully.`);
          } else {
            console.log(`Admin user '${adminUsername}' already exists.`);
          }
          resolve();
        } catch (initErr) {
          console.error("Error initializing admin user:", initErr.message);
          reject(initErr);
        }
      });
    });
  });
};

module.exports = { pool, initDb, saltRounds };
