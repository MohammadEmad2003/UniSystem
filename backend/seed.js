/**
 * Seed script — populates database.db with realistic dev data for every table.
 *
 *   Usage:  node seed.js          (idempotent: clears + reseeds)
 *
 * The database is sqlcipher-encrypted via PRAGMA key='123456' (see utilities/database.js).
 * All tables that the frontend reads from get at least a few rows so pages render.
 */

require('dotenv').config();

// Always seed into a fresh file. If --replace is passed and the existing DB
// is unlocked, we'll move the fresh file into place at the end.
const fsSync = require('fs');
const pathSync = require('path');
const REPLACE = process.argv.includes('--replace');
const targetDb = pathSync.resolve(__dirname, process.env.DATABASE_PATH || './database.db');
const freshDb  = pathSync.resolve(__dirname, './database.seed.db');
if (fsSync.existsSync(freshDb)) fsSync.unlinkSync(freshDb);
process.env.DATABASE_PATH = './database.seed.db';

// Open the (encrypted) DB and drop all tables so the model files recreate
// the schema fresh. This handles cases where an older schema is already present.
const db = require('./utilities/database');

const dropTables = [
  'Notification', 'Attendance', 'Answer', 'Questions', 'Grades',
  'Material', 'Lecture', 'Enrollment', 'Recorded_Course',
  'Class', 'Offers', 'Work_In', 'Courses', 'Department',
  'Student', 'Doctor', 'Admin', 'User',
];

// Disable FK checks while we drop, then turn them back on before inserts run.
db.run('PRAGMA foreign_keys = OFF');
for (const t of dropTables) {
  db.run(`DROP TABLE IF EXISTS ${t}`);
}
db.run('PRAGMA foreign_keys = ON');

// Trigger CREATE TABLE for every table before we start inserting.
require('./models/userModel');
require('./models/departmentModel');
require('./models/doctorModel');
require('./models/studentModel');
require('./models/adminModel');
require('./models/courseModel');
require('./models/classModel');
require('./models/lectureModel');
require('./models/materialModel');
require('./models/gradeModel');
require('./models/jusnctionModel');
require('./models/questionModel');
require('./models/answerModel');
require('./models/attendanceModel');
require('./models/notificationModel');

const bcrypt = require('bcryptjs');

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
});

async function clearAll() {
  // Order matters because of FK ON DELETE CASCADE; safest to wipe leaf tables first.
  const tables = [
    'Notification', 'Attendance', 'Answer', 'Questions', 'Grades',
    'Material', 'Lecture', 'Enrollment', 'Recorded_Course',
    'Class', 'Offers', 'Work_In', 'Courses', 'Department',
    'Student', 'Doctor', 'Admin', 'User',
  ];
  for (const t of tables) {
    try { await run(`DELETE FROM ${t}`); } catch { /* table may not exist on first run */ }
  }
}

