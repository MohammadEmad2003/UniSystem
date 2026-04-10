const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database.db'), {
  verbose: console.log // شيلها في production
});

// تفعيل Foreign Keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;