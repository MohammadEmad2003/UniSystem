const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Notification (
    Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER NOT NULL,
    Type TEXT CHECK(Type IN ('new_material', 'new_question', 'new_answer', 'new_grade', 'announcement', 'approval', 'enrollment')) NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    Class_ID INTEGER,
    Reference_ID INTEGER,
    Is_Read BOOLEAN DEFAULT 0,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE SET NULL
  )
`);

module.exports = db;