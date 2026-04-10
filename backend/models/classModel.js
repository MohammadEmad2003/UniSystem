const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Class (
    Class_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Level INT NOT NULL,
    Semester VARCHAR(20) NOT NULL,
    Course_Code VARCHAR(20) NOT NULL,
    Doctor_ID INTEGER NOT NULL,
    Capacity INT NOT NULL,
    FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE
  )
`);
 
module.exports = db;