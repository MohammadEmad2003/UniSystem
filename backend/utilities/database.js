const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database.db'), {
  verbose: console.log 
});

db.run("PRAGMA key='123456'");
db.run("PRAGMA cipher_compatibility=4");

module.exports = db;