const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Password VARCHAR(255) NOT NULL,
    F_Name VARCHAR(50) NOT NULL,
    L_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Account_Status TEXT CHECK(Account_Status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending' NOT NULL,
    Role TEXT CHECK(Role IN ('Student', 'Doctor', 'Admin')) NOT NULL,
    Document VARCHAR(255),
    Image_Url VARCHAR(255)
  )
`);
 
module.exports = db;