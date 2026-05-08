const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Academic_Level_Fees (
    Academic_Level INTEGER,
    Semester VARCHAR(20),
    Total_Fees DECIMAL(10,2) DEFAULT 0.00,
    Max_Hours INTEGER DEFAULT 18,
    Min_Hours INTEGER DEFAULT 12,
    Hour_Price DECIMAL(10,2) DEFAULT 0.00,
    PRIMARY KEY (Academic_Level, Semester)
  )
`);

module.exports = db;
