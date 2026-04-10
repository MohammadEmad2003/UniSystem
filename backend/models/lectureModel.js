const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Lecture (
    Lec_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Day VARCHAR(15),
    Time TIME,
    Room_ID VARCHAR(20),
    Meeting_Link VARCHAR(255),
    Type TEXT CHECK(Type IN ('Lecture', 'Section', 'Lab', 'Online')) NOT NULL,
    Class_ID INTEGER NOT NULL,
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE
  )
`);
 
module.exports = db;