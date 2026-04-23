const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados na VM
const DB_PATH = path.join(__dirname, 'backend/api.db');

console.log(`Conectando ao banco em: ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
        process.exit(1);
    }
});

// Consulta todos os artigos
db.all("SELECT _id, title, status, category, documentUrl FROM articles", [], (err, rows) => {
    if (err) {
        console.error("Erro ao consultar dados:", err.message);
    } else {
        console.log("=== LISTA DE ARTIGOS NO BANCO ===");
        console.table(rows); // Exibe em formato de tabela no terminal
        console.log(`Total de registros: ${rows.length}`);
    }
    db.close();
});
