const db = require('./utilities/database');

const migrate = () => {
  console.log("🚀 Starting database migration...");

  db.serialize(() => {
    // Add Max_Hours
    db.run("ALTER TABLE Academic_Level_Fees ADD COLUMN Max_Hours INT DEFAULT 18", (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log("ℹ️ Max_Hours column already exists.");
        } else {
          console.error("❌ Error adding Max_Hours:", err.message);
        }
      } else {
        console.log("✅ Added Max_Hours column.");
      }
    });

    // Add Min_Hours
    db.run("ALTER TABLE Academic_Level_Fees ADD COLUMN Min_Hours INT DEFAULT 12", (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log("ℹ️ Min_Hours column already exists.");
        } else {
          console.error("❌ Error adding Min_Hours:", err.message);
        }
      } else {
        console.log("✅ Added Min_Hours column.");
      }
    });

    // Seed some default values for common levels (1-4)
    const levels = [1, 2, 3, 4];
    levels.forEach(level => {
        db.run("INSERT OR IGNORE INTO Academic_Level_Fees (Academic_Level, Total_Fees, Max_Hours, Min_Hours) VALUES (?, 0, 18, 12)", [level]);
    });
    
    console.log("✨ Migration finished.");
  });
};

migrate();
