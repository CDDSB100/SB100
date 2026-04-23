const { pool } = require('../services/database');

// Vamos definir aqui os campos permitidos para evitar dependência circular pesada
// mas garantindo que o banco suporte todos eles.
const ALLOWED_FIELDS = [
    "title", "subtitle", "authors", "year", "citationsCount", "keywords", "abstract",
    "documentType", "publisher", "institution", "location", "workType",
    "journalTitle", "journalQuartile", "volume", "issue", "pages", "doi",
    "numbering", "qualis", "category", "soilAndRegionCharacteristics",
    "toolsAndTechniques", "nutrients", "nutrientSupplyStrategies",
    "cropGroups", "cropsPresent", "aiFeedback", "curatorFeedback",
    "feedbackOnAi", "documentUrl", "insertedBy", "approvedBy", "status",
    "scientometricScore", "workId", "CONTRADICAO_DETECTADA",
    "MOTIVO_CONTRADICAO", "EVIDENCIAS_CONTRADICAO"
];

class Article {
  constructor(data) {
    Object.assign(this, data);
  }

  static find(query = {}) {
    // ... (restante do código find igual)
    const executeQuery = async () => {
      let sql = 'SELECT * FROM articles';
      const params = [];
      const whereClauses = [];

      const processCondition = (key, value, clauses) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (value.$ne !== undefined) {
            if (value.$ne === null) {
              clauses.push(`"${key}" IS NOT NULL`);
            } else {
              clauses.push(`"${key}" != ?`);
              params.push(value.$ne);
            }
          }
          if (value.$exists !== undefined) {
            if (value.$exists) {
              clauses.push(`"${key}" IS NOT NULL`);
            } else {
              clauses.push(`"${key}" IS NULL`);
            }
          }
          if (value.$regex !== undefined) {
             clauses.push(`"${key}" LIKE ?`);
             params.push(`%${value.$regex.source || value.$regex}%`);
          }
          if (value.$in !== undefined && Array.isArray(value.$in)) {
             const placeholders = value.$in.map(() => '?').join(', ');
             clauses.push(`"${key}" IN (${placeholders})`);
             params.push(...value.$in);
          }
        } else if (value === null) {
          clauses.push(`"${key}" IS NULL`);
        } else {
          clauses.push(`"${key}" = ?`);
          params.push(value);
        }
      };

      // Basic support for Mongoose-style query
      if (Object.keys(query).length > 0) {
        for (const [key, value] of Object.entries(query)) {
          if (key === '$or' && Array.isArray(value)) {
            const orClauses = [];
            for (const condition of value) {
              const subClauses = [];
              for (const [orKey, orValue] of Object.entries(condition)) {
                processCondition(orKey, orValue, subClauses);
              }
              if (subClauses.length > 0) {
                orClauses.push(`(${subClauses.join(' AND ')})`);
              }
            }
            if (orClauses.length > 0) {
              whereClauses.push(`(${orClauses.join(' OR ')})`);
            }
          } else if (key === '$and' && Array.isArray(value)) {
             const andClauses = [];
             for (const condition of value) {
               const subClauses = [];
               for (const [andKey, andValue] of Object.entries(condition)) {
                 processCondition(andKey, andValue, subClauses);
               }
               if (subClauses.length > 0) {
                 andClauses.push(`(${subClauses.join(' AND ')})`);
               }
             }
             if (andClauses.length > 0) {
               whereClauses.push(`(${andClauses.join(' AND ')})`);
             }
          } else {
            processCondition(key, value, whereClauses);
          }
        }
      }

      if (whereClauses.length > 0) {
        sql += ' WHERE ' + whereClauses.join(' AND ');
      }

      sql += ' ORDER BY createdAt DESC';

      const [rows] = await pool.execute(sql, params);
      return rows.map(row => new Article(row));
    };

    const promise = executeQuery();
    
    // Add mock sort/limit/exec for chaining compatibility
    promise.sort = function() { return this; };
    promise.limit = function() { return this; };
    promise.exec = function() { return this; };
    
    return promise;
  }

  static findOne(query = {}) {
    const promise = (async () => {
      const results = await this.find(query);
      return results.length > 0 ? results[0] : null;
    })();
    
    promise.sort = function() { return this; };
    return promise;
  }

  static async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM articles WHERE _id = ?', [id]);
    return rows.length > 0 ? new Article(rows[0]) : null;
  }

  static async findByIdAndDelete(id) {
    await pool.execute('DELETE FROM articles WHERE _id = ?', [id]);
    return { success: true };
  }

  static async deleteMany(query = {}) {
    if (Object.keys(query).length === 0) {
      await pool.execute('DELETE FROM articles');
      return { success: true, deletedCount: -1 }; // deletedCount not easily available without extra query
    }
    
    // For specific deleteMany, we find then delete
    const articles = await this.find(query);
    for (const article of articles) {
      await this.findByIdAndDelete(article._id);
    }
    return { success: true, deletedCount: articles.length };
  }

  async save() {
    // Collect all fields from this object that are allowed in the database
    const fields = Object.keys(this).filter(k => 
      ALLOWED_FIELDS.includes(k) &&
      k !== '_id' && 
      k !== 'createdAt' && 
      k !== 'updatedAt' && 
      typeof this[k] !== 'function'
    );
    
    // For SQLite, we should stringify objects
    const values = fields.map(f => {
        const val = this[f];
        if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
        }
        return val === undefined ? null : val;
    });

    if (this._id) {
      const setClause = fields.map(f => `"${f}" = ?`).join(', ');
      const sql = `UPDATE articles SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE _id = ?`;
      await pool.execute(sql, [...values, this._id]);
    } else {
      const columns = fields.map(f => `"${f}"`).join(', ');
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO articles (${columns}) VALUES (${placeholders})`;
      const [result] = await pool.execute(sql, values);
      this._id = result.insertId;
    }
    return this;
  }

  toObject() {
    const obj = {};
    for (const key of Object.keys(this)) {
      if (typeof this[key] !== 'function') {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

module.exports = { Article };
