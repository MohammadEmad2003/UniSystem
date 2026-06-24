const sqlite3 = require('@journeyapps/sqlcipher').verbose();
const path = require('path');
const fs = require('fs');

const backendRoot = path.resolve(__dirname, '..');
const dbPath = path.join(backendRoot, 'database.db');
const exportDir = path.join(backendRoot, 'data-export');

// Create export directory
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Tables to export (in dependency order)
const tables = [
  'Department',
  'Academic_Level_Fees',
  'Courses',
  'User',
  'Student',
  'Doctor',
  'Admin',
  'Room',
  'Class',
  'Lecture',
  'Material',
  'Enrollment',
  'Grades',
  'Attendance',
  'Questions',
  'Answers',
  'Notification',
  'User_Notification',
  'Class_Notification',
  'Prerequisite',
  'StudyOutput'
];

db.serialize(() => {
  // Decrypt database
  db.run("PRAGMA key='123456'");
  db.run("PRAGMA cipher_compatibility=4");

  console.log('Starting data export from encrypted SQLite...');

  tables.forEach((table, index) => {
    db.all(`SELECT * FROM ${table}`, (err, rows) => {
      if (err) {
        console.error(`Error exporting ${table}:`, err.message);
        return;
      }

      const filePath = path.join(exportDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
      
      console.log(`✅ Exported ${table}: ${rows.length} rows`);
      
      // Check if all tables are done
      if (index === tables.length - 1) {
        console.log('\n✅ All data exported successfully!');
        console.log(`Export location: ${exportDir}`);
        db.close();
      }
    });
  });
});