async function seed() {
  console.log('🌱 Seeding database...');
  await clearAll();

  const pwHash = await bcrypt.hash('password123', 10);

  // ---- Users + Admin/Doctor/Student rows ----
  const insertUser = async (f, l, email, role, status = 'approved', verified = 1) => {
    const r = await run(
      `INSERT INTO User (Password, F_Name, L_Name, Email, Account_Status, Role, is_email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pwHash, f, l, email, status, role, verified]
    );
    return r.lastID;
  };

  // Admins
  const adminId = await insertUser('System', 'Admin', 'admin@capital.edu', 'Admin');
  await run(`INSERT INTO Admin (User_ID, Permissions_Level) VALUES (?, ?)`, [adminId, 5]);

  // Departments (need them before doctors/students reference Dept_ID)
  const deptCS  = (await run(`INSERT INTO Department (Dept_Name) VALUES (?)`, ['Computer Science'])).lastID;
  const deptIT  = (await run(`INSERT INTO Department (Dept_Name) VALUES (?)`, ['Information Technology'])).lastID;
  const deptENG = (await run(`INSERT INTO Department (Dept_Name) VALUES (?)`, ['Software Engineering'])).lastID;

  // Doctors
  const docMo = await insertUser('Mohamed', 'Elsayed', 'mohamed.elsayed@capital.edu', 'Doctor');
  await run(`INSERT INTO Doctor (User_ID, Specialization) VALUES (?, ?)`, [docMo, 'Algorithms']);
  await run(`INSERT INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, ?)`, [docMo, deptCS]);

  const docSara = await insertUser('Sara', 'Ibrahim', 'sara.ibrahim@capital.edu', 'Doctor');
  await run(`INSERT INTO Doctor (User_ID, Specialization) VALUES (?, ?)`, [docSara, 'Databases']);
  await run(`INSERT INTO Work_In (Doctor_ID, Dept_ID) VALUES (?, ?)`, [docSara, deptIT]);

  await run(`UPDATE Department SET Doctor_ID = ? WHERE Dept_ID = ?`, [docMo, deptCS]);
  await run(`UPDATE Department SET Doctor_ID = ? WHERE Dept_ID = ?`, [docSara, deptIT]);

  // Students (mix of approved + pending so admin approval queue has rows)
  const students = [
    { f: 'Ahmed',   l: 'Hassan',   email: 'ahmed.hassan@capital.edu',   ssn: '11111111', dept: deptCS,  status: 'approved' },
    { f: 'Mariam',  l: 'Khaled',   email: 'mariam.khaled@capital.edu',  ssn: '22222222', dept: deptCS,  status: 'approved' },
    { f: 'Youssef', l: 'Adel',     email: 'youssef.adel@capital.edu',   ssn: '33333333', dept: deptIT,  status: 'approved' },
    { f: 'Lina',    l: 'Mostafa',  email: 'lina.mostafa@capital.edu',   ssn: '44444444', dept: deptENG, status: 'approved' },
    { f: 'Omar',    l: 'Tarek',    email: 'omar.tarek@capital.edu',     ssn: '55555555', dept: deptCS,  status: 'pending' },
  ];
  const studentIds = [];
  for (const s of students) {
    const uid = await insertUser(s.f, s.l, s.email, 'Student', s.status);
    await run(
      `INSERT INTO Student (User_ID, Academic_Level, Payment_Status, NFC_Tag_ID, SSN, Dept_ID, Total_Hours, Total_GPA)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, 2, 'Paid', `NFC-${uid}`, s.ssn, s.dept, 30, 3.4]
    );
    studentIds.push({ id: uid, status: s.status, dept: s.dept });
  }

  // ---- Courses + Offers ----
  const courses = [
    { code: 'CS101', name: 'Intro to Programming',  hours: 3, dept: deptCS },
    { code: 'CS201', name: 'Data Structures',       hours: 3, dept: deptCS },
    { code: 'CS301', name: 'Algorithms',            hours: 3, dept: deptCS },
    { code: 'IT201', name: 'Database Systems',      hours: 3, dept: deptIT },
    { code: 'IT301', name: 'Networking',            hours: 3, dept: deptIT },
    { code: 'SE201', name: 'Software Engineering',  hours: 3, dept: deptENG },
  ];
  for (const c of courses) {
    await run(`INSERT INTO Courses (Course_Code, Name, Credit_Hours) VALUES (?, ?, ?)`, [c.code, c.name, c.hours]);
    await run(`INSERT INTO Offers (Course_Code, Dept_ID) VALUES (?, ?)`, [c.code, c.dept]);
  }

  // ---- Classes ----
  const mkClass = async (code, doctorId, semester, level, capacity) => {
    const r = await run(
      `INSERT INTO Class (Level, Semester, Course_Code, Doctor_ID, Capacity) VALUES (?, ?, ?, ?, ?)`,
      [level, semester, code, doctorId, capacity]
    );
    return r.lastID;
  };
  const classCS101 = await mkClass('CS101', docMo,   'Fall',   1, 40);
  const classCS201 = await mkClass('CS201', docMo,   'Fall',   2, 35);
  const classCS301 = await mkClass('CS301', docMo,   'Spring', 3, 30);
  const classIT201 = await mkClass('IT201', docSara, 'Fall',   2, 30);
  const classIT301 = await mkClass('IT301', docSara, 'Spring', 3, 25);
  const classSE201 = await mkClass('SE201', docMo,   'Fall',   2, 35);

  const allClasses = [classCS101, classCS201, classCS301, classIT201, classIT301, classSE201];

  // ---- Enrollments (give the first 4 approved students a few classes each) ----
  const approved = studentIds.filter(s => s.status === 'approved').map(s => s.id);
  const enrollPlan = [
    [approved[0], [classCS101, classCS201, classIT201]],
    [approved[1], [classCS101, classCS301, classSE201]],
    [approved[2], [classIT201, classIT301]],
    [approved[3], [classCS101, classSE201]],
  ];
  for (const [sid, classIds] of enrollPlan) {
    for (const cid of classIds) {
      await run(`INSERT OR IGNORE INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`, [cid, sid]);
    }
  }

  // ---- Lectures ----
  const lectures = [];
  for (const cid of allClasses) {
    for (let i = 1; i <= 2; i++) {
      const r = await run(
        `INSERT INTO Lecture (Title, Date, Day, Time, Room_ID, Meeting_Link, Type, Class_ID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `Lecture ${i}`,
          `2025-${String(9 + i).padStart(2, '0')}-15`,
          ['Sunday', 'Monday', 'Tuesday', 'Wednesday'][i % 4],
          `${10 + i}:00`,
          `R-${100 + cid}`,
          i % 2 === 0 ? 'https://meet.example.com/abc' : null,
          i % 2 === 0 ? 'Online' : 'Lecture',
          cid,
        ]
      );
      lectures.push({ id: r.lastID, classId: cid });
    }
  }

  // ---- Materials ----
  for (const lec of lectures.slice(0, 6)) {
    await run(
      `INSERT INTO Material (Lec_ID, Name, URL, Document, Summarize, Type) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        lec.id,
        `Slides for lecture ${lec.id}`,
        'https://example.com/slides.pdf',
        null,
        null,
        'link',
      ]
    );
  }

  // ---- Grades ----
  for (const sid of approved.slice(0, 3)) {
    await run(
      `INSERT INTO Grades (Type, Attendance, Practical, Project, Midterm, Final, GPA, User_ID, Class_ID, Doctor_ID)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['midterm', 9, 18, 17, 22, 0, 3.5, sid, classCS101, docMo]
    );
  }

  // ---- Questions + Answers ----
  const q1 = await run(
    `INSERT INTO Questions (Text, User_ID, Class_ID) VALUES (?, ?, ?)`,
    ['What is Big-O notation?', approved[0], classCS101]
  );
  await run(
    `INSERT INTO Answer (Answer_ID, Questions_ID, Text, Doctor_ID) VALUES (?, ?, ?, ?)`,
    [1, q1.lastID, 'Big-O describes the asymptotic upper bound of an algorithm’s growth rate.', docMo]
  );

  const q2 = await run(
    `INSERT INTO Questions (Text, User_ID, Class_ID) VALUES (?, ?, ?)`,
    ['Difference between SQL and NoSQL?', approved[2], classIT201]
  );
  await run(
    `INSERT INTO Answer (Answer_ID, Questions_ID, Text, Doctor_ID) VALUES (?, ?, ?, ?)`,
    [1, q2.lastID, 'SQL is relational + schema-bound; NoSQL is non-relational + schema-flexible.', docSara]
  );

  // ---- Attendance ----
  for (const lec of lectures.slice(0, 4)) {
    for (const sid of approved.slice(0, 2)) {
      await run(
        `INSERT INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, ?, ?)`,
        [sid, lec.id, 1, 'present']
      );
    }
  }

  // ---- Notifications ----
  for (const sid of approved.slice(0, 3)) {
    await run(
      `INSERT INTO Notification (User_ID, Type, Title, Message, Class_ID, Is_Read) VALUES (?, ?, ?, ?, ?, ?)`,
      [sid, 'new_material', 'New material uploaded', 'Slides for lecture 1 are now available.', classCS101, 0]
    );
    await run(
      `INSERT INTO Notification (User_ID, Type, Title, Message, Class_ID, Is_Read) VALUES (?, ?, ?, ?, ?, ?)`,
      [sid, 'announcement', 'Welcome', 'Welcome to the new semester!', null, 1]
    );
  }

  console.log('✅ Seeding complete.');
  console.log('\nDemo logins (password = "password123"):');
  console.log('  admin@capital.edu              (admin)');
  console.log('  mohamed.elsayed@capital.edu    (doctor)');
  console.log('  sara.ibrahim@capital.edu       (doctor)');
  console.log('  ahmed.hassan@capital.edu       (student, approved)');
  console.log('  mariam.khaled@capital.edu      (student, approved)');
  console.log('  omar.tarek@capital.edu         (student, PENDING — for approval queue)');

  const counts = await all(`
    SELECT 'User' n, COUNT(*) c FROM User UNION ALL
    SELECT 'Department', COUNT(*) FROM Department UNION ALL
    SELECT 'Courses', COUNT(*) FROM Courses UNION ALL
    SELECT 'Class', COUNT(*) FROM Class UNION ALL
    SELECT 'Enrollment', COUNT(*) FROM Enrollment UNION ALL
    SELECT 'Lecture', COUNT(*) FROM Lecture UNION ALL
    SELECT 'Material', COUNT(*) FROM Material UNION ALL
    SELECT 'Grades', COUNT(*) FROM Grades UNION ALL
    SELECT 'Questions', COUNT(*) FROM Questions UNION ALL
    SELECT 'Answer', COUNT(*) FROM Answer UNION ALL
    SELECT 'Attendance', COUNT(*) FROM Attendance UNION ALL
    SELECT 'Notification', COUNT(*) FROM Notification
  `);
  console.log('\nRow counts:');
  counts.forEach(row => console.log(`  ${row.n.padEnd(14)} ${row.c}`));
}

// Schema-create models above use db.exec/db.run asynchronously, so wait briefly
// before seeding to make sure CREATE TABLE has settled.
setTimeout(() => {
  seed()
    .then(() => {
      db.close((closeErr) => {
        if (closeErr) console.warn('Close warning:', closeErr.message);
        try {
          if (REPLACE) {
            if (fsSync.existsSync(targetDb)) fsSync.unlinkSync(targetDb);
            fsSync.renameSync(freshDb, targetDb);
            console.log(`\n📦 Replaced ${pathSync.basename(targetDb)} with the seeded DB.`);
          } else {
            console.log(`\n📦 Seeded DB written to ${pathSync.basename(freshDb)}.`);
            console.log('   Stop the backend, then run:');
            console.log(`     node seed.js --replace`);
            console.log(`   ...or manually replace ${pathSync.basename(targetDb)} with ${pathSync.basename(freshDb)}.`);
          }
          process.exit(0);
        } catch (e) {
          console.error('❌ Could not replace DB (target locked?):', e.message);
          console.log(`   Fresh DB still available at ${freshDb}.`);
          process.exit(1);
        }
      });
    })
    .catch(err => {
      console.error('❌ Seed failed:', err);
      db.close(() => process.exit(1));
    });
}, 500);
