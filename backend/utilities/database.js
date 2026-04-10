const Database = require('better-sqlite3-multiple-ciphers');
const path = require('path');

const DB_PASSWORD = process.env.DB_PASSWORD;

const db = new Database(path.join(__dirname, '../database.sqlite'));


db.pragma(`key='${DB_PASSWORD}'`);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;