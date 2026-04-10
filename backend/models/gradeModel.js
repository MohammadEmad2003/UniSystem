const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Grades (
    Grade_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Type TEXT NOT NULL,
    Generate_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    Attendance DECIMAL(5,2) DEFAULT 0,
    Practical DECIMAL(5,2) DEFAULT 0,
    Project DECIMAL(5,2) DEFAULT 0,
    Midterm DECIMAL(5,2) DEFAULT 0,
    Final DECIMAL(5,2) DEFAULT 0,
    GPA DECIMAL(4,2) DEFAULT 0,
    User_ID INTEGER NOT NULL,
    Class_ID INTEGER NOT NULL,
    Doctor_ID INTEGER NOT NULL,
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE
  )
`);
 
module.exports = db;