const db = require('../utilities/database');

const NOTIFICATION_TYPES = `
  'new_material', 'new_question', 'new_answer', 'new_grade', 'new_lecture',
  'lecture_started', 'announcement', 'approval', 'enrollment',
  'doctor_question_pending', 'ai_answer_ready', 'doctor_answer_ready'
`;

const CREATE_NOTIFICATION = `
  CREATE TABLE IF NOT EXISTS Notification (
    Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Type TEXT CHECK(Type IN (${NOTIFICATION_TYPES})) NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Message TEXT NOT NULL,
    Reference_ID INTEGER,
    Answer_ID INTEGER,
    Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

db.exec(CREATE_NOTIFICATION);

/** Migrate legacy Notification (User_ID, Class_ID, Is_Read on same row) → M2M junction tables */
function migrateNotificationToManyToMany() {
  db.all(`PRAGMA table_info(Notification)`, (err, cols) => {
    if (err || !cols || !cols.length) return;
    const colNames = cols.map((c) => c.name);
    if (!colNames.includes('User_ID')) return;

    console.log('[DB] Migrating Notification to User_Notification / Class_Notification (M2M)...');

    db.serialize(() => {
      db.run('PRAGMA foreign_keys=OFF');
      db.run('BEGIN TRANSACTION');

      db.run(`ALTER TABLE Notification RENAME TO Notification_old`);

      db.run(`ALTER TABLE Notification_old ADD COLUMN Answer_ID INTEGER`, () => {});
      db.run(`ALTER TABLE Notification_old ADD COLUMN Reference_ID INTEGER`, () => {});

      db.run(`
        CREATE TABLE Notification (
          Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
          Type TEXT NOT NULL,
          Title VARCHAR(255) NOT NULL,
          Message TEXT NOT NULL,
          Reference_ID INTEGER,
          Answer_ID INTEGER,
          Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        INSERT INTO Notification (Notification_ID, Type, Title, Message, Reference_ID, Answer_ID, Created_At)
        SELECT Notification_ID, Type, Title, Message, Reference_ID, Answer_ID, Created_At
        FROM Notification_old
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS User_Notification (
          User_ID INTEGER NOT NULL,
          Notification_ID INTEGER NOT NULL,
          Is_Read BOOLEAN DEFAULT 0,
          PRIMARY KEY (User_ID, Notification_ID),
          FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
          FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
        )
      `);

      db.run(`
        INSERT INTO User_Notification (User_ID, Notification_ID, Is_Read)
        SELECT User_ID, Notification_ID, COALESCE(Is_Read, 0)
        FROM Notification_old
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS Class_Notification (
          Class_ID INTEGER NOT NULL,
          Notification_ID INTEGER NOT NULL,
          PRIMARY KEY (Class_ID, Notification_ID),
          FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
          FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
        )
      `);

      db.run(`
        INSERT OR IGNORE INTO Class_Notification (Class_ID, Notification_ID)
        SELECT Class_ID, Notification_ID
        FROM Notification_old
        WHERE Class_ID IS NOT NULL
      `);

      db.run(`DROP TABLE Notification_old`);

      db.run('COMMIT');
      db.run('PRAGMA foreign_keys=ON');

      db.get(`SELECT MAX(Notification_ID) AS m FROM Notification`, [], (_, r) => {
        const seq = r?.m ?? 0;
        if (seq > 0) {
          db.run(`INSERT OR REPLACE INTO sqlite_sequence(name,seq) VALUES ('Notification', ?)`, [seq]);
        }
      });

      console.log('[DB] Notification M2M migration done.');
    });
  });
}

migrateNotificationToManyToMany();

// Legacy: add Answer_ID if an old DB skipped migration (column-only patch)
db.run(`ALTER TABLE Notification ADD COLUMN Answer_ID INTEGER`, () => {});

module.exports = db;
