const db = require('./database');

const migrate = () => {
  db.serialize(() => {
    console.log('Starting migration...');

    // Update Lecture table
    db.run("ALTER TABLE Lecture ADD COLUMN Start_Time DATETIME", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding Start_Time to Lecture:', err.message);
      } else {
        console.log('Start_Time added to Lecture or already exists');
      }
    });

    db.run("ALTER TABLE Lecture ADD COLUMN End_Time DATETIME", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding End_Time to Lecture:', err.message);
      } else {
        console.log('End_Time added to Lecture or already exists');
      }
    });

    db.run("ALTER TABLE Lecture ADD COLUMN Status TEXT CHECK(Status IN ('open', 'closed')) DEFAULT 'closed'", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding Status to Lecture:', err.message);
      } else {
        console.log('Status added to Lecture or already exists');
      }
    });

    db.run("ALTER TABLE Lecture ADD COLUMN Attendance_Code VARCHAR(20)", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding Attendance_Code to Lecture:', err.message);
      } else {
        console.log('Attendance_Code added to Lecture or already exists');
      }
    });

    // Update Attendance table
    db.run("ALTER TABLE Attendance ADD COLUMN Early_Check BOOLEAN DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding Early_Check to Attendance:', err.message);
      } else {
        console.log('Early_Check added to Attendance or already exists');
      }
    });

    db.run("ALTER TABLE Attendance ADD COLUMN Late_Check BOOLEAN DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding Late_Check to Attendance:', err.message);
      } else {
        console.log('Late_Check added to Attendance or already exists');
      }
    });

    db.run("ALTER TABLE Attendance ADD COLUMN Method TEXT CHECK(Method IN ('nfc', 'manual', 'online'))", (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          // If column exists, we might still need to update the constraint.
          // SQLite doesn't support ALTER TABLE MODIFY. 
          // We'll check if the constraint is old and fix it.
          console.log('Method column already exists. Checking constraint...');
          
          // Re-creating the table with the new constraint is the safest way in SQLite
          db.serialize(() => {
            db.run("CREATE TABLE IF NOT EXISTS Attendance_new (Attendance_ID INTEGER PRIMARY KEY AUTOINCREMENT, User_ID INTEGER NOT NULL, Lec_ID INTEGER NOT NULL, Time DATETIME DEFAULT CURRENT_TIMESTAMP, Early_Check BOOLEAN DEFAULT 0, Late_Check BOOLEAN DEFAULT 0, Method TEXT CHECK(Method IN ('nfc', 'manual', 'online')), FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE, FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE)");
            db.run("INSERT OR IGNORE INTO Attendance_new (Attendance_ID, User_ID, Lec_ID, Time, Early_Check, Late_Check, Method) SELECT Attendance_ID, User_ID, Lec_ID, Time, Early_Check, Late_Check, Method FROM Attendance");
            db.run("DROP TABLE Attendance");
            db.run("ALTER TABLE Attendance_new RENAME TO Attendance");
            db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON Attendance(User_ID, Lec_ID)");
            console.log('Attendance table recreated with updated Method constraint.');
          });
        } else {
          console.error('Error adding Method to Attendance:', err.message);
        }
      } else {
        console.log('Method added to Attendance with new constraint');
      }
    });

    // Add unique index
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON Attendance(User_ID, Lec_ID)", (err) => {
      if (err) {
        console.error('Error creating unique index on Attendance:', err.message);
      } else {
        console.log('Unique index created on Attendance or already exists');
      }
    });

    console.log('Migration finished.');
  });
};

if (require.main === module) {
  migrate();
}

module.exports = migrate;
