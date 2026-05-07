const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Academic_Level_Fees (
    Academic_Level INT PRIMARY KEY,
    Total_Fees DECIMAL(10,2) DEFAULT 0.00
  )
`);

module.exports = db;
