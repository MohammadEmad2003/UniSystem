const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const db = new sqlite3.Database('database.db');
db.serialize(() => {
  db.run("PRAGMA key='123456'");
  db.run("PRAGMA cipher_compatibility=4");
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='Answer'", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('SQLite Answer schema:', rows);
    db.close();
  });
});
