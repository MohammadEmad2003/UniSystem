const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Material (
    Material_ID INTEGER NOT NULL,
    Lec_ID INTEGER NOT NULL,
    Name VARCHAR(100) NOT NULL,
    URL VARCHAR(255),
    Document VARCHAR(255),
    Summarize TEXT,
    PRIMARY KEY (Material_ID, Lec_ID),
    FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
  )
`);

module.exports = db;