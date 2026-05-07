const db = require('./utilities/database');

db.serialize(() => {
  db.run("ALTER TABLE Student ADD COLUMN Paid_Amount DECIMAL(10,2) DEFAULT 0.00", (err) => console.log(err?.message || "Student Paid_Amount added"));
  db.run("ALTER TABLE Doctor ADD COLUMN Permission INT DEFAULT NULL", (err) => console.log(err?.message || "Doctor Permission added"));
  
  db.run(`
    CREATE TABLE IF NOT EXISTS Academic_Level_Fees (
      Academic_Level INT PRIMARY KEY,
      Total_Fees DECIMAL(10,2) DEFAULT 0.00
    )
  `, (err) => console.log(err?.message || "Academic_Level_Fees created"));
});
