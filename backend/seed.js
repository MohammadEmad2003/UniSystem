/**
 * SEED SCRIPT — comprehensive test data for the full backend
 *
 * Usage:
 *   node seed.js
 *
 * Seeded:
 *   3 departments, 5 rooms, 3 doctors, 7 students, 2 admins
 *   8 courses + prerequisites, 6 classes, enrollments
 *   20 lectures (mix of scheduled / open / closed, all 4 types)
 *   materials, attendance (Early_Check / Late_Check / Method),
 *   grades, Q&A questions + answers, notifications
 *
 * All passwords: password123
 */

require("dotenv").config();
const sqlite3 = require("@journeyapps/sqlcipher").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

// ─── DB CONNECTION ────────────────────────────────────────────────────────────
const backendRoot = path.resolve(__dirname);
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(backendRoot, process.env.DATABASE_PATH)
  : path.join(backendRoot, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error("❌ DB open error:", err.message); process.exit(1); }
  console.log("✅ DB opened:", dbPath);
});

db.serialize(() => {
  db.run("PRAGMA key='123456'");
  db.run("PRAGMA cipher_compatibility=4");
  db.run("PRAGMA foreign_keys = ON");
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const run = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    })
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    })
  );

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    })
  );

// Insert OR IGNORE and return the row's ID either from lastID or a lookup
const upsertUser = async (email, insertSql, insertParams) => {
  const res = await run(insertSql, insertParams);
  if (res.lastID) return res.lastID;
  return (await get(`SELECT User_ID FROM User WHERE Email = ?`, [email]))?.User_ID;
};

async function dropAllTables() {
  console.log("🗑️ Dropping all tables...");
  await run("PRAGMA foreign_keys = OFF");
  const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  for (const table of tables) {
    await run(`DROP TABLE IF EXISTS "${table.name}"`);
  }
  await run("PRAGMA foreign_keys = ON");
  console.log("✅ Tables dropped.\n");
}

