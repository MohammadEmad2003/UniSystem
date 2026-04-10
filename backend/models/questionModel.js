const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Questions (
    Questions_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Text TEXT NOT NULL,
    User_ID INTEGER ,
    Class_ID INTEGER NOT NULL,
    Doctor_ID INTEGER,
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL
  )
`);
 
module.exports = db;