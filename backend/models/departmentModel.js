const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Department (
    Dept_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Dept_Name VARCHAR(100) UNIQUE NOT NULL,
    Doctor_ID INTEGER,
    Permission VARCHAR(100),
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL
  )
`);
 
module.exports = db;