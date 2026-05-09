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

// Migrate: add AI-answer columns if they don't exist yet (safe — ignores if already present)
const aiColumns = [
  'ALTER TABLE Answer ADD COLUMN Is_AI_Generated INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE Answer ADD COLUMN Source_Type TEXT',
  'ALTER TABLE Answer ADD COLUMN Source_ID TEXT',
  'ALTER TABLE Answer ADD COLUMN Confidence REAL',
  'ALTER TABLE Answer ADD COLUMN AI_Metadata TEXT',
];
for (const sql of aiColumns) {
  db.run(sql, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('[answerModel] migration error:', err.message);
    }
  });
}

module.exports = db;