const db = require('../utilities/database');
 
// Enrollment: Student <-> Class
db.exec(`
  CREATE TABLE IF NOT EXISTS Enrollment (
    Class_ID INTEGER NOT NULL,
    User_ID INTEGER NOT NULL,
    PRIMARY KEY (Class_ID, User_ID),
    FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE
  )
`);
 
// Work In: Doctor <-> Department
db.exec(`
  CREATE TABLE IF NOT EXISTS Work_In (
    Doctor_ID INTEGER NOT NULL,
    Dept_ID INTEGER NOT NULL,
    PRIMARY KEY (Doctor_ID, Dept_ID),
    FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE CASCADE
  )
`);
 
// Offers: Department <-> Courses
db.exec(`
  CREATE TABLE IF NOT EXISTS Offers (
    Course_Code VARCHAR(20) NOT NULL,
    Dept_ID INTEGER NOT NULL,
    PRIMARY KEY (Course_Code, Dept_ID),
    FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
    FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE CASCADE
  )
`);
 
// Recorded Course: Student <-> Courses
db.exec(`
  CREATE TABLE IF NOT EXISTS Recorded_Course (
    User_ID INTEGER NOT NULL,
    Course_Code VARCHAR(20) NOT NULL,
    PRIMARY KEY (User_ID, Course_Code),
    FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
    FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE
  )
`);
 
module.exports = db;