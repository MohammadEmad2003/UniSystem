const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Doctor (
    User_ID INTEGER PRIMARY KEY,
    Specialization VARCHAR(100),
    Permission INT DEFAULT NULL,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
  )
`);

module.exports = db;