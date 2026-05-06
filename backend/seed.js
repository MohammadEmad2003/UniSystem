/**
 * SEED SCRIPT — يحشو الـ DB بداتا تجريبية كاملة
 *
 * الاستخدام:
 *   node seed.js
 *
 * حطه في root المشروع (جنب index.js)
 * بيحشو: 1 admin, 2 doctors, 3 students, 2 departments, 3 courses, 2 classes, lectures, grades, attendance
 */

require("dotenv").config();
const sqlite3 = require("@journeyapps/sqlcipher").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

// =====================================================
// فتح الـ DB بنفس طريقة database.js
// =====================================================
const backendRoot = path.resolve(__dirname);
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(backendRoot, process.env.DATABASE_PATH)
  : path.join(backendRoot, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ DB open error:", err.message);
    process.exit(1);
  }
  console.log("✅ DB opened:", dbPath);
});

db.serialize(() => {
  db.run("PRAGMA key='123456'");
  db.run("PRAGMA cipher_compatibility=4");
  db.run("PRAGMA foreign_keys = ON");
});

// =====================================================
// HELPERS
// =====================================================
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

// =====================================================
// SEED DATA
// =====================================================
async function seed() {
  try {
    console.log("\n🌱 بدأ الـ Seeding...\n");

    const password = await bcrypt.hash("password123", 10);

    const adminEmail = "admin@unisystem.test";
    const doctor1Email = "mohamed.hassan@unisystem.test";
    const doctor2Email = "sara.ali@unisystem.test";
    const student1Email = "omar.khaled@unisystem.test";
    const student2Email = "nour.sayed@unisystem.test";
    const student3Email = "ali.mahmoud@unisystem.test";

    // ─── 1. DEPARTMENTS ───────────────────────────────
    console.log("📁 Departments...");
    await run(
      `INSERT OR IGNORE INTO Department (Dept_ID, Dept_Name) VALUES (1, 'Computer Science')`,
    );
    await run(
      `INSERT OR IGNORE INTO Department (Dept_ID, Dept_Name) VALUES (2, 'Information Systems')`,
    );

    // ─── 2. USERS ─────────────────────────────────────
    console.log("👤 Users...");

    // Admin
    const adminUser = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Ahmed', 'Admin', ?, ?, 'Admin', 'approved', 1)`,
      [adminEmail, password],
    );
    const adminId =
      adminUser.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [adminEmail]))
        ?.User_ID;

    // Doctor 1
    const doc1 = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Mohamed', 'Hassan', ?, ?, 'Doctor', 'approved', 1)`,
      [doctor1Email, password],
    );
    const doctor1Id =
      doc1.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [doctor1Email]))
        ?.User_ID;

    // Doctor 2
    const doc2 = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Sara', 'Ali', ?, ?, 'Doctor', 'approved', 1)`,
      [doctor2Email, password],
    );
    const doctor2Id =
      doc2.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [doctor2Email]))
        ?.User_ID;

    // Student 1
    const stu1 = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Omar', 'Khaled', ?, ?, 'Student', 'approved', 1)`,
      [student1Email, password],
    );
    const student1Id =
      stu1.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [student1Email]))
        ?.User_ID;

    // Student 2
    const stu2 = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Nour', 'Sayed', ?, ?, 'Student', 'approved', 1)`,
      [student2Email, password],
    );
    const student2Id =
      stu2.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [student2Email]))
        ?.User_ID;

    // Student 3 (pending)
    const stu3 = await run(
      `INSERT OR IGNORE INTO User (F_Name, L_Name, Email, Password, Role, Account_Status, is_email_verified)
       VALUES ('Ali', 'Mahmoud', ?, ?, 'Student', 'pending', 1)`,
      [student3Email, password],
    );
    const student3Id =
      stu3.lastID ||
      (await get(`SELECT User_ID FROM User WHERE Email = ?`, [student3Email]))
        ?.User_ID;

    // ─── 3. ROLE TABLES ───────────────────────────────
    console.log("🎓 Role tables...");

    await run(
      `INSERT OR IGNORE INTO Admin (User_ID, Permissions_Level) VALUES (?, 1)`,
      [adminId],
    );
    await run(
      `INSERT OR IGNORE INTO Doctor (User_ID, Specialization) VALUES (?, 'Algorithms & Data Structures')`,
      [doctor1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Doctor (User_ID, Specialization) VALUES (?, 'Database Systems')`,
      [doctor2Id],
    );
    await run(
      `INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Payment_Status, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 2, 'Paid', '12345678901234', 1, 60, 3.5)`,
      [student1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Payment_Status, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 1, 'Paid', '98765432109876', 1, 30, 3.2)`,
      [student2Id],
    );
    await run(
      `INSERT OR IGNORE INTO Student (User_ID, Academic_Level, Payment_Status, SSN, Dept_ID, Total_Hours, Total_GPA) VALUES (?, 1, 'Unpaid', '11122233344455', 2, 0, 0)`,
      [student3Id],
    );

    // Work_In
    await run(
      `INSERT OR IGNORE INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, 1)`,
      [doctor1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, 2)`,
      [doctor2Id],
    );

    // ─── 4. COURSES ───────────────────────────────────
    console.log("📚 Courses...");
    await run(
      `INSERT OR IGNORE INTO Courses (Course_Code, Name, Credit_Hours) VALUES ('CS101', 'Introduction to Programming', 3)`,
    );
    await run(
      `INSERT OR IGNORE INTO Courses (Course_Code, Name, Credit_Hours) VALUES ('CS201', 'Data Structures', 3)`,
    );
    await run(
      `INSERT OR IGNORE INTO Courses (Course_Code, Name, Credit_Hours) VALUES ('IS101', 'Database Fundamentals', 3)`,
    );
    await run(
      `INSERT OR IGNORE INTO Offers (Course_Code, Dept_ID) VALUES ('CS101', 1)`,
    );
    await run(
      `INSERT OR IGNORE INTO Offers (Course_Code, Dept_ID) VALUES ('CS201', 1)`,
    );
    await run(
      `INSERT OR IGNORE INTO Offers (Course_Code, Dept_ID) VALUES ('IS101', 2)`,
    );

    // ─── 5. CLASSES ───────────────────────────────────
    console.log("🏫 Classes...");
    const class1 = await run(
      `INSERT OR IGNORE INTO Class (Course_Code, Doctor_ID, Semester, Level, Capacity) VALUES ('CS201', ?, 'Fall 2025', 2, 30)`,
      [doctor1Id],
    );
    const class1Id =
      class1.lastID ||
      (
        await get(
          `SELECT Class_ID FROM Class WHERE Course_Code = 'CS201' AND Doctor_ID = ?`,
          [doctor1Id],
        )
      )?.Class_ID;

    const class2 = await run(
      `INSERT OR IGNORE INTO Class (Course_Code, Doctor_ID, Semester, Level, Capacity) VALUES ('IS101', ?, 'Fall 2025', 1, 25)`,
      [doctor2Id],
    );
    const class2Id =
      class2.lastID ||
      (
        await get(
          `SELECT Class_ID FROM Class WHERE Course_Code = 'IS101' AND Doctor_ID = ?`,
          [doctor2Id],
        )
      )?.Class_ID;

    // ─── 6. ENROLLMENT ────────────────────────────────
    console.log("📋 Enrollment...");
    await run(
      `INSERT OR IGNORE INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`,
      [class1Id, student1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`,
      [class1Id, student2Id],
    );
    await run(
      `INSERT OR IGNORE INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`,
      [class2Id, student1Id],
    );

    // ─── 7. LECTURES ──────────────────────────────────
    console.log("📖 Lectures...");
    const lec1 = await run(
      `INSERT OR IGNORE INTO Lecture (Date, Day, Time, Type, Class_ID) VALUES ('2025-09-15', 'Monday', '10:00', 'Lecture', ?)`,
      [class1Id],
    );
    const lec1Id = lec1.lastID;

    const lec2 = await run(
      `INSERT OR IGNORE INTO Lecture (Date, Day, Time, Type, Class_ID) VALUES ('2025-09-22', 'Monday', '10:00', 'Lecture', ?)`,
      [class1Id],
    );
    const lec2Id = lec2.lastID;

    const lec3 = await run(
      `INSERT OR IGNORE INTO Lecture (Date, Day, Time, Type, Class_ID) VALUES ('2025-09-16', 'Tuesday', '12:00', 'Lecture', ?)`,
      [class2Id],
    );
    const lec3Id = lec3.lastID;

    // ─── 8. ATTENDANCE ────────────────────────────────
    console.log("✅ Attendance...");
    await run(
      `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, 1, 'present')`,
      [student1Id, lec1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, 1, 'present')`,
      [student1Id, lec2Id],
    );
    await run(
      `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, 1, 'absent')`,
      [student2Id, lec1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, 1, 'present')`,
      [student2Id, lec2Id],
    );
    await run(
      `INSERT OR IGNORE INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, 1, 'present')`,
      [student1Id, lec3Id],
    );

    // ─── 9. GRADES ────────────────────────────────────
    console.log("📊 Grades...");
    await run(
      `INSERT OR IGNORE INTO Grades (User_ID, Class_ID, Doctor_ID, Type, Midterm, Project, Practical, Attendance, Final, GPA)
       VALUES (?, ?, ?, 'final', 85, 90, 88, 10, 78, 3.5)`,
      [student1Id, class1Id, doctor1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Grades (User_ID, Class_ID, Doctor_ID, Type, Midterm, Project, Practical, Attendance, Final, GPA)
       VALUES (?, ?, ?, 'final', 70, 75, 80, 8, 65, 2.8)`,
      [student2Id, class1Id, doctor1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Grades (User_ID, Class_ID, Doctor_ID, Type, Midterm, Project, Practical, Attendance, Final, GPA)
       VALUES (?, ?, ?, 'final', 92, 88, 95, 10, 90, 4.0)`,
      [student1Id, class2Id, doctor2Id],
    );

    // ─── 10. NOTIFICATIONS ────────────────────────────
    console.log("🔔 Notifications...");
    await run(
      `INSERT OR IGNORE INTO Notification (User_ID, Type, Title, Message, Is_Read, Class_ID)
       VALUES (?, 'new_question', 'New Question Posted', 'A student posted a question in Data Structures', 0, ?)`,
      [student1Id, class1Id],
    );
    await run(
      `INSERT OR IGNORE INTO Notification (User_ID, Type, Title, Message, Is_Read, Class_ID)
       VALUES (?, 'new_grade', 'Grade Updated', 'Your Midterm grade has been recorded', 0, ?)`,
      [student1Id, class1Id],
    );

    // ─── SUMMARY ──────────────────────────────────────
    console.log("\n✅ Seed مكتمل!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Accounts (كلهم password: password123)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👑 Admin:     ${adminEmail}     (ID: ${adminId})`);
    console.log(
      `👨‍🏫 Doctor 1:  ${doctor1Email}  (ID: ${doctor1Id}) — CS classes`,
    );
    console.log(
      `👩‍🏫 Doctor 2:  ${doctor2Email}  (ID: ${doctor2Id}) — IS classes`,
    );
    console.log(
      `🎓 Student 1: ${student1Email}  (ID: ${student1Id}) — approved, GPA 3.5`,
    );
    console.log(
      `🎓 Student 2: ${student2Email}  (ID: ${student2Id}) — approved, GPA 3.2`,
    );
    console.log(
      `🎓 Student 3: ${student3Email}  (ID: ${student3Id}) — pending`,
    );
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🏫 Class 1:   Data Structures    (ID: ${class1Id})`);
    console.log(`🏫 Class 2:   Database Fundamentals (ID: ${class2Id})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🚀 جرب دلوقتي في Postman!");

    db.close();
  } catch (err) {
    console.error("\n❌ Error during seed:", err.message);
    db.close();
    process.exit(1);
  }
}

// استنى الـ PRAGMA يخلص الأول
setTimeout(seed, 500);
