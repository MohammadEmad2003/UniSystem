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

  return {
    getAll,
    getById,
    getByEmail,
    create,
    update,
    delete: deleteRow
  };
};

module.exports = genericQueries;