// ─── ENSURE TABLES EXIST (seed runs standalone — models may not be loaded) ───
async function ensureTables() {
  if (process.argv.includes("--replace")) {
    await dropAllTables();
  }
  const stmts = [
    `CREATE TABLE IF NOT EXISTS Department (
      Dept_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Dept_Name VARCHAR(100) UNIQUE NOT NULL,
      Doctor_ID INTEGER,
      Total_Hours_Required INT DEFAULT 144,
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Room (
      Room_ID VARCHAR(50) PRIMARY KEY,
      Room_Name VARCHAR(100) NOT NULL,
      Capacity INTEGER,
      Type VARCHAR(50),
      Location VARCHAR(255)
    )`,
    `CREATE TABLE IF NOT EXISTS User (
      User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Password VARCHAR(255) NOT NULL,
      F_Name VARCHAR(50) NOT NULL,
      L_Name VARCHAR(50) NOT NULL,
      Email VARCHAR(100) UNIQUE NOT NULL,
      Account_Status TEXT CHECK(Account_Status IN ('pending','approved','rejected','suspended')) DEFAULT 'pending' NOT NULL,
      Role TEXT CHECK(Role IN ('Student','Doctor','Admin')) NOT NULL,
      Document VARCHAR(255),
      Image_Url VARCHAR(255),
      is_email_verified BOOLEAN DEFAULT 0,
      email_verification_token TEXT DEFAULT NULL,
      email_verification_expires DATETIME DEFAULT NULL,
      password_reset_token TEXT DEFAULT NULL,
      password_reset_expires DATETIME DEFAULT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Admin (
      User_ID INTEGER PRIMARY KEY,
      Permissions_Level INT DEFAULT 1,
      FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Doctor (
      User_ID INTEGER PRIMARY KEY,
      Specialization VARCHAR(100),
      Permission INT DEFAULT NULL,
      FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Student (
      User_ID INTEGER PRIMARY KEY,
      Academic_Level INTEGER,
      Semester VARCHAR(20),
      Payment_Status TEXT CHECK(Payment_Status IN ('Paid','Unpaid','Partial')) DEFAULT 'Unpaid',
      Paid_Amount DECIMAL(10,2) DEFAULT 0.00,
      NFC_Tag_ID VARCHAR(50) UNIQUE,
      SSN VARCHAR(20) UNIQUE,
      Dept_ID INTEGER,
      Total_Hours INT DEFAULT 0,
      Total_GPA DECIMAL(4,2) DEFAULT 0.00,
      FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE SET NULL,
      FOREIGN KEY (Academic_Level, Semester) REFERENCES Academic_Level_Fees(Academic_Level, Semester) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Academic_Level_Fees (
      Academic_Level INTEGER,
      Semester VARCHAR(20),
      Total_Fees DECIMAL(10,2) DEFAULT 0.00,
      Max_Hours INTEGER DEFAULT 18,
      Min_Hours INTEGER DEFAULT 12,
      Hour_Price DECIMAL(10,2) DEFAULT 0.00,
      PRIMARY KEY (Academic_Level, Semester)
    )`,
    `CREATE TABLE IF NOT EXISTS Courses (
      Course_Code VARCHAR(20) PRIMARY KEY,
      Name VARCHAR(100) NOT NULL,
      Credit_Hours INT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Course_Prerequisites (
      Course_Code VARCHAR(20),
      Prereq_Course_Code VARCHAR(20),
      PRIMARY KEY (Course_Code, Prereq_Course_Code),
      FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
      FOREIGN KEY (Prereq_Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Offers (
      Course_Code VARCHAR(20) NOT NULL,
      Dept_ID INTEGER NOT NULL,
      PRIMARY KEY (Course_Code, Dept_ID),
      FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
      FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Work_In (
      Doctor_ID INTEGER NOT NULL,
      Dept_ID INTEGER NOT NULL,
      PRIMARY KEY (Doctor_ID, Dept_ID),
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Class (
      Class_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Level INTEGER NOT NULL,
      Semester VARCHAR(20) NOT NULL,
      Course_Code VARCHAR(20) NOT NULL,
      Doctor_ID INTEGER NOT NULL,
      Capacity INT NOT NULL,
      FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE,
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Level, Semester) REFERENCES Academic_Level_Fees(Academic_Level, Semester) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Enrollment (
      Class_ID INTEGER NOT NULL,
      User_ID INTEGER NOT NULL,
      PRIMARY KEY (Class_ID, User_ID),
      FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Recorded_Course (
      User_ID INTEGER NOT NULL,
      Course_Code VARCHAR(20) NOT NULL,
      PRIMARY KEY (User_ID, Course_Code),
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Course_Code) REFERENCES Courses(Course_Code) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Lecture (
      Lec_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Title VARCHAR(255),
      Date DATE,
      Day VARCHAR(15),
      Time TIME,
      Room_ID VARCHAR(50),
      Meeting_Link VARCHAR(255),
      Type TEXT CHECK(Type IN ('Lecture','Section','Lab','Online')) NOT NULL,
      Class_ID INTEGER NOT NULL,
      Start_Time DATETIME,
      End_Time DATETIME,
      Attendance_Code VARCHAR(20),
      Status TEXT CHECK(Status IN ('open','closed')) DEFAULT 'closed',
      FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
      FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID) ON DELETE RESTRICT
    )`,
    `CREATE TABLE IF NOT EXISTS Material (
      Material_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Lec_ID INTEGER NOT NULL,
      Name VARCHAR(100) NOT NULL,
      URL VARCHAR(255),
      Document VARCHAR(255),
      Summarize TEXT,
      Type TEXT,
      Uploaded_At DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Attendance (
      Attendance_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      User_ID INTEGER NOT NULL,
      Lec_ID INTEGER NOT NULL,
      Time DATETIME DEFAULT CURRENT_TIMESTAMP,
      Early_Check BOOLEAN DEFAULT 0,
      Late_Check BOOLEAN DEFAULT 0,
      Method TEXT CHECK(Method IN ('nfc','manual','online')),
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Lec_ID) REFERENCES Lecture(Lec_ID) ON DELETE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON Attendance(User_ID, Lec_ID)`,
    `CREATE TABLE IF NOT EXISTS Grades (
      Grade_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Generate_At DATETIME DEFAULT CURRENT_TIMESTAMP,
      Attendance DECIMAL(5,2) DEFAULT 0,
      Practical DECIMAL(5,2) DEFAULT 0,
      Project DECIMAL(5,2) DEFAULT 0,
      Midterm DECIMAL(5,2) DEFAULT 0,
      Final DECIMAL(5,2) DEFAULT 0,
      GPA DECIMAL(4,2) DEFAULT 0,
      User_ID INTEGER NOT NULL,
      Class_ID INTEGER NOT NULL,
      Doctor_ID INTEGER NOT NULL,
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Questions (
      Questions_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Text TEXT NOT NULL,
      User_ID INTEGER,
      Class_ID INTEGER NOT NULL,
      Doctor_ID INTEGER,
      Time DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Answer (
      Answer_ID INTEGER NOT NULL,
      Questions_ID INTEGER NOT NULL,
      Text TEXT NOT NULL,
      Time DATETIME DEFAULT CURRENT_TIMESTAMP,
      Doctor_ID INTEGER,
      User_ID INTEGER,
      Is_AI_Generated INTEGER NOT NULL DEFAULT 0,
      Source_Type TEXT,
      Source_ID TEXT,
      Confidence REAL,
      AI_Metadata TEXT,
      PRIMARY KEY (Answer_ID, Questions_ID),
      FOREIGN KEY (Questions_ID) REFERENCES Questions(Questions_ID) ON DELETE CASCADE,
      FOREIGN KEY (Doctor_ID) REFERENCES Doctor(User_ID) ON DELETE SET NULL,
      FOREIGN KEY (User_ID) REFERENCES Student(User_ID) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Notification (
      Notification_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Type TEXT CHECK(Type IN (
        'new_material','new_question','new_answer','new_grade','new_lecture','lecture_started',
        'announcement','approval','enrollment',
        'doctor_question_pending','ai_answer_ready','doctor_answer_ready'
      )) NOT NULL,
      Title VARCHAR(255) NOT NULL,
      Message TEXT NOT NULL,
      Reference_ID INTEGER,
      Answer_ID INTEGER,
      Created_At DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS User_Notification (
      User_ID INTEGER NOT NULL,
      Notification_ID INTEGER NOT NULL,
      Is_Read BOOLEAN DEFAULT 0,
      PRIMARY KEY (User_ID, Notification_ID),
      FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
      FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Class_Notification (
      Class_ID INTEGER NOT NULL,
      Notification_ID INTEGER NOT NULL,
      PRIMARY KEY (Class_ID, Notification_ID),
      FOREIGN KEY (Class_ID) REFERENCES Class(Class_ID) ON DELETE CASCADE,
      FOREIGN KEY (Notification_ID) REFERENCES Notification(Notification_ID) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS StudyOutput (
      Output_ID    INTEGER PRIMARY KEY AUTOINCREMENT,
      Class_ID     INTEGER NOT NULL,
      Material_ID  INTEGER NOT NULL,
      User_ID      INTEGER NOT NULL,
      Tool_Type    TEXT    NOT NULL,
      Options_Key  TEXT    NOT NULL,
      Options_JSON TEXT    NOT NULL,
      Content_JSON TEXT    NOT NULL,
      Created_At   DATETIME DEFAULT CURRENT_TIMESTAMP,
      Updated_At   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Class_ID)    REFERENCES Class(Class_ID)       ON DELETE CASCADE,
      FOREIGN KEY (Material_ID) REFERENCES Material(Material_ID) ON DELETE CASCADE,
      FOREIGN KEY (User_ID)     REFERENCES User(User_ID)         ON DELETE CASCADE,
      UNIQUE (Class_ID, Material_ID, User_ID, Tool_Type, Options_Key)
    )`,
  ];

  for (const stmt of stmts) {
    await run(stmt);
  }
  console.log("✅ Tables ready.\n");
}

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    console.log("\n🌱 Starting full seed...\n");
    await ensureTables();

    const pw = await bcrypt.hash("password123", 10);
    const now = new Date().toISOString();

    // ── 1. DEPARTMENTS ────────────────────────────────────────────────────────
    console.log("📁 Departments...");
    await run(`INSERT OR IGNORE INTO Department (Dept_ID, Dept_Name, Total_Hours_Required) VALUES (1, 'Computer Science', 144)`);
    await run(`INSERT OR IGNORE INTO Department (Dept_ID, Dept_Name, Total_Hours_Required) VALUES (2, 'Information Systems', 132)`);
    await run(`INSERT OR IGNORE INTO Department (Dept_ID, Dept_Name, Total_Hours_Required) VALUES (3, 'Information Technology', 138)`);

    // ── 2. ROOMS ──────────────────────────────────────────────────────────────
    console.log("🚪 Rooms...");
    await run(`INSERT OR IGNORE INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES ('H1-101', 'Hall A — 101', 60, 'Lecture', 'Building H1, Floor 1')`);
    await run(`INSERT OR IGNORE INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES ('H1-102', 'Hall A — 102', 60, 'Lecture', 'Building H1, Floor 1')`);
    await run(`INSERT OR IGNORE INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES ('H2-201', 'Hall B — 201', 40, 'Section', 'Building H2, Floor 2')`);
    await run(`INSERT OR IGNORE INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES ('LAB-1',  'Computer Lab 1',  30, 'Lab',     'Building H3, Floor 1')`);
    await run(`INSERT OR IGNORE INTO Room (Room_ID, Room_Name, Capacity, Type, Location) VALUES ('LAB-2',  'Computer Lab 2',  30, 'Lab',     'Building H3, Floor 1')`);

    // ── 3. USERS — Admins ─────────────────────────────────────────────────────
    console.log("👤 Users — admins...");

    const adminId = await upsertUser(
      "admin@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Ahmed', 'Admin', 'admin@unisystem.test', ?, 'Admin', 'approved', 1)`,
      [pw]
    );
    const affairsId = await upsertUser(
      "affairs@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Laila', 'Affairs', 'affairs@unisystem.test', ?, 'Admin', 'approved', 1)`,
      [pw]
    );

    await run(`INSERT OR IGNORE INTO Admin (User_ID, Permissions_Level) VALUES (?, 1)`, [adminId]);
    await run(`INSERT OR IGNORE INTO Admin (User_ID, Permissions_Level) VALUES (?, 2)`, [affairsId]);

    // ── 4. USERS — Doctors ────────────────────────────────────────────────────
    console.log("👤 Users — doctors...");

    const doc1Id = await upsertUser(
      "mohamed.hassan@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Mohamed', 'Hassan', 'mohamed.hassan@unisystem.test', ?, 'Doctor', 'approved', 1)`,
      [pw]
    );
    const doc2Id = await upsertUser(
      "sara.ali@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Sara', 'Ali', 'sara.ali@unisystem.test', ?, 'Doctor', 'approved', 1)`,
      [pw]
    );
    const doc3Id = await upsertUser(
      "khaled.ibrahim@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Khaled', 'Ibrahim', 'khaled.ibrahim@unisystem.test', ?, 'Doctor', 'approved', 1)`,
      [pw]
    );

    await run(`INSERT OR IGNORE INTO Doctor (User_ID, Specialization) VALUES (?, 'Algorithms & Data Structures')`, [doc1Id]);
    await run(`INSERT OR IGNORE INTO Doctor (User_ID, Specialization) VALUES (?, 'Database Systems')`, [doc2Id]);
    await run(`INSERT OR IGNORE INTO Doctor (User_ID, Specialization) VALUES (?, 'Networks & Security')`, [doc3Id]);

    // Assign heads and work-in
    await run(`UPDATE Department SET Doctor_ID = ? WHERE Dept_ID = 1`, [doc1Id]);
    await run(`UPDATE Department SET Doctor_ID = ? WHERE Dept_ID = 2`, [doc2Id]);
    await run(`UPDATE Department SET Doctor_ID = ? WHERE Dept_ID = 3`, [doc3Id]);

    await run(`INSERT OR IGNORE INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, 1)`, [doc1Id]);
    await run(`INSERT OR IGNORE INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, 2)`, [doc2Id]);
    await run(`INSERT OR IGNORE INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, 3)`, [doc3Id]);

    // ── 5. ACADEMIC LEVEL FEES ────────────────────────────────────────────────
    console.log("💰 Academic Level Fees...");
    const semesters = ['Fall', 'Spring', 'Summer'];
    const feesData = [
      [1, 10000, 18, 12, 600],
      [2, 12000, 18, 12, 700],
      [3, 14000, 21, 15, 750],
      [4, 16000, 21, 15, 800],
    ];
    for (const [level, total, maxH, minH, hourPrice] of feesData) {
      for (const sem of semesters) {
        await run(
          `INSERT OR IGNORE INTO Academic_Level_Fees (Academic_Level, Semester, Total_Fees, Max_Hours, Min_Hours, Hour_Price) VALUES (?, ?, ?, ?, ?, ?)`,
          [level, sem, total, maxH, minH, hourPrice]
        );
      }
    }

    // ── 6. USERS — Students ───────────────────────────────────────────────────
    console.log("👤 Users — students...");

    const stu1Id = await upsertUser(
      "omar.khaled@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Omar', 'Khaled', 'omar.khaled@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu2Id = await upsertUser(
      "nour.sayed@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Nour', 'Sayed', 'nour.sayed@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu3Id = await upsertUser(
      "ali.mahmoud@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Ali', 'Mahmoud', 'ali.mahmoud@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu4Id = await upsertUser(
      "layla.ahmed@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Layla', 'Ahmed', 'layla.ahmed@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu5Id = await upsertUser(
      "hassan.mostafa@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Hassan', 'Mostafa', 'hassan.mostafa@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu6Id = await upsertUser(
      "mariam.tarek@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Mariam', 'Tarek', 'mariam.tarek@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    const stu7Id = await upsertUser(
      "youssef.ibrahim@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Youssef', 'Ibrahim', 'youssef.ibrahim@unisystem.test', ?, 'Student', 'pending', 1)`,
      [pw]
    );

    // Student rows — NFC tags assigned to approved students
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 2, 'Spring', 'Unpaid',  0,    'AA:BB:CC:01', '12345678901234', 1, 60,  3.5)`, [stu1Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 1, 'Spring', 'Paid',    6000, 'AA:BB:CC:02', '98765432109876', 1, 30,  3.2)`, [stu2Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 2, 'Spring', 'Partial', 5000, 'AA:BB:CC:03', '11122233344455', 2, 60,  2.9)`, [stu3Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 1, 'Spring', 'Unpaid',  0,    'AA:BB:CC:04', '22233344455566', 2, 0,   0.0)`, [stu4Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 3, 'Spring', 'Paid',   10000, 'AA:BB:CC:05', '33344455566677', 3, 90,  3.7)`, [stu5Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 2, 'Spring', 'Paid',    8000, 'AA:BB:CC:06', '44455566677788', 1, 60,  3.8)`, [stu6Id]);
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount,             SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 1, 'Spring', 'Unpaid',  0,               '55566677788899', 3, 0,   0.0)`, [stu7Id]);


    // ── 7. COURSES ────────────────────────────────────────────────────────────
    console.log("📚 Courses...");
    const courses = [
      ['CS101', 'Introduction to Programming',  3],
      ['CS201', 'Data Structures',               3],
      ['CS301', 'Analysis of Algorithms',        3],
      ['CS401', 'Operating Systems',             3],
      ['IS101', 'Database Fundamentals',         3],
      ['IS201', 'Advanced Database Systems',     3],
      ['IT101', 'Computer Networks',             3],
      ['IT201', 'Network Security',              3],
    ];
    for (const [code, name, hours] of courses) {
      await run(`INSERT OR IGNORE INTO Courses (Course_Code, Name, Credit_Hours) VALUES (?, ?, ?)`, [code, name, hours]);
    }

    // Offers: which dept offers which course
    const offers = [
      ['CS101', 1], ['CS201', 1], ['CS301', 1], ['CS401', 1],
      ['IS101', 2], ['IS201', 2],
      ['IT101', 3], ['IT201', 3],
    ];
    for (const [code, dept] of offers) {
      await run(`INSERT OR IGNORE INTO Offers (Course_Code, Dept_ID) VALUES (?, ?)`, [code, dept]);
    }

    // Prerequisites
    console.log("🔗 Course prerequisites...");
    await run(`INSERT OR IGNORE INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES ('CS201', 'CS101')`);
    await run(`INSERT OR IGNORE INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES ('CS301', 'CS201')`);
    await run(`INSERT OR IGNORE INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES ('CS401', 'CS301')`);
    await run(`INSERT OR IGNORE INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES ('IS201', 'IS101')`);
    await run(`INSERT OR IGNORE INTO Course_Prerequisites (Course_Code, Prereq_Course_Code) VALUES ('IT201', 'IT101')`);

    // ── 8. CLASSES ────────────────────────────────────────────────────────────
    console.log("🏫 Classes...");
    const getOrCreateClass = async (courseCode, doctorId, semester, level, capacity) => {
      const existing = await get(
        `SELECT Class_ID FROM Class WHERE Course_Code = ? AND Doctor_ID = ? AND Semester = ?`,
        [courseCode, doctorId, semester]
      );
      if (existing) return existing.Class_ID;
      const r = await run(
        `INSERT INTO Class (Course_Code, Doctor_ID, Semester, Level, Capacity) VALUES (?, ?, ?, ?, ?)`,
        [courseCode, doctorId, semester, level, capacity]
      );
      return r.lastID;
    };

    const cls1Id = await getOrCreateClass('CS201', doc1Id, 'Fall', 2, 35); // Data Structures
    const cls2Id = await getOrCreateClass('CS301', doc1Id, 'Fall', 3, 30); // Algorithms
    const cls3Id = await getOrCreateClass('IS101', doc2Id, 'Fall', 1, 40); // DB Fundamentals
    const cls4Id = await getOrCreateClass('IS201', doc2Id, 'Fall', 2, 30); // Advanced DB
    const cls5Id = await getOrCreateClass('IT101', doc3Id, 'Fall', 1, 35); // Computer Networks
    const cls6Id = await getOrCreateClass('CS101', doc1Id, 'Fall', 1, 50); // Intro Programming

    // ── 9. ENROLLMENT ─────────────────────────────────────────────────────────
    console.log("📋 Enrollments...");
    const enrollments = [
      // Class 1: Data Structures — Level 2 students
      [cls1Id, stu1Id], [cls1Id, stu3Id], [cls1Id, stu6Id],
      // Class 2: Algorithms — Level 3 students
      [cls2Id, stu5Id],
      // Class 3: DB Fundamentals — Level 1 students
      [cls3Id, stu2Id], [cls3Id, stu4Id],
      // Class 4: Advanced DB — Level 2 students
      [cls4Id, stu1Id], [cls4Id, stu3Id],
      // Class 5: Computer Networks — Level 1 + 3
      [cls5Id, stu2Id], [cls5Id, stu5Id],
      // Class 6: Intro Programming — Level 1
      [cls6Id, stu2Id], [cls6Id, stu4Id],
    ];
    for (const [cId, sId] of enrollments) {
      await run(`INSERT OR IGNORE INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`, [cId, sId]);
    }

    // ── 10. LECTURES ──────────────────────────────────────────────────────────
    console.log("📖 Lectures...");

    // Helper: always insert (seed runs fresh or idempotent by checking absence)
    const insertLec = async (title, date, day, time, type, classId, opts = {}) => {
      const existing = await get(
        `SELECT Lec_ID FROM Lecture WHERE Title = ? AND Class_ID = ?`,
        [title, classId]
      );
      if (existing) return existing.Lec_ID;
      const r = await run(
        `INSERT INTO Lecture (Title, Date, Day, Time, Type, Class_ID, Room_ID, Meeting_Link, Status, Start_Time, End_Time, Attendance_Code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, date, day, time, type, classId,
          opts.roomId   ?? null,
          opts.meetLink ?? null,
          opts.status   ?? 'closed',
          opts.startTime ?? null,
          opts.endTime   ?? null,
          opts.code      ?? null,
        ]
      );
      return r.lastID;
    };

    // CLASS 1 — Data Structures (offline, Room H1-101)
    const lec1  = await insertLec('Intro & Complexity',       '2025-09-14', 'Sunday',    '09:00', 'Lecture', cls1Id, { roomId: 'H1-101', status: 'closed', startTime: '2025-09-14T09:00:00.000Z', endTime: '2025-09-14T10:30:00.000Z' });
    const lec2  = await insertLec('Arrays & Linked Lists',    '2025-09-21', 'Sunday',    '09:00', 'Lecture', cls1Id, { roomId: 'H1-101', status: 'closed', startTime: '2025-09-21T09:00:00.000Z', endTime: '2025-09-21T10:30:00.000Z' });
    const lec3  = await insertLec('Stacks & Queues',          '2025-09-28', 'Sunday',    '09:00', 'Lecture', cls1Id, { roomId: 'H1-101', status: 'open',   startTime: '2025-09-28T09:00:00.000Z' });
    const lec4  = await insertLec('DS Lab — Arrays',          '2025-09-16', 'Tuesday',   '11:00', 'Lab',     cls1Id, { roomId: 'LAB-1',  status: 'closed', startTime: '2025-09-16T11:00:00.000Z', endTime: '2025-09-16T12:30:00.000Z' });
    const lec5  = await insertLec('DS Online Review',         '2025-09-25', 'Wednesday', '18:00', 'Online',  cls1Id, { meetLink: 'https://meet.example.com/ds-review', status: 'closed', startTime: '2025-09-25T18:00:00.000Z', endTime: '2025-09-25T19:00:00.000Z', code: 'DS1234' });

    // CLASS 2 — Algorithms
    const lec6  = await insertLec('Divide & Conquer',         '2025-09-15', 'Monday',    '11:00', 'Lecture', cls2Id, { roomId: 'H1-102', status: 'closed', startTime: '2025-09-15T11:00:00.000Z', endTime: '2025-09-15T12:30:00.000Z' });
    const lec7  = await insertLec('Dynamic Programming',      '2025-09-22', 'Monday',    '11:00', 'Lecture', cls2Id, { roomId: 'H1-102', status: 'open',   startTime: '2025-09-22T11:00:00.000Z' });
    const lec8  = await insertLec('Graph Algorithms',         '2025-10-06', 'Monday',    '11:00', 'Lecture', cls2Id, { roomId: 'H1-102', status: 'closed' });

    // CLASS 3 — Database Fundamentals
    const lec9  = await insertLec('Relational Model',         '2025-09-14', 'Sunday',    '12:00', 'Lecture', cls3Id, { roomId: 'H2-201', status: 'closed', startTime: '2025-09-14T12:00:00.000Z', endTime: '2025-09-14T13:30:00.000Z' });
    const lec10 = await insertLec('SQL Basics',               '2025-09-21', 'Sunday',    '12:00', 'Lecture', cls3Id, { roomId: 'H2-201', status: 'closed', startTime: '2025-09-21T12:00:00.000Z', endTime: '2025-09-21T13:30:00.000Z' });
    const lec11 = await insertLec('SQL Lab 1',                '2025-09-18', 'Thursday',  '10:00', 'Lab',     cls3Id, { roomId: 'LAB-2',  status: 'open',   startTime: '2025-09-18T10:00:00.000Z' });
    const lec12 = await insertLec('DB Online Session',        '2025-09-20', 'Saturday',  '17:00', 'Online',  cls3Id, { meetLink: 'https://meet.example.com/db-online', status: 'closed', startTime: '2025-09-20T17:00:00.000Z', endTime: '2025-09-20T18:00:00.000Z', code: 'DB9876' });

    // CLASS 4 — Advanced DB
    const lec13 = await insertLec('Normalization',            '2025-09-15', 'Monday',    '13:00', 'Lecture', cls4Id, { roomId: 'H2-201', status: 'closed', startTime: '2025-09-15T13:00:00.000Z', endTime: '2025-09-15T14:30:00.000Z' });
    const lec14 = await insertLec('Transactions & ACID',      '2025-09-22', 'Monday',    '13:00', 'Lecture', cls4Id, { roomId: 'H2-201', status: 'closed' });

    // CLASS 5 — Computer Networks
    const lec15 = await insertLec('OSI Model',                '2025-09-14', 'Sunday',    '14:00', 'Lecture', cls5Id, { roomId: 'H1-101', status: 'closed', startTime: '2025-09-14T14:00:00.000Z', endTime: '2025-09-14T15:30:00.000Z' });
    const lec16 = await insertLec('TCP/IP Stack',             '2025-09-21', 'Sunday',    '14:00', 'Lecture', cls5Id, { roomId: 'H1-101', status: 'open',   startTime: '2025-09-21T14:00:00.000Z' });
    const lec17 = await insertLec('Networking Lab',           '2025-09-17', 'Wednesday', '09:00', 'Lab',     cls5Id, { roomId: 'LAB-1',  status: 'closed', startTime: '2025-09-17T09:00:00.000Z', endTime: '2025-09-17T10:30:00.000Z' });

    // CLASS 6 — Intro Programming (section)
    const lec18 = await insertLec('Variables & Data Types',   '2025-09-14', 'Sunday',    '10:00', 'Lecture', cls6Id, { roomId: 'H1-102', status: 'closed', startTime: '2025-09-14T10:00:00.000Z', endTime: '2025-09-14T11:30:00.000Z' });
    const lec19 = await insertLec('Control Flow',             '2025-09-21', 'Sunday',    '10:00', 'Lecture', cls6Id, { roomId: 'H1-102', status: 'closed', startTime: '2025-09-21T10:00:00.000Z', endTime: '2025-09-21T11:30:00.000Z' });
    const lec20 = await insertLec('Functions & Scope',        '2025-09-28', 'Sunday',    '10:00', 'Lecture', cls6Id, { roomId: 'H1-102', status: 'closed' });

    // ── 11. MATERIALS ─────────────────────────────────────────────────────────
    console.log("📄 Materials...");
    const insertMat = async (lecId, name, url, type) => {
      const ex = await get(`SELECT Material_ID FROM Material WHERE Lec_ID = ? AND Name = ?`, [lecId, name]);
      if (ex) return;
      await run(
        `INSERT INTO Material (Lec_ID, Name, URL, Type) VALUES (?, ?, ?, ?)`,
        [lecId, name, url, type]
      );
    };

    await insertMat(lec1,  'Intro & Complexity Slides',         'https://files.example.com/ds-lec1.pdf',   'pdf');
    await insertMat(lec1,  'Big-O Cheatsheet',                  'https://files.example.com/bigo.pdf',      'pdf');
    await insertMat(lec2,  'Arrays & Linked Lists Notes',       'https://files.example.com/ds-lec2.pdf',   'pdf');
    await insertMat(lec3,  'Stacks & Queues Slides',            'https://files.example.com/ds-lec3.pdf',   'pdf');
    await insertMat(lec5,  'Online Review Recording',           'https://files.example.com/ds-review.mp4', 'video');
    await insertMat(lec6,  'Divide & Conquer Slides',           'https://files.example.com/algo-lec1.pdf', 'pdf');
    await insertMat(lec7,  'Dynamic Programming Guide',         'https://files.example.com/dp-guide.pdf',  'pdf');
    await insertMat(lec9,  'Relational Model Reference',        'https://files.example.com/db-lec1.pdf',   'pdf');
    await insertMat(lec10, 'SQL Cheatsheet',                    'https://files.example.com/sql-sheet.pdf', 'pdf');
    await insertMat(lec15, 'OSI Model Poster',                  'https://files.example.com/osi.pdf',       'pdf');
    await insertMat(lec18, 'Python Basics Reference',           'https://files.example.com/py-basics.pdf', 'pdf');

    // ── 12. ATTENDANCE ────────────────────────────────────────────────────────
    // Schema: User_ID, Lec_ID, Time, Early_Check, Late_Check, Method
    console.log("✅ Attendance...");
    const attend = async (userId, lecId, earlyCheck, lateCheck, method, time) => {
      await run(
        `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Time, Early_Check, Late_Check, Method) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, lecId, time, earlyCheck ? 1 : 0, lateCheck ? 1 : 0, method]
      );
    };

    // Lecture 1 — intro, all 3 enrolled students attended early
    await attend(stu1Id, lec1, true,  false, 'nfc',    '2025-09-14T09:05:00.000Z');
    await attend(stu3Id, lec1, true,  false, 'nfc',    '2025-09-14T09:08:00.000Z');
    await attend(stu6Id, lec1, false, false, 'manual', '2025-09-14T09:20:00.000Z');
    // Lecture 1 late sign-outs
    await attend(stu1Id, lec1, true,  true,  'nfc',    '2025-09-14T10:45:00.000Z'); // update: upsert won't run due to unique idx — sign-out is an update in real flow

    // Lecture 2
    await attend(stu1Id, lec2, true,  false, 'nfc',    '2025-09-21T09:03:00.000Z');
    await attend(stu6Id, lec2, true,  false, 'nfc',    '2025-09-21T09:07:00.000Z');
    // stu3 absent from lec2 — no record

    // Lecture 3 — currently open (live)
    await attend(stu1Id, lec3, true,  false, 'nfc',    now);
    await attend(stu3Id, lec3, false, false, 'manual', now);

    // Lecture 4 — Lab
    await attend(stu1Id, lec4, true,  false, 'nfc',    '2025-09-16T11:02:00.000Z');
    await attend(stu3Id, lec4, true,  false, 'nfc',    '2025-09-16T11:10:00.000Z');
    await attend(stu6Id, lec4, false, true,  'nfc',    '2025-09-16T12:25:00.000Z');

    // Lecture 5 — Online
    await attend(stu1Id, lec5, true,  false, 'online', '2025-09-25T18:02:00.000Z');
    await attend(stu6Id, lec5, false, false, 'online', '2025-09-25T18:30:00.000Z');

    // Algorithms
    await attend(stu5Id, lec6, true,  false, 'nfc',    '2025-09-15T11:01:00.000Z');
    await attend(stu5Id, lec7, true,  false, 'nfc',    now); // live lecture

    // DB Fundamentals
    await attend(stu2Id, lec9,  true, false, 'nfc',    '2025-09-14T12:04:00.000Z');
    await attend(stu4Id, lec9,  true, false, 'nfc',    '2025-09-14T12:06:00.000Z');
    await attend(stu2Id, lec10, true, false, 'nfc',    '2025-09-21T12:01:00.000Z');
    await attend(stu2Id, lec11, true, false, 'nfc',    now); // open lab
    await attend(stu2Id, lec12, true, false, 'online', '2025-09-20T17:03:00.000Z');

    // Advanced DB
    await attend(stu1Id, lec13, true,  false, 'nfc',   '2025-09-15T13:05:00.000Z');
    await attend(stu3Id, lec13, false, false, 'manual','2025-09-15T13:20:00.000Z');

    // Networks
    await attend(stu2Id, lec15, true,  false, 'nfc',   '2025-09-14T14:02:00.000Z');
    await attend(stu5Id, lec15, true,  false, 'nfc',   '2025-09-14T14:03:00.000Z');
    await attend(stu5Id, lec16, true,  false, 'nfc',   now); // open lecture
    await attend(stu2Id, lec17, true,  false, 'nfc',   '2025-09-17T09:05:00.000Z');
    await attend(stu5Id, lec17, false, true,  'nfc',   '2025-09-17T10:32:00.000Z');

    // Intro Programming
    await attend(stu2Id, lec18, true,  false, 'nfc',   '2025-09-14T10:02:00.000Z');
    await attend(stu4Id, lec18, false, false, 'manual','2025-09-14T10:25:00.000Z');
    await attend(stu2Id, lec19, true,  false, 'nfc',   '2025-09-21T10:04:00.000Z');

    // ── 13. GRADES ────────────────────────────────────────────────────────────
    console.log("📊 Grades...");
    const insertGrade = async (userId, classId, doctorId, mid, proj, prac, att, final, gpa) => {
      const ex = await get(`SELECT Grade_ID FROM Grades WHERE User_ID = ? AND Class_ID = ?`, [userId, classId]);
      if (ex) return;
      await run(
        `INSERT INTO Grades (User_ID, Class_ID, Doctor_ID, Midterm, Project, Practical, Attendance, Final, GPA)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, classId, doctorId, mid, proj, prac, att, final, gpa]
      );
    };

    // Class 1 — Data Structures
    await insertGrade(stu1Id, cls1Id, doc1Id, 88, 90, 85, 10, 82, 3.7);
    await insertGrade(stu3Id, cls1Id, doc1Id, 72, 68, 75, 8,  65, 2.7);
    await insertGrade(stu6Id, cls1Id, doc1Id, 95, 98, 92, 10, 94, 4.0);

    // Class 2 — Algorithms
    await insertGrade(stu5Id, cls2Id, doc1Id, 80, 85, 88, 9,  78, 3.5);

    // Class 3 — DB Fundamentals
    await insertGrade(stu2Id, cls3Id, doc2Id, 76, 80, 72, 9,  70, 3.0);
    await insertGrade(stu4Id, cls3Id, doc2Id, 60, 55, 65, 6,  58, 2.2);

    // Class 4 — Advanced DB
    await insertGrade(stu1Id, cls4Id, doc2Id, 90, 92, 88, 10, 89, 3.9);
    await insertGrade(stu3Id, cls4Id, doc2Id, 68, 70, 72, 7,  65, 2.6);

    // Class 6 — Intro Programming
    await insertGrade(stu2Id, cls6Id, doc1Id, 85, 88, 80, 9,  83, 3.6);
    await insertGrade(stu4Id, cls6Id, doc1Id, 55, 60, 58, 5,  50, 1.9);

    // ── 14. QUESTIONS & ANSWERS ───────────────────────────────────────────────
    console.log("💬 Questions & Answers...");
    const insertQ = async (text, userId, classId) => {
      const ex = await get(`SELECT Questions_ID FROM Questions WHERE Text = ? AND Class_ID = ?`, [text, classId]);
      if (ex) return ex.Questions_ID;
      const r = await run(`INSERT INTO Questions (Text, User_ID, Class_ID) VALUES (?, ?, ?)`, [text, userId, classId]);
      return r.lastID;
    };
    const insertA = async (qId, text, userId, doctorId) => {
      const ex = await get(`SELECT Answer_ID FROM Answer WHERE Questions_ID = ? AND Text = ?`, [qId, text]);
      if (ex) return;
      const r = await get(`SELECT COALESCE(MAX(Answer_ID), 0) + 1 AS next FROM Answer WHERE Questions_ID = ?`, [qId]);
      const nextId = r?.next ?? 1;
      await run(
        `INSERT OR IGNORE INTO Answer (Answer_ID, Questions_ID, Text, User_ID, Doctor_ID) VALUES (?, ?, ?, ?, ?)`,
        [nextId, qId, text, userId ?? null, doctorId ?? null]
      );
    };

    const q1 = await insertQ('What is the difference between a stack and a queue?', stu1Id, cls1Id);
    await insertA(q1, 'A stack follows LIFO (Last In First Out) — like a stack of plates. A queue follows FIFO (First In First Out) — like a waiting line.', null, doc1Id);

    const q2 = await insertQ('How does quicksort achieve O(n log n) on average?', stu6Id, cls1Id);
    await insertA(q2, 'Quicksort picks a pivot and partitions the array around it. On average the pivot splits the array roughly in half each time, giving O(log n) levels of recursion with O(n) work per level.', null, doc1Id);

    const q3 = await insertQ('Can a table have multiple primary keys?', stu2Id, cls3Id);
    await insertA(q3, 'No, a table can only have one primary key, but a primary key can be a composite key — meaning it consists of multiple columns.', null, doc2Id);

    const q4 = await insertQ('What is the difference between INNER JOIN and LEFT JOIN?', stu4Id, cls3Id);
    // No answer yet — pending

    const q5 = await insertQ('How do I implement a linked list in Python?', stu2Id, cls6Id);
    await insertA(q5, 'Define a Node class with `data` and `next` attributes, then a LinkedList class that holds a `head` reference. Append by traversing to the last node.', null, doc1Id);

    // ── 15. NOTIFICATIONS ─────────────────────────────────────────────────────
    console.log("🔔 Notifications...");
    const notifInsert = async (userId, type, title, message, classId, refId) => {
      const ex = await get(
        `SELECT n.Notification_ID FROM Notification n
         INNER JOIN User_Notification un ON un.Notification_ID = n.Notification_ID
         WHERE un.User_ID = ? AND n.Title = ?`,
        [userId, title]
      );
      if (ex) return;
      const { lastID } = await run(
        `INSERT INTO Notification (Type, Title, Message, Reference_ID) VALUES (?, ?, ?, ?)`,
        [type, title, message, refId ?? null]
      );
      await run(
        `INSERT INTO User_Notification (User_ID, Notification_ID, Is_Read) VALUES (?, ?, 0)`,
        [userId, lastID]
      );
      if (classId != null) {
        await run(
          `INSERT OR IGNORE INTO Class_Notification (Class_ID, Notification_ID) VALUES (?, ?)`,
          [classId, lastID]
        );
      }
    };

    await notifInsert(stu1Id, 'new_material',  'New Material Added',            'Slides for "Arrays & Linked Lists" are now available in Data Structures.',        cls1Id, lec2);
    await notifInsert(stu6Id, 'new_material',  'New Material Added',            'The Big-O Cheatsheet has been posted in Data Structures.',                         cls1Id, lec1);
    await notifInsert(stu1Id, 'new_grade',     'Grade Recorded',                'Your midterm grade has been recorded for Data Structures.',                         cls1Id, null);
    await notifInsert(stu2Id, 'new_grade',     'Grade Recorded',                'Your midterm grade has been recorded for Database Fundamentals.',                   cls3Id, null);
    await notifInsert(stu4Id, 'new_grade',     'Grade Recorded',                'Your midterm grade has been recorded for Intro Programming.',                       cls6Id, null);
    await notifInsert(doc1Id, 'new_question',  'New Question in Data Structures','A student asked: "What is the difference between a stack and a queue?"',           cls1Id, q1);
    await notifInsert(doc2Id, 'new_question',  'New Question in DB Fundamentals','A student asked: "Can a table have multiple primary keys?"',                        cls3Id, q3);
    await notifInsert(doc2Id, 'doctor_question_pending', 'Question Awaiting Answer', 'A student asked: "What is the difference between INNER JOIN and LEFT JOIN?"', cls3Id, q4);
    await notifInsert(stu1Id, 'enrollment',    'Enrolled in Advanced Databases', 'You have been successfully enrolled in Advanced Database Systems.',                cls4Id, null);
    await notifInsert(stu2Id, 'enrollment',    'Enrolled in Computer Networks',  'You have been successfully enrolled in Computer Networks.',                        cls5Id, null);
    await notifInsert(stu7Id, 'approval',      'Registration Pending',           'Your registration is under review. You will be notified once approved.',           null,   null);

    // ── 16. RECORDED COURSES ──────────────────────────────────────────────────
    console.log("📜 Recorded Courses (Prereqs)...");
    // Student 1 (L2) passed CS101 so they can take CS201
    await run(`INSERT OR IGNORE INTO Recorded_Course (User_ID, Course_Code) VALUES (?, 'CS101')`, [stu1Id]);
    // Student 3 (L2) passed CS101
    await run(`INSERT OR IGNORE INTO Recorded_Course (User_ID, Course_Code) VALUES (?, 'CS101')`, [stu3Id]);
    // Student 5 (L3) passed CS101, CS201
    await run(`INSERT OR IGNORE INTO Recorded_Course (User_ID, Course_Code) VALUES (?, 'CS101')`, [stu5Id]);
    await run(`INSERT OR IGNORE INTO Recorded_Course (User_ID, Course_Code) VALUES (?, 'CS201')`, [stu5Id]);

    // ── 17. STUDY OUTPUTS ─────────────────────────────────────────────────────
    console.log("🧠 Study Outputs...");
    const insertStudyOutput = async (cId, mId, uId, type, opts, content) => {
      const optsKey = `${type}::` + Object.keys(opts).sort().map(k => `${k}=${opts[k]}`).join('|');
      await run(
        `INSERT OR IGNORE INTO StudyOutput (Class_ID, Material_ID, User_ID, Tool_Type, Options_Key, Options_JSON, Content_JSON)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cId, mId, uId, type, optsKey, JSON.stringify(opts), JSON.stringify(content)]
      );
    };

    await insertStudyOutput(cls1Id, 1, stu1Id, 'summarize', { length: 'short' }, { text: 'This material introduces data structures and Big-O notation.' });
    await insertStudyOutput(cls1Id, 2, stu1Id, 'summarize', { length: 'medium' }, { text: 'Detailed guide on time complexity and algorithm efficiency.' });

    // ── 18. EXTRA TEST CASES (Probation & Overload) ───────────────────────────
    console.log("🧪 Edge cases (Probation/Overload)...");
    const probationId = await upsertUser(
      "probation.student@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Paul', 'Probation', 'probation.student@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 2, 'Spring', 'Unpaid', 0, '99988877766655', 1, 45, 1.5)`, [probationId]);

    const geniusId = await upsertUser(
      "genius.student@unisystem.test",
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified) VALUES ('Gina', 'Genius', 'genius.student@unisystem.test', ?, 'Student', 'approved', 1)`,
      [pw]
    );
    await run(`INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Semester, Payment_Status, Paid_Amount, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 3, 'Spring', 'Paid', 10000, '11122211122211', 1, 90, 3.9)`, [geniusId]);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log("\n✅ Seed complete!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  All passwords: password123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  👑 Admin (level 1):       admin@unisystem.test            (ID ${adminId})`);
    console.log(`  🏢 Student Affairs (L2):  affairs@unisystem.test          (ID ${affairsId})`);
    console.log(`  👨‍🏫 Dr. Mohamed Hassan:   mohamed.hassan@unisystem.test   (ID ${doc1Id})  — CS dept head`);
    console.log(`  👩‍🏫 Dr. Sara Ali:          sara.ali@unisystem.test         (ID ${doc2Id})  — IS dept head`);
    console.log(`  👨‍🏫 Dr. Khaled Ibrahim:   khaled.ibrahim@unisystem.test   (ID ${doc3Id})  — IT dept head`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  🎓 Omar Khaled:    omar.khaled@unisystem.test    (ID ${stu1Id})  CS L2  NFC AA:BB:CC:01`);
    console.log(`  🎓 Nour Sayed:     nour.sayed@unisystem.test     (ID ${stu2Id})  CS L1  NFC AA:BB:CC:02`);
    console.log(`  🎓 Ali Mahmoud:    ali.mahmoud@unisystem.test    (ID ${stu3Id})  IS L2  NFC AA:BB:CC:03`);
    console.log(`  🎓 Layla Ahmed:    layla.ahmed@unisystem.test    (ID ${stu4Id})  IS L1  NFC AA:BB:CC:04`);
    console.log(`  🎓 Hassan Mostafa: hassan.mostafa@unisystem.test (ID ${stu5Id})  IT L3  NFC AA:BB:CC:05`);
    console.log(`  🎓 Mariam Tarek:   mariam.tarek@unisystem.test   (ID ${stu6Id})  CS L2  NFC AA:BB:CC:06`);
    console.log(`  ⏳ Youssef Ibrahim: youssef.ibrahim@unisystem.test (ID ${stu7Id}) — pending`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  🏫 Class 1 (Data Structures):       ID ${cls1Id}  — Dr. Hassan`);
    console.log(`  🏫 Class 2 (Algorithms):             ID ${cls2Id}  — Dr. Hassan`);
    console.log(`  🏫 Class 3 (DB Fundamentals):       ID ${cls3Id}  — Dr. Sara`);
    console.log(`  🏫 Class 4 (Advanced Databases):    ID ${cls4Id}  — Dr. Sara`);
    console.log(`  🏫 Class 5 (Computer Networks):     ID ${cls5Id}  — Dr. Khaled`);
    console.log(`  🏫 Class 6 (Intro Programming):     ID ${cls6Id}  — Dr. Hassan`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  🔴 Open lectures (live now): lec3 (DS), lec7 (Algo), lec11 (DB Lab), lec16 (Networks)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    db.close();
  } catch (err) {
    console.error("\n❌ Seed error:", err.message, err.stack);
    db.close();
    process.exit(1);
  }
}

// Wait for PRAGMA to settle before starting
setTimeout(seed, 500);
