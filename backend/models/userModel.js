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

// Add columns if they don't exist
db.run(`ALTER TABLE User ADD COLUMN is_email_verified BOOLEAN DEFAULT 0`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding is_email_verified column:', err);
  }
});

db.run(`ALTER TABLE User ADD COLUMN email_verification_token TEXT DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding email_verification_token column:', err);
  }
});

db.run(`ALTER TABLE User ADD COLUMN email_verification_expires DATETIME DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding email_verification_expires column:', err);
  }
});

db.run(`ALTER TABLE User ADD COLUMN password_reset_token TEXT DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding password_reset_token column:', err);
  }
});

db.run(`ALTER TABLE User ADD COLUMN password_reset_expires DATETIME DEFAULT NULL`, (err) => {
  if (err && !err.message.includes('duplicate column')) {
    console.error('Error adding password_reset_expires column:', err);
  }
});
 
module.exports = db;
