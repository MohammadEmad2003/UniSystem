const { query } = require('./database');

const genericQueries = (tableName, options = {}) => {
  const primaryKey = options.primaryKey || 'id';
  const emailField = options.emailField || 'Email';

  const getAll = async () => {
    try {
      const result = await query(`SELECT * FROM ${tableName}`);
      return result.rows;
    } catch (err) {
      throw err;
    }
  };

  const getById = async (id) => {
    try {
      const result = await query(`SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`, [id]);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const getByEmail = async (email) => {
    try {
      const result = await query(`SELECT * FROM ${tableName} WHERE ${emailField} = $1`, [email]);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const findByField = async (fieldName, value) => {
    try {
      const result = await query(`SELECT * FROM ${tableName} WHERE ${fieldName} = $1`, [value]);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const create = async (data) => {
    try {
      const keys = Object.keys(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = Object.values(data);
      
      const result = await query(
        `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const update = async (id, data) => {
    try {
      const keys = Object.keys(data);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = [...Object.values(data), id];
      
      const result = await query(
        `UPDATE ${tableName} SET ${sets} WHERE ${primaryKey} = $${values.length} RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const deleteRow = async (id) => {
    try {
      const result = await query(`DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`, [id]);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  };

  const getAllByField = async (fieldName, value) => {
    try {
      const result = await query(`SELECT * FROM ${tableName} WHERE ${fieldName} = $1`, [value]);
      return result.rows;
    } catch (err) {
      throw err;
    }
  };

  const count = async () => {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const countByField = async (fieldName, value) => {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${fieldName} = $1`, [value]);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const countByFields = async (conditions) => {
    try {
      const fields = Object.keys(conditions);
      const whereClause = fields.map((f, i) => `${f} = $${i + 1}`).join(' AND ');
      const values = Object.values(conditions);

      const result = await query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`, values);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const countDistinct = async (fieldName, conditions = {}) => {
    try {
      let sql = `SELECT COUNT(DISTINCT ${fieldName}) as count FROM ${tableName}`;
      let values = [];

      if (Object.keys(conditions).length > 0) {
        const fields = Object.keys(conditions);
        const whereClause = fields.map((f, i) => `${f} = $${i + 1}`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values = Object.values(conditions);
      }

      const result = await query(sql, values);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const countWithWhereClause = async (whereClause, params = []) => {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`, params);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const countDistinctWithWhereClause = async (fieldName, whereClause, params = []) => {
    try {
      const result = await query(`SELECT COUNT(DISTINCT ${fieldName}) as count FROM ${tableName} WHERE ${whereClause}`, params);
      return parseInt(result.rows[0].count);
    } catch (err) {
      throw err;
    }
  };

  const getAllWithWhereClause = async (whereClause, params = [], orderBy = null) => {
    try {
      let sql = `SELECT * FROM ${tableName} WHERE ${whereClause}`;
      if (orderBy) {
        sql += ` ORDER BY ${orderBy}`;
      }
      const result = await query(sql, params);
      return result.rows;
    } catch (err) {
      throw err;
    }
  };

  const customQuery = async (sql, params = []) => {
    try {
      const result = await query(sql, params);
      return result.rows;
    } catch (err) {
      throw err;
    }
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



