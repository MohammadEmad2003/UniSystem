const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Admin (
    User_ID INTEGER PRIMARY KEY,
    Permissions_Level INT DEFAULT 1,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
  )
`);

module.exports = db;
