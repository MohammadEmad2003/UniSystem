const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Room (
    Room_ID VARCHAR(50) PRIMARY KEY,
    Room_Name VARCHAR(100) NOT NULL,
    Capacity INTEGER,
    Type VARCHAR(50),
    Location VARCHAR(255)
  )
`);
 
module.exports = db;
