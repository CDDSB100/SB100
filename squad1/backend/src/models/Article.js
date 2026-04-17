const { pool } = require('../services/database');

class Article {
  constructor(data) {
    Object.assign(this, data);
  }

  static find(query = {}) {
    const executeQuery = async () => {
      let sql = 'SELECT * FROM articles';
      const params = [];
      const whereClauses = [];

      // Basic support for Mongoose-style query
      if (Object.keys(query).length > 0) {
        for (const [key, value] of Object.entries(query)) {
          if (key === '$or' && Array.isArray(value)) {
            const orClauses = [];
            for (const condition of value) {
              for (const [orKey, orValue] of Object.entries(condition)) {
                if (orValue && typeof orValue === 'object' && orValue.$ne !== undefined) {
                  orClauses.push(`"${orKey}" != ?`);
                  params.push(orValue.$ne);
                } else {
                  orClauses.push(`"${orKey}" = ?`);
                  params.push(orValue);
                }
              }
            }
            if (orClauses.length > 0) {
              whereClauses.push(`(${orClauses.join(' OR ')})`);
            }
          } else if (value && typeof value === 'object' && value.$ne !== undefined) {
            whereClauses.push(`"${key}" != ?`);
            params.push(value.$ne);
          } else {
            whereClauses.push(`"${key}" = ?`);
            params.push(value);
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

  static async deleteMany() {
    await pool.execute('DELETE FROM articles');
    return { success: true };
  }

  async save() {
    const fields = Object.keys(this).filter(k => k !== '_id' && k !== 'createdAt' && k !== 'updatedAt');
    // For SQLite, we should stringify objects
    const values = fields.map(f => {
        const val = this[f];
        if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
        }
        return val;
    });

    if (this._id) {
      const setClause = fields.map(f => `"${f}" = ?`).join(', ');
      await pool.execute(`UPDATE articles SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE _id = ?`, [...values, this._id]);
    } else {
      const columns = fields.map(f => `"${f}"`).join(', ');
      const placeholders = fields.map(() => '?').join(', ');
      const [result] = await pool.execute(`INSERT INTO articles (${columns}) VALUES (${placeholders})`, values);
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
