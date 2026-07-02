const genericQueries = require('../utilities/genericQueries');
const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const gpaService = require('../services/gpaService');

const classQueries = genericQueries('Class', { primaryKey: 'class_id' });

// GET /classes — Admin only
const getAllClasses = asyncWrapper(async (req, res) => {
  const classesResult = await db.query(
      `SELECT 
        c.class_id, c.course_code, co.name AS course_name, co.credit_hours,
        c.doctor_id, u.f_name || ' ' || u.l_name AS doctor_name,
        c.semester, c.level, c.capacity,
        COUNT(e.user_id) AS enrolled_count,
        d.dept_id AS department_id
       FROM Class c
       LEFT JOIN Courses co ON c.course_code = co.course_code
       LEFT JOIN "User" u ON c.doctor_id = u.user_id
       LEFT JOIN Enrollment e ON c.class_id = e.class_id
       LEFT JOIN Offers d ON c.course_code = d.course_code
       GROUP BY c.class_id, c.course_code, co.name, co.credit_hours, c.doctor_id, u.f_name, u.l_name, c.semester, c.level, c.capacity, d.dept_id`
  );
  const classes = classesResult.rows || [];

  res.json({ success: httpstatustext.success, data: classes });
});

// GET /classes/:classId
const getClassById = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const clsResult = await db.query(
      `SELECT 
        c.class_id, c.course_code, co.name AS course_name,
        c.doctor_id, u.f_name || ' ' || u.l_name AS doctor_name,
        c.semester, c.level, c.capacity,
        COUNT(e.user_id) AS enrolled_count,
        d.dept_id AS department_id
       FROM Class c
       LEFT JOIN Courses co ON c.course_code = co.course_code
       LEFT JOIN "User" u ON c.doctor_id = u.user_id
       LEFT JOIN Enrollment e ON c.class_id = e.class_id
       LEFT JOIN Offers d ON c.course_code = d.course_code
       WHERE c.class_id = $1
       GROUP BY c.class_id, c.course_code, co.name, c.doctor_id, u.f_name, u.l_name, c.semester, c.level, c.capacity, d.dept_id`,
      [classId]
  );
  const cls = clsResult.rows[0];

  if (!cls) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Class not found' } });
  }

  res.json({ success: httpstatustext.success, data: cls });
});

// GET /classes/doctor/:doctorId
const getClassesByDoctor = asyncWrapper(async (req, res) => {
  const { doctorId } = req.params;

  const classesResult = await db.query(
      `SELECT 
        c.class_id, c.course_code, co.name AS course_name,
        c.doctor_id, u.f_name || ' ' || u.l_name AS doctor_name,
        c.semester, c.level, c.capacity,
        COUNT(e.user_id) AS enrolled_count
       FROM Class c
       LEFT JOIN Courses co ON c.course_code = co.course_code
       LEFT JOIN "User" u ON c.doctor_id = u.user_id
       LEFT JOIN Enrollment e ON c.class_id = e.class_id
       WHERE c.doctor_id = $1
       GROUP BY c.class_id, c.course_code, co.name, c.doctor_id, u.f_name, u.l_name, c.semester, c.level, c.capacity`,
      [doctorId]
  );
  const classes = classesResult.rows || [];

  res.json({ success: httpstatustext.success, data: classes });
});

// GET /classes/student/:studentId
const getClassesByStudent = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;

  const classesResult = await db.query(
      `SELECT 
        c.class_id, c.course_code, co.name AS course_name, co.credit_hours,
        c.doctor_id, u.f_name || ' ' || u.l_name AS doctor_name,
        c.semester, c.level, c.capacity
       FROM Class c
       LEFT JOIN Courses co ON c.course_code = co.course_code
       LEFT JOIN "User" u ON c.doctor_id = u.user_id
       INNER JOIN Enrollment e ON c.class_id = e.class_id
       WHERE e.user_id = $1`,
      [studentId]
  );
  const classes = classesResult.rows || [];

  res.json({ success: httpstatustext.success, data: classes });
});

// POST /classes — Admin only
const createClass = asyncWrapper(async (req, res) => {
  const { course_code, doctor_id, semester, level, capacity } = req.body;

  if (!course_code || !doctor_id || !semester || !level || !capacity) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Missing required fields' } });
  }

  const result = await classQueries.create({
    course_code: course_code,
    doctor_id: doctor_id,
    semester: semester,
    level: level,
    capacity: capacity
  });

  res.status(201).json({ success: httpstatustext.success, data: { class_id: result.class_id } });
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

  const studentsResult = await db.query(
      `SELECT 
        u.user_id, u.f_name, u.l_name, u.email,
        s.academic_level, s.payment_status, s.nfc_tag_id
       FROM Enrollment e
       INNER JOIN "User" u ON e.user_id = u.user_id
       INNER JOIN Student s ON e.user_id = s.user_id
       WHERE e.class_id = $1`,
      [classId]
  );
  const students = studentsResult.rows || [];

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
    return res.status(400).json({
      success: httpstatustext.error,
      message: { msg: enrollmentCheck.message },
      warnings: enrollmentCheck.warnings || []
    });
  }

  // تحقق من المتطلبات السابقة (Prerequisites)
  const prereqCheck = await gpaService.checkPrerequisites(student_id, classId);
  if (!prereqCheck.canEnroll) {
    return res.status(400).json({
      success: httpstatustext.error,
      message: { msg: prereqCheck.message },
      missingPrereqs: prereqCheck.missingPrereqs || []
    });
  }

  // تأكد إن الـ student مش enrolled بالفعل
  const existingResult = await db.query(
      `SELECT * FROM Enrollment WHERE class_id = $1 AND user_id = $2`,
      [classId, student_id]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Student already enrolled' } });
  }

  // تأكد إن في capacity
  const enrolledCountResult = await db.query(
      `SELECT COUNT(*) AS count FROM Enrollment WHERE class_id = $1`,
      [classId]
  );
  const enrolledCount = enrolledCountResult.rows[0].count;

  if (enrolledCount >= cls.capacity) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Class is full' } });
  }

  await db.query(
      `INSERT INTO Enrollment (class_id, user_id) VALUES ($1, $2)`,
      [classId, student_id]
  );

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Student enrolled successfully' } });
});

// DELETE /classes/:classId/enroll/:studentId — Self-drop or admin
const dropStudent = asyncWrapper(async (req, res) => {
  const { classId, studentId } = req.params;

  const existingResult = await db.query(
      `SELECT * FROM Enrollment WHERE class_id = $1 AND user_id = $2`,
      [classId, studentId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Enrollment not found' } });
  }

  await db.query(
      `DELETE FROM Enrollment WHERE class_id = $1 AND user_id = $2`,
      [classId, studentId]
  );

  res.json({ success: httpstatustext.success, message: { msg: 'Dropped from class successfully' } });
});

// GET /classes/:classId/grades — Doctor only
const getClassGrades = asyncWrapper(async (req, res) => {
  const { classId } = req.params;

  const gradesResult = await db.query(
      `SELECT 
        g.user_id AS student_id,
        u.f_name || ' ' || u.l_name AS student_name,
        g.class_id,
        g.midterm, g.project, g.practical,
        g.attendance, g.final, g.gpa,
        g.max_midterm, g.max_project, g.max_practical, g.max_attendance, g.max_final,
        (g.midterm + g.project + g.practical + g.attendance + COALESCE(g.final, 0)) AS total
       FROM Grades g
       INNER JOIN "User" u ON g.user_id = u.user_id
       WHERE g.class_id = $1`,
      [classId]
  );
  const grades = (gradesResult.rows || []).map((row) => {
    const maxTotal = (row.max_midterm || 0) + (row.max_project || 0) + (row.max_practical || 0) + (row.max_attendance || 0) + (row.max_final || 0);
    const { letter, gpa: computedGpa } = gpaService.calculateCourseGPA(row.total, maxTotal);
    return { ...row, letter, gpa: computedGpa };
  });

  res.json({ success: httpstatustext.success, data: grades });
});

// GET /classes/:classId/grades/student/:studentId
const getStudentGrades = asyncWrapper(async (req, res) => {
  const { classId, studentId } = req.params;

  const gradesResult = await db.query(
      `SELECT 
        grade_id, class_id, user_id AS student_id,
        generate_at,
        attendance, practical, project, midterm, final, gpa,
        max_midterm, max_project, max_practical, max_attendance, max_final
       FROM Grades
       WHERE class_id = $1 AND user_id = $2`,
      [classId, studentId]
  );
  const grades = (gradesResult.rows || []).map((row) => {
    const total = (row.midterm || 0) + (row.project || 0) + (row.practical || 0) + (row.attendance || 0) + (row.final || 0);
    const maxTotal = (row.max_midterm || 0) + (row.max_project || 0) + (row.max_practical || 0) + (row.max_attendance || 0) + (row.max_final || 0);
    const { letter, gpa: computedGpa } = gpaService.calculateCourseGPA(total, maxTotal);
    return { ...row, letter, gpa: computedGpa };
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

  const existingResult = await db.query(
      `SELECT * FROM Grades WHERE user_id = $1 AND class_id = $2`,
      [student_id, classId]
  );
  const existing = existingResult.rows[0];

  const columnMap = {
    midterm: 'midterm',
    final: 'final',
    project: 'project',
    attendance: 'attendance',
    practical: 'practical'
  };

  const column = columnMap[type];

  // Perform Update or Insert
  if (existing) {
    await db.query(
      `UPDATE Grades SET ${column} = $1, generate_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND class_id = $3`,
      [grade, student_id, classId]
    );
  } else {
    await db.query(
      `INSERT INTO Grades (user_id, class_id, doctor_id, ${column}) VALUES ($1, $2, $3, $4)`,
      [student_id, classId, doctorId, grade]
    );
  }

  // RECALCULATE GPA
  const updatedGradeResult = await db.query(
      `SELECT * FROM Grades WHERE user_id = $1 AND class_id = $2`,
      [student_id, classId]
  );
  const updatedGrade = updatedGradeResult.rows[0];

  if (updatedGrade) {
    const totalMarks = (updatedGrade.midterm || 0) + (updatedGrade.project || 0) +
      (updatedGrade.practical || 0) + (updatedGrade.attendance || 0) +
      (updatedGrade.final || 0);
    const maxTotal = (updatedGrade.max_midterm || 0) + (updatedGrade.max_project || 0) +
      (updatedGrade.max_practical || 0) + (updatedGrade.max_attendance || 0) +
      (updatedGrade.max_final || 0);

    const courseGPA = gpaService.calculateCourseGPA(totalMarks, maxTotal).gpa;

    await db.query(
      `UPDATE Grades SET gpa = $1 WHERE user_id = $2 AND class_id = $3`,
      [courseGPA, student_id, classId]
    );

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