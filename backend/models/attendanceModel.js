const db = require('../utilities/database');

db.exec(`
    CREATE TABLE IF NOT EXISTS Attendance (
    Attendance_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER NOT NULL,
    Lec_ID INTEGER NOT NULL,
    Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    Is_Verified BOOLEAN DEFAULT 0,
    Status TEXT CHECK(Status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
  )
`);

module.exports = db;