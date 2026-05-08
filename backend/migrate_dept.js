const db = require('./utilities/database');

db.run("ALTER TABLE Department ADD COLUMN Total_Hours_Required INT DEFAULT 144", (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("ℹ️ Total_Hours_Required column already exists.");
    } else {
      console.error("❌ Error adding Total_Hours_Required:", err.message);
    }
  } else {
    console.log("✅ Added Total_Hours_Required column to Department.");
  }
});
