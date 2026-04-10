const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Answer (
    Answer_ID INTEGER NOT NULL,
    Questions_ID INTEGER NOT NULL,
    Text TEXT NOT NULL,
    Time DATETIME DEFAULT CURRENT_TIMESTAMP,
    Doctor_ID INTEGER,
    User_ID INTEGER,
    PRIMARY KEY (Answer_ID, Questions_ID),
    FOREIGN KEY (Questions_ID) REFERENCES Questions(Questions_ID) ON DELETE CASCADE,
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL,
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE SET NULL
  )
`);

module.exports = db;