const db = require('./database');

const genericQueries = (tableName, options = {}) => {
  const primaryKey = options.primaryKey || 'id';
  const emailField = options.emailField || 'Email';

  const getAll = () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  };

  const getById = (id) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  };

  const getByEmail = (email) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM ${tableName} WHERE ${emailField} = ?`, [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  };


  const findByField = (fieldName, value) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM ${tableName} WHERE ${fieldName} = ?`, [value], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  };


  const create = (data) => {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      db.run(
        `INSERT INTO ${tableName} (${keys}) VALUES (${placeholders})`,
        values,
        function(err) {
          if (err) reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  };

  const update = (id, data) => {
    return new Promise((resolve, reject) => {
      const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const values = [...Object.values(data), id];

      db.run(
        `UPDATE ${tableName} SET ${sets} WHERE ${primaryKey} = ?`,
        values,
        function(err) {
          if (err) reject(err);
          resolve({ changes: this.changes });
        }
      );
    });
  };

  const deleteRow = (id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM ${tableName} WHERE ${primaryKey} = ?`,
        [id],
        function(err) {
          if (err) reject(err);
          resolve({ changes: this.changes });
        }
      );
    });

  };

  const getAllByField = (fieldName, value) => {
    return new Promise((resolve, reject) => {
    
      db.all(`SELECT * FROM ${tableName} WHERE ${fieldName} = ?`, [value], (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  };
  

  const count = () => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) reject(err);
        resolve(row?.count || 0);
      });
    });
  };

  const countByField = (fieldName, value) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${fieldName} = ?`,
        [value],
        (err, row) => {
          if (err) reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  };

  const countByFields = (conditions) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(conditions);
      const whereClause = fields.map(f => `${f} = ?`).join(' AND ');
      const values = Object.values(conditions);

      db.get(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
        values,
        (err, row) => {
          if (err) reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  };

  const countDistinct = (fieldName, conditions = {}) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT COUNT(DISTINCT ${fieldName}) as count FROM ${tableName}`;
      let values = [];

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(f => `${f} = ?`).join(' AND ');
        query += ` WHERE ${whereClause}`;
        values = Object.values(conditions);
      }

      db.get(query, values, (err, row) => {
        if (err) reject(err);
        resolve(row?.count || 0);
      });
    });
  };

  const countWithWhereClause = (whereClause, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  };

  const countDistinctWithWhereClause = (fieldName, whereClause, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT ${fieldName}) as count FROM ${tableName} WHERE ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          resolve(row?.count || 0);
        }
      );
    });
  };

  const getAllWithWhereClause = (whereClause, params = [], orderBy = null) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  };

  const customQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      });
    });
  };

 

  return {
    getAll,
    getById,
    getByEmail,
    findByField,
    getAllByField, 
    create,
    update,
    delete: deleteRow,
    count,
    countByField,
    countByFields,
    countDistinct,
    countWithWhereClause,
    countDistinctWithWhereClause,
    getAllWithWhereClause,
    customQuery
  };
};

module.exports = genericQueries;



