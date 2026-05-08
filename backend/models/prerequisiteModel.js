const db = require('../utilities/database');

db.exec(`
  CREATE TABLE IF NOT EXISTS Course_Prerequisites (
    Course_Code VARCHAR(20),
    Prereq_Course_Code VARCHAR(20),
    PRIMARY KEY (Course_Code, Prereq_Course_Code),
    FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
    FOREIGN KEY (Prereq_Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE
  )
`);

console.log("✅ Course_Prerequisites table created.");
