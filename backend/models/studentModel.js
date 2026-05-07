const db = require('../utilities/database');
 
db.exec(`
  CREATE TABLE IF NOT EXISTS Student (
    User_ID INTEGER PRIMARY KEY,
    Academic_Level INT,
    Payment_Status TEXT CHECK(Payment_Status IN ('Paid', 'Unpaid', 'Partial')) DEFAULT 'Unpaid',
    Paid_Amount DECIMAL(10,2) DEFAULT 0.00,
    NFC_Tag_ID VARCHAR(50) UNIQUE,
    SSN VARCHAR(20) UNIQUE,
    Dept_ID INTEGER,
    Total_Hours INT DEFAULT 0,
    Total_GPA DECIMAL(4,2) DEFAULT 0.00,
    FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE SET NULL
  )
`);
 
module.exports = db;