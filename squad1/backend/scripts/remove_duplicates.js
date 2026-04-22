const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../api.db');

async function removeDuplicates() {
    console.log('--- Iniciando Remoção de Duplicatas ---');
    const db = new sqlite3.Database(DB_PATH);

    db.serialize(() => {
        // 1. Contagem inicial
        db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
            console.log(`Total de registros antes: ${row.count}`);
        });

        // 2. Remover duplicatas baseadas no Título (mantendo o ID mais alto)
        // Usamos TRIM e LOWER para garantir uma comparação justa
        const sqlTitle = `
            DELETE FROM articles 
            WHERE _id NOT IN (
                SELECT MAX(_id) 
                FROM articles 
                GROUP BY LOWER(TRIM(title))
            ) AND title IS NOT NULL AND title != ''
        `;

        db.run(sqlTitle, function(err) {
            if (err) console.error("Erro ao remover duplicatas por título:", err.message);
            else console.log(`Removidos por título: ${this.changes} registros.`);
        });

        // 3. Remover duplicatas baseadas no DOI (mantendo o ID mais alto)
        const sqlDoi = `
            DELETE FROM articles 
            WHERE _id NOT IN (
                SELECT MAX(_id) 
                FROM articles 
                GROUP BY LOWER(TRIM(doi))
            ) AND doi IS NOT NULL AND doi != '' AND doi != 'N/A' AND doi != '---'
        `;

        db.run(sqlDoi, function(err) {
            if (err) console.error("Erro ao remover duplicatas por DOI:", err.message);
            else console.log(`Removidos por DOI: ${this.changes} registros.`);
        });

        // 4. Contagem final
        db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
            console.log(`Total de registros após limpeza: ${row.count}`);
        });
    });

    db.close();
}

removeDuplicates();
