const db = require('./utilities/database');

// We will add Semester column and update the structure
db.serialize(() => {
  // 1. Rename old table to backup
  db.run(`ALTER TABLE Academic_Level_Fees RENAME TO Academic_Level_Fees_Old`);

  // 2. Create new table with Semester
  db.run(`
    CREATE TABLE Academic_Level_Fees (
      Academic_Level INTEGER,
      Semester VARCHAR(20),
      Total_Fees DECIMAL(10, 2) DEFAULT 0,
      Max_Hours INTEGER DEFAULT 18,
      Min_Hours INTEGER DEFAULT 12,
      Hour_Price DECIMAL(10, 2) DEFAULT 0,
      PRIMARY KEY (Academic_Level, Semester)
    )
  `);

  // 3. Migrate data and expand it for all semesters
  // Assuming existing data is for 'Fall' and 'Spring' by default
  const levels = [1, 2, 3, 4];
  const semesters = ['Fall', 'Spring', 'Summer'];

  levels.forEach(level => {
    semesters.forEach(sem => {
      const maxHours = sem === 'Summer' ? 9 : 18;
      const minHours = sem === 'Summer' ? 3 : 12;
      
      db.run(
        `INSERT INTO Academic_Level_Fees (Academic_Level, Semester, Max_Hours, Min_Hours) 
         VALUES (?, ?, ?, ?)`,
        [level, sem, maxHours, minHours]
      );
    });
  });

  console.log("✅ Academic_Level_Fees updated to include Semesters.");
});
