const db = require('../utilities/database');

db.exec(`
    CREATE TABLE IF NOT EXISTS Attendance (
    Attendance_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER NOT NULL,
    Lec_ID INTEGER NOT NULL,
    Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    Early_Check BOOLEAN DEFAULT 0,
    Late_Check BOOLEAN DEFAULT 0,
    Method TEXT CHECK(Method IN ('nfc', 'manual', 'online')),
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
  )
`);

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON Attendance(User_ID, Lec_ID)`);

module.exports = db;