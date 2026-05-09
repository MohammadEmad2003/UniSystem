const genericQueries = require('../utilities/genericQueries');
const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const gpaService = require('../services/gpaService');

const classQueries = genericQueries('Class', { primaryKey: 'Class_ID' });

// GET /classes — Admin only
const getAllClasses = asyncWrapper(async (req, res) => {
  const classes = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        c.Class_ID, c.Course_Code, co.Name AS Course_Name, co.Credit_Hours,
        c.Doctor_ID, u.F_Name || ' ' || u.L_Name AS Doctor_Name,
        c.Semester, c.Level, c.Capacity,
        COUNT(e.User_ID) AS Enrolled_Count,
        d.Dept_ID AS Department_ID
       FROM Class c
       LEFT JOIN Courses co ON c.Course_Code = co.Course_Code
       LEFT JOIN User u ON c.Doctor_ID = u.User_ID
       LEFT JOIN Enrollment e ON c.Class_ID = e.Class_ID
       LEFT JOIN Offers d ON c.Course_Code = d.Course_Code
       GROUP BY c.Class_ID`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: classes });
});

// GET /classes/:classId
const getClassById = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const cls = await new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        c.Class_ID, c.Course_Code, co.Name AS Course_Name,
        c.Doctor_ID, u.F_Name || ' ' || u.L_Name AS Doctor_Name,
        c.Semester, c.Level, c.Capacity,
        COUNT(e.User_ID) AS Enrolled_Count,
        d.Dept_ID AS Department_ID
       FROM Class c
       LEFT JOIN Courses co ON c.Course_Code = co.Course_Code
       LEFT JOIN User u ON c.Doctor_ID = u.User_ID
       LEFT JOIN Enrollment e ON c.Class_ID = e.Class_ID
       LEFT JOIN Offers d ON c.Course_Code = d.Course_Code
       WHERE c.Class_ID = ?
       GROUP BY c.Class_ID`,
      [classId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (!cls) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Class not found' } });
  }

  res.json({ success: httpstatustext.success, data: cls });
});

// GET /classes/doctor/:doctorId
const getClassesByDoctor = asyncWrapper(async (req, res) => {
  const { doctorId } = req.params;

  const classes = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        c.Class_ID, c.Course_Code, co.Name AS Course_Name,
        c.Doctor_ID, u.F_Name || ' ' || u.L_Name AS Doctor_Name,
        c.Semester, c.Level, c.Capacity,
        COUNT(e.User_ID) AS Enrolled_Count
       FROM Class c
       LEFT JOIN Courses co ON c.Course_Code = co.Course_Code
       LEFT JOIN User u ON c.Doctor_ID = u.User_ID
       LEFT JOIN Enrollment e ON c.Class_ID = e.Class_ID
       WHERE c.Doctor_ID = ?
       GROUP BY c.Class_ID`,
      [doctorId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: classes });
});

// GET /classes/student/:studentId
const getClassesByStudent = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;

  const classes = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        c.Class_ID, c.Course_Code, co.Name AS Course_Name, co.Credit_Hours,
        c.Doctor_ID, u.F_Name || ' ' || u.L_Name AS Doctor_Name,
        c.Semester, c.Level, c.Capacity
       FROM Class c
       LEFT JOIN Courses co ON c.Course_Code = co.Course_Code
       LEFT JOIN User u ON c.Doctor_ID = u.User_ID
       INNER JOIN Enrollment e ON c.Class_ID = e.Class_ID
       WHERE e.User_ID = ?`,
      [studentId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: classes });
});

// POST /classes — Admin only
const createClass = asyncWrapper(async (req, res) => {
  const { course_code, doctor_id, semester, level, capacity } = req.body;

  if (!course_code || !doctor_id || !semester || !level || !capacity) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Missing required fields' } });
  }

  const result = await classQueries.create({
    Course_Code: course_code,
    Doctor_ID: doctor_id,
    Semester: semester,
    Level: level,
    Capacity: capacity
  });

  res.status(201).json({ success: httpstatustext.success, data: { class_id: result.lastID } });
});

// DELETE /classes/:classId — Admin only
const deleteClass = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const cls = await classQueries.getById(classId);
  if (!cls) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Class not found' } });
  }

  await classQueries.delete(classId);
  res.json({ success: httpstatustext.success, message: { msg: 'Class deleted successfully' } });
});

// GET /classes/:classId/students — Doctor only
const getClassStudents = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const students = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        u.User_ID, u.F_Name, u.L_Name, u.Email,
        s.Academic_Level, s.Payment_Status, s.NFC_Tag_ID
       FROM Enrollment e
       INNER JOIN User u ON e.User_ID = u.User_ID
       INNER JOIN Student s ON e.User_ID = s.User_ID
       WHERE e.Class_ID = ?`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: students });
});

// POST /classes/:classId/enroll
const enrollStudent = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { student_id } = req.body;

  if (!student_id) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'student_id is required' } });
  }

  // تأكد إن الـ class موجودة
  const cls = await classQueries.getById(classId);
  if (!cls) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Class not found' } });
  }

  // تحقق من حدود الساعات المسموح بها
  const enrollmentCheck = await gpaService.canEnrollInClass(student_id, classId);
  if (!enrollmentCheck.canEnroll) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: enrollmentCheck.message } });
  }

  // تحقق من المتطلبات السابقة (Prerequisites)
  const prereqCheck = await gpaService.checkPrerequisites(student_id, classId);
  if (!prereqCheck.canEnroll) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: prereqCheck.message } });
  }

  // تأكد إن الـ student مش enrolled بالفعل
  const existing = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Enrollment WHERE Class_ID = ? AND User_ID = ?`,
      [classId, student_id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (existing) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Student already enrolled' } });
  }

  // تأكد إن في capacity
  const enrolledCount = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) AS count FROM Enrollment WHERE Class_ID = ?`,
      [classId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row.count);
      }
    );
  });

  if (enrolledCount >= cls.Capacity) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Class is full' } });
  }

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Enrollment (Class_ID, User_ID) VALUES (?, ?)`,
      [classId, student_id],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Student enrolled successfully' } });
});

// DELETE /classes/:classId/enroll/:studentId — Self-drop or admin
const dropStudent = asyncWrapper(async (req, res) => {
  const { classId, studentId } = req.params;

  const existing = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Enrollment WHERE Class_ID = ? AND User_ID = ?`,
      [classId, studentId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (!existing) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Enrollment not found' } });
  }

  await new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM Enrollment WHERE Class_ID = ? AND User_ID = ?`,
      [classId, studentId],
      function (err) {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.json({ success: httpstatustext.success, message: { msg: 'Dropped from class successfully' } });
});

// GET /classes/:classId/grades — Doctor only
const getClassGrades = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const grades = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        g.User_ID AS Student_ID,
        u.F_Name || ' ' || u.L_Name AS Student_Name,
        g.Class_ID,
        g.Midterm, g.Project, g.Practical,
        g.Attendance, g.Final, g.GPA,
        (g.Midterm + g.Project + g.Practical + g.Attendance + COALESCE(g.Final, 0)) AS Total
       FROM Grades g
       INNER JOIN User u ON g.User_ID = u.User_ID
       WHERE g.Class_ID = ?`,
      [classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: grades });
});

// GET /classes/:classId/grades/student/:studentId
const getStudentGrades = asyncWrapper(async (req, res) => {
  const { classId, studentId } = req.params;

  const grades = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        Grade_ID, Class_ID, User_ID AS Student_ID,
        Generate_At,
        Attendance, Practical, Project, Midterm, Final, GPA
       FROM Grades
       WHERE Class_ID = ? AND User_ID = ?`,
      [classId, studentId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: grades });
});

// POST /classes/:classId/grades — Doctor only
const addGrade = asyncWrapper(async (req, res) => {
  const { classId } = req.params;
  const { student_id, grade } = req.body;
  const doctorId = req.currentUser.user_id;
  const { type } = req.body; // Keep 'type' in body to know which column to update, but don't save to 'Type' column

  if (!student_id || !type || grade === undefined) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'student_id, type, and grade are required' } });
  }

  const validTypes = ['midterm', 'final', 'project', 'attendance', 'practical'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Invalid type' } });
  }

  const existing = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Grades WHERE User_ID = ? AND Class_ID = ?`,
      [student_id, classId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  const columnMap = {
    midterm: 'Midterm',
    final: 'Final',
    project: 'Project',
    attendance: 'Attendance',
    practical: 'Practical'
  };

  const column = columnMap[type];

  // Perform Update or Insert
  if (existing) {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Grades SET ${column} = ?, Generate_At = CURRENT_TIMESTAMP WHERE User_ID = ? AND Class_ID = ?`,
        [grade, student_id, classId],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  } else {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO Grades (User_ID, Class_ID, Doctor_ID, ${column}) VALUES (?, ?, ?, ?)`,
        [student_id, classId, doctorId, grade],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  // RECALCULATE GPA
  const updatedGrade = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Grades WHERE User_ID = ? AND Class_ID = ?`,
      [student_id, classId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (updatedGrade) {
    const totalMarks = (updatedGrade.Midterm || 0) + (updatedGrade.Project || 0) +
      (updatedGrade.Practical || 0) + (updatedGrade.Attendance || 0) +
      (updatedGrade.Final || 0);

    const courseGPA = gpaService.calculateCourseGPA(totalMarks);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Grades SET GPA = ? WHERE User_ID = ? AND Class_ID = ?`,
        [courseGPA, student_id, classId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Recalculate Student Cumulative GPA and Total Hours
    await gpaService.recalculateStudentGPA(student_id);
  }

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Grade added successfully and GPA recalculated' } });
});

module.exports = {
  getAllClasses, getClassById, getClassesByDoctor, getClassesByStudent,
  createClass, deleteClass, getClassStudents, enrollStudent, dropStudent,
  getClassGrades, getStudentGrades, addGrade
};