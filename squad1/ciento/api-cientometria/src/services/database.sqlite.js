const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'api.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

const saltRounds = 10;
const adminUser = {
    username: 'admin',
    password: 'password123'
};

const initDb = () => {
    db.serialize(() => {
        // Cria a tabela de usuários
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT
        )`, (err) => {
            if (err) {
                console.error("Erro ao criar tabela 'users':", err.message);
                return;
            }
            console.log("Tabela 'users' verificada/criada com sucesso.");

            // Verifica se o usuário admin já existe
            const sql = `SELECT * FROM users WHERE username = ?`;
            db.get(sql, [adminUser.username], (err, row) => {
                if (err) {
                    console.error("Erro ao procurar usuário admin:", err.message);
                    return;
                }
                if (!row) {
                    // Se não existir, cria o hash da senha e insere o usuário
                    console.log(`Usuário '${adminUser.username}' não encontrado, criando...`);
                    bcrypt.hash(adminUser.password, saltRounds, (err, hash) => {
                        if (err) {
                            console.error("Erro ao gerar hash da senha:", err);
                            return;
                        }
                        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [adminUser.username, hash], (err) => {
                            if (err) {
                                console.error("Erro ao inserir usuário admin:", err.message);
                            } else {
                                console.log(`Usuário '${adminUser.username}' criado com sucesso.`);
                            }
                        });
                    });
                } else {
                    console.log(`Usuário '${adminUser.username}' já existe.`);
                }
            });
        });
    });
};

module.exports = { db, initDb };
