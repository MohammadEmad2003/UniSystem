const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database.db'), {
  verbose: console.log 
});

db.run("PRAGMA key='123456'");
db.run("PRAGMA cipher_compatibility=4");

// activation of foreign keys in SQLite
db.run("PRAGMA foreign_keys = ON;", (err) => {
    if (err) {
        console.error("Error enabling Foreign Keys: ", err.message);
    } else {
        console.log("Foreign Keys are now ACTIVE.");
    }
});
module.exports = db;