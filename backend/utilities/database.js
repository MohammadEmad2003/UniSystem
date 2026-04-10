const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ error:', err.message);
});

db.run("PRAGMA key='123456'");
db.run("PRAGMA cipher_compatibility=4");

module.exports = db;