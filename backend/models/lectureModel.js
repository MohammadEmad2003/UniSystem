const db = require('../utilities/database');

const LECTURE_CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS Lecture (
    Lec_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title VARCHAR(255),
    Date DATE,
    Day VARCHAR(15),
    Time TIME,
    Room_ID VARCHAR(50),
    Meeting_Link VARCHAR(255),
    Type TEXT CHECK(Type IN ('Lecture', 'Section', 'Lab', 'Online')) NOT NULL,
    Class_ID INTEGER NOT NULL,
    Start_Time DATETIME,
    End_Time DATETIME,
    Attendance_Code VARCHAR(20),
    Status TEXT CHECK(Status IN ('open', 'closed')) DEFAULT 'closed',
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
    FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID) ON DELETE SET NULL
  )
`;

db.exec(LECTURE_CREATE_SQL);

/**
 * Legacy DBs: Lecture existed without Room FK. Rebuild table with FK + VARCHAR(50) Room_ID.
 * Keeps Lec_ID values so Attendance rows stay valid.
 */
function migrateLectureRoomForeignKey() {
  db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Lecture'`, [], (err, row) => {
    if (err || !row?.sql) return;
    if (/\bFOREIGN KEY\s*\(\s*Room_ID\s*\)\s+REFERENCES\s+Room\b.*\bON DELETE SET NULL\b/i.test(row.sql)) return;

    db.serialize(() => {
      db.run('PRAGMA foreign_keys=OFF');
      db.run('BEGIN TRANSACTION');

      db.run(`
        CREATE TABLE Lecture__fk (
          Lec_ID INTEGER PRIMARY KEY AUTOINCREMENT,
          Title VARCHAR(255),
          Date DATE,
          Day VARCHAR(15),
          Time TIME,
          Room_ID VARCHAR(50),
          Meeting_Link VARCHAR(255),
          Type TEXT CHECK(Type IN ('Lecture', 'Section', 'Lab', 'Online')) NOT NULL,
          Class_ID INTEGER NOT NULL,
          Start_Time DATETIME,
          End_Time DATETIME,
          Attendance_Code VARCHAR(20),
          Status TEXT CHECK(Status IN ('open', 'closed')) DEFAULT 'closed',
          FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
          FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID) ON DELETE SET NULL
        )
      `);

      db.run(`
        INSERT INTO Lecture__fk (
          Lec_ID, Title, Date, Day, Time, Room_ID, Meeting_Link, Type, Class_ID,
          Start_Time, End_Time, Attendance_Code, Status
        )
        SELECT 
          Lec_ID, Title, Date, Day, Time,
          CASE 
            WHEN Room_ID IS NULL OR TRIM(Room_ID) = '' THEN NULL 
            WHEN Room_ID NOT IN (SELECT Room_ID FROM Room) THEN NULL
            ELSE TRIM(Room_ID)
          END,
          Meeting_Link, Type, Class_ID,
          Start_Time, End_Time, Attendance_Code, Status
        FROM Lecture
      `);

      db.run(`DROP TABLE Lecture`);
      db.run(`ALTER TABLE Lecture__fk RENAME TO Lecture`);

      db.run('COMMIT');
      db.run('PRAGMA foreign_keys=ON');

      db.get(`SELECT MAX(Lec_ID) AS m FROM Lecture`, [], (_, r) => {
        const seq = r?.m ?? 0;
        if (seq > 0) {
          db.run(`INSERT OR REPLACE INTO sqlite_sequence(name,seq) VALUES ('Lecture', ?)`, [seq]);
        }
      });
    });
  });
}

migrateLectureRoomForeignKey();

module.exports = db;
