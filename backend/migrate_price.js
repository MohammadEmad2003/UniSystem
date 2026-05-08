const db = require('./utilities/database');

db.run("ALTER TABLE Academic_Level_Fees ADD COLUMN Hour_Price DECIMAL(10,2) DEFAULT 0.00", (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("ℹ️ Hour_Price column already exists.");
    } else {
      console.error("❌ Error adding Hour_Price:", err.message);
    }
  } else {
    console.log("✅ Added Hour_Price column to Academic_Level_Fees.");
  }
});
