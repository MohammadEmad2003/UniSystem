const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Courses (
    Course_Code VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Credit_Hours INT NOT NULL
  )
`);
 
module.exports = db;