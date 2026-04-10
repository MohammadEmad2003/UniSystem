const db = require('./database');

const genericQueries = (tableName, options = {}) => {
  const primaryKey = options.primaryKey || 'id';

  const getAll = () => {
    return db.prepare(`SELECT * FROM ${tableName}`).all();
  };

  const getById = (id) => {
    return db.prepare(`
      SELECT * FROM ${tableName}
      WHERE ${primaryKey} = ?
    `).get(id);
  };

  const create = (data) => {
    const keys = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const stmt = db.prepare(`
      INSERT INTO ${tableName} (${keys})
      VALUES (${placeholders})
    `);

    return stmt.run(...values);
  };

  const update = (id, data) => {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];

    return db.prepare(`
      UPDATE ${tableName}
      SET ${sets}
      WHERE ${primaryKey} = ?
    `).run(...values);
  };

  const deleteRow = (id) => {
    return db.prepare(`
      DELETE FROM ${tableName}
      WHERE ${primaryKey} = ?
    `).run(id);
  };

  return {
    getAll,
    getById,
    create,
    update,
    delete: deleteRow
  };
};

module.exports = genericQueries;



