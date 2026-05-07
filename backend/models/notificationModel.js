const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Notification (
    Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    User_ID INTEGER NOT NULL,
    Type TEXT CHECK(Type IN (
      'new_material', 'new_question', 'new_answer', 'new_grade',
      'announcement', 'approval', 'enrollment',
      'doctor_question_pending', 'ai_answer_ready', 'doctor_answer_ready'
    )) NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    Class_ID INTEGER,
    Reference_ID INTEGER,
    Answer_ID INTEGER,
    Is_Read BOOLEAN DEFAULT 0,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE SET NULL
  )
`);

// Migrate existing databases: add Answer_ID column if missing
db.run(`ALTER TABLE Notification ADD COLUMN Answer_ID INTEGER`, () => {/* ignore if already exists */});

// Migrate existing databases: recreate with new CHECK constraint is not possible in SQLite,
// so we patch by dropping the old constraint via a table rebuild only if needed.
// New rows with new types are inserted safely because SQLite CHECK is NOT enforced
// on older rows and the new table definition above handles fresh databases.
// For existing DBs the old CHECK constraint still applies — work around by using a
// trigger-based approach: disable the constraint by rebuilding the table once.
db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Notification'`, (err, row) => {
  if (err || !row) return;
  // If the old schema doesn't include doctor_question_pending, rebuild the table
  if (!row.sql.includes('doctor_question_pending')) {
    db.serialize(() => {
      db.run(`ALTER TABLE Notification RENAME TO Notification_old`);
      db.run(`
        CREATE TABLE Notification (
          Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
          User_ID INTEGER NOT NULL,
          Type TEXT CHECK(Type IN (
            'new_material', 'new_question', 'new_answer', 'new_grade',
            'announcement', 'approval', 'enrollment',
            'doctor_question_pending', 'ai_answer_ready', 'doctor_answer_ready'
          )) NOT NULL,
          Title VARCHAR(255) NOT NULL,
          Message TEXT NOT NULL,
          Class_ID INTEGER,
          Reference_ID INTEGER,
          Answer_ID INTEGER,
          Is_Read BOOLEAN DEFAULT 0,
          Created_At DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
          FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE SET NULL
        )
      `);
      db.run(`
        INSERT INTO Notification (Notification_ID, User_ID, Type, Title, Message, Class_ID, Reference_ID, Is_Read, Created_At)
        SELECT Notification_ID, User_ID, Type, Title, Message, Class_ID, Reference_ID, Is_Read, Created_At
        FROM Notification_old
      `);
      db.run(`DROP TABLE Notification_old`);
      console.log('[DB] Notification table migrated to support new notification types.');
    });
  }
});

module.exports = db;