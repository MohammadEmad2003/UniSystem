const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const bcrypt = require("bcryptjs");
const userQueries = genericQueries("User", { primaryKey: "user_id" });
const doctorQueries = genericQueries("Doctor", { primaryKey: "user_id" });
const departmentQueries = genericQueries("Department", {
  primaryKey: "dept_id",
});
const workInQueries = genericQueries("Work_In", { primaryKey: "doctor_id" });
const adminQueries = genericQueries("Admin", { primaryKey: "user_id" });
const getCount = async (table, where = "") => {
  const result = await db.query(`SELECT COUNT(*) as count FROM ${table} ${where}`);
  return result.rows[0] ? result.rows[0].count : 0;
};

const getUserWithRoleData = async (userId, role) => {
  const roleTable = role === "Doctor" ? "Doctor d" : "Admin a";
  const joinCondition = role === "Doctor" ? "d.user_id" : "a.user_id";
  const selectField =
    role === "Doctor"
      ? "d.specialization as specialization"
      : "a.permissions_level as permissions_level";

  const result = await db.query(
    `SELECT u.user_id, u.f_name, u.l_name, u.email, u.account_status, u.role,
            ${selectField}
     FROM "User" u
     JOIN ${roleTable} ON u.user_id = ${joinCondition}
     WHERE u.user_id = $1`,
    [userId]
  );
  return result.rows[0];
};

const getStats = asyncWrapper(async (req, res) => {
  const { dept_id } = req.query;
  
  let total_students, total_doctors, total_classes, total_courses, total_departments;
  const pending_approvals = dept_id ? 0 : await getCount("\"User\"", "WHERE account_status = 'pending'");

  if (dept_id) {
    const dId = Number(dept_id);
    total_students = await getCount("Student", `WHERE dept_id = ${dId}`);
    const doctorsResult = await db.query(`SELECT COUNT(DISTINCT doctor_id) as count FROM Work_In WHERE dept_id = $1`, [dId]);
    total_doctors = doctorsResult.rows[0]?.count || 0;
    const classesResult = await db.query(`SELECT COUNT(*) as count FROM Class cl JOIN Offers o ON cl.course_code = o.course_code WHERE o.dept_id = $1`, [dId]);
    total_classes = classesResult.rows[0]?.count || 0;
    const coursesResult = await db.query(`SELECT COUNT(*) as count FROM Offers WHERE dept_id = $1`, [dId]);
    total_courses = coursesResult.rows[0]?.count || 0;
    total_departments = 1;
  } else {
    total_students = await getCount("Student");
    total_doctors = await getCount("Doctor");
    total_classes = await getCount("Class");
    total_departments = await getCount("Department");
    total_courses = await getCount("Courses");
  }

  // Get department stats for the chart
  const deptStatsResult = await db.query(`
      SELECT 
        d.dept_id as id, 
        d.dept_name as name,
        (SELECT COUNT(*) FROM Student s WHERE s.dept_id = d.dept_id) as students,
        (SELECT COUNT(DISTINCT doctor_id) FROM Work_In w WHERE w.dept_id = d.dept_id) as doctors
      FROM Department d
    `);
  const dept_stats = deptStatsResult.rows || [];

  res.status(200).json({
    success: true,
    data: {
      total_students,
      total_doctors,
      total_classes,
      total_departments,
      total_courses,
      pending_approvals,
      dept_stats
    },
  });
});

const getAllStudents = asyncWrapper(async (req, res) => {
    const { dept_id } = req.query;
    const whereClause = dept_id ? `WHERE s.dept_id = $1` : "";
    const params = dept_id ? [dept_id] : [];

  const studentsResult = await db.query(
      `SELECT u.user_id, u.f_name, u.l_name, u.email, u.account_status, u.role,
              u.document, u.image_url, s.academic_level, s.payment_status, s.paid_amount,
              s.nfc_tag_id, s.ssn, s.dept_id, s.total_hours, s.total_gpa,
              COALESCE(alf.total_fees, 0) as total_fees
       FROM "User" u
       JOIN Student s ON u.user_id = s.user_id
       LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND alf.semester = 'Fall'
       ${whereClause}`,
      params
  );
  const students = studentsResult.rows || [];

  res.status(200).json({
    success: true,
    data: students,
  });
});

const getPendingStudents = asyncWrapper(async (req, res) => {
  const pendingStudentsResult = await db.query(
      `SELECT u.user_id, u.f_name, u.l_name, u.email, u.account_status, u.document,
              s.ssn, s.academic_level
       FROM "User" u
       JOIN Student s ON u.user_id = s.user_id
       WHERE u.role = 'Student'
       AND u.account_status = 'pending'`
  );
  const pendingStudents = pendingStudentsResult.rows || [];

  res.status(200).json({
    success: true,
    data: pendingStudents,
  });
});

const changeStudentStatus = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;
  const { status } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be 'approved' or 'rejected'",
    });
  }

  const student = await userQueries.getById(studentId);

  if (!student || student.role !== "Student") {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  if (student.account_status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Student account is not pending",
    });
  }

  await userQueries.update(studentId, {
    account_status: status,
  });

  res.status(200).json({
    success: true,
    message: `Student ${status} successfully`,
  });
});

const getAllDoctors = asyncWrapper(async (req, res) => {
    const { dept_id } = req.query;
    const whereClause = dept_id ? `WHERE d.user_id IN (SELECT doctor_id FROM Work_In WHERE dept_id = $1)` : "";
    const params = dept_id ? [dept_id] : [];

  const doctorsResult = await db.query(
      `SELECT u.user_id, u.f_name, u.l_name, u.email, u.account_status, u.role,
              u.image_url, d.specialization as specialization
       FROM "User" u
       JOIN Doctor d ON u.user_id = d.user_id
       ${whereClause}`,
      params
  );
  const doctors = doctorsResult.rows || [];

  res.status(200).json({
    success: true,
    data: doctors,
  });
});

const createDoctor = asyncWrapper(async (req, res) => {
  const { f_name, l_name, email, password, specialization, department_ids } =
    req.body;

  if (!f_name || !l_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${[!f_name && "f_name", !l_name && "l_name", !email && "email", !password && "password"].filter(Boolean).join(", ")}`,
    });
  }

  const existing = await userQueries.getByEmail(email);

  if (existing) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const userResult = await userQueries.create({
    password: hashedPassword,
    f_name: f_name,
    l_name: l_name,
    email: email,
    account_status: "approved",
    role: "Doctor",
  });
  const userId = userResult.user_id;

  await doctorQueries.create({
    user_id: userId,
    specialization: specialization || null,
  });

  if (department_ids && Array.isArray(department_ids)) {
    for (const dId of department_ids) {
      const dept = await departmentQueries.getById(dId);
      if (dept) {
        await workInQueries.create({
          doctor_id: userId,
          dept_id: dId,
        });
      }
    }
  }

  const doctor = await getUserWithRoleData(userId, "Doctor");

  res.status(201).json({
    success: true,
    data: doctor,
  });
});

const createAdmin = asyncWrapper(async (req, res) => {
  const { f_name, l_name, email, password } = req.body;

  if (!f_name || !l_name || !email || !password) {
    const error = new Error("f_name, l_name, email, and password are required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await userQueries.getByEmail(email);
  if (existing) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Ensure only one Dean (Level 1) exists - only block if level 1 is requested
  const level = req.body.permissions_level
    ? Number(req.body.permissions_level)
    : 2;
  if (level === 1) {
    const deanResult = await db.query(`SELECT * FROM Admin WHERE permissions_level = 1`);
    const deanExists = !!(deanResult.rows && deanResult.rows.length > 0);
    if (deanExists) {
      return res
        .status(400)
        .json({
          success: false,
          message: "System already has a Dean. Only one Dean is allowed.",
        });
    }
  }

  const userResult = await userQueries.create({
    password: hashedPassword,
    f_name: f_name,
    l_name: l_name,
    email: email,
    account_status: "approved",
    role: "Admin",
  });
  const userId = userResult.user_id;

  await adminQueries.create({
    user_id: userId,
    permissions_level: level,
  });

  const admin = await getUserWithRoleData(userId, "Admin");

  res.status(201).json({
    success: true,
    data: admin,
  });
});

const getAllAdmins = asyncWrapper(async (req, res) => {
  const adminsResult = await db.query(
      `SELECT u.user_id, u.f_name, u.l_name, u.email, u.account_status, u.role,
              a.permissions_level as permissions_level
       FROM "User" u
       JOIN Admin a ON u.user_id = a.user_id`
  );
  const admins = adminsResult.rows || [];

  res.status(200).json({
    success: true,
    data: admins,
  });
});

const getAcademicLevelFees = asyncWrapper(async (req, res) => {
  const feesResult = await db.query(`SELECT * FROM Academic_Level_Fees`);
  const fees = feesResult.rows || [];
  res.status(200).json({ success: true, data: fees });
});

const setAcademicLevelFees = asyncWrapper(async (req, res) => {
  const { academic_level, semester, total_fees, max_hours, min_hours, hour_price } = req.body;
  if (!academic_level || !semester) {
    return res.status(400).json({
      success: false,
      message: "academic_level and semester are required",
    });
  }

  const query = `
    INSERT INTO Academic_Level_Fees (academic_level, semester, total_fees, max_hours, min_hours, hour_price) 
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT(academic_level, semester) DO UPDATE SET
      total_fees = COALESCE(excluded.total_fees, Academic_Level_Fees.total_fees),
      max_hours = COALESCE(excluded.max_hours, Academic_Level_Fees.max_hours),
      min_hours = COALESCE(excluded.min_hours, Academic_Level_Fees.min_hours),
      hour_price = COALESCE(excluded.hour_price, Academic_Level_Fees.hour_price)
  `;

  await db.query(
    query,
    [academic_level, semester, total_fees ?? null, max_hours ?? null, min_hours ?? null, hour_price ?? null]
  );

  res.status(200).json({ success: true, message: "Academic level settings updated successfully" });
});

const createStudent = asyncWrapper(async (req, res) => {
  const {
    f_name,
    l_name,
    email,
    password,
    ssn,
    academic_level,
    department_id,
  } = req.body;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create User
  const userResult = await db.query(
      `INSERT INTO "User" (f_name, l_name, email, password, role, account_status) VALUES ($1, $2, $3, $4, 'Student', 'approved') RETURNING user_id`,
      [f_name, l_name, email, hashedPassword]
  );
  const userId = userResult.rows[0].user_id;

  // Create Student
  await db.query(
      `INSERT INTO Student (user_id, ssn, academic_level, dept_id, payment_status, paid_amount) VALUES ($1, $2, $3, $4, 'Unpaid', 0)`,
      [userId, ssn, academic_level, department_id || null]
  );

  res.status(201).json({
    success: true,
    message: "Student created and approved successfully",
    data: { user_id: userId, f_name, l_name, email },
  });
});

const getFinancialStats = asyncWrapper(async (req, res) => {
  const statsResult = await db.query(
      `
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN u.account_status = 'pending' THEN 1 ELSE 0 END) as pending_students,
        SUM(CASE WHEN u.account_status = 'approved' THEN 1 ELSE 0 END) as approved_students,
        SUM(s.paid_amount) as total_paid,
        SUM(
          CASE 
            WHEN f.hour_price > 0 THEN (
              SELECT COALESCE(SUM(co.credit_hours), 0) * f.hour_price
              FROM Enrollment e 
              JOIN Class cl ON e.class_id = cl.class_id 
              JOIN Courses co ON cl.course_code = co.course_code 
              WHERE e.user_id = s.user_id
            )
            ELSE COALESCE(f.total_fees, 0)
          END
        ) as total_expected
      FROM "User" u
      JOIN Student s ON u.user_id = s.user_id
      LEFT JOIN Academic_Level_Fees f ON s.academic_level = f.academic_level AND f.semester = 'Fall'
      WHERE u.role = 'Student'
    `
  );
  const stats = statsResult.rows[0];

  const total_expected = stats.total_expected || 0;
  const total_paid = stats.total_paid || 0;

  res.status(200).json({
    success: true,
    data: {
      ...stats,
      total_outstanding: total_expected - total_paid,
    },
  });
});

const getAllCourses = asyncWrapper(async (req, res) => {
  const { dept_id } = req.query;
  const query = dept_id 
    ? `SELECT c.* FROM Courses c JOIN Offers o ON c.course_code = o.course_code WHERE o.dept_id = $1`
    : `SELECT * FROM Courses`;
  const params = dept_id ? [dept_id] : [];

  const coursesResult = await db.query(query, params);
  const courses = coursesResult.rows || [];

  res.status(200).json({
    success: true,
    data: courses,
  });
});

const linkCard = asyncWrapper(async (req, res) => {
  const { userId, nfcTagId } = req.body || {};

  if (!userId || !nfcTagId) {
    return res.status(400).json({
      success: false,
      message: "userId and nfcTagId are required",
    });
  }

  const studentResult = await db.query(`SELECT user_id FROM Student WHERE user_id = $1`, [userId]);
  const student = studentResult.rows[0] || null;

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  const existingTagResult = await db.query(
      `SELECT user_id FROM Student WHERE nfc_tag_id = $1 AND user_id != $2`,
      [nfcTagId, userId]
  );
  const existingTag = existingTagResult.rows[0] || null;

  if (existingTag) {
    return res.status(409).json({
      success: false,
      message: "This NFC tag is already linked to another student",
    });
  }

  await db.query(
      `UPDATE Student SET nfc_tag_id = $1 WHERE user_id = $2`,
      [nfcTagId, userId]
  );

  return res.status(200).json({
    success: true,
    message: "Card linked successfully",
    data: { userId, nfcTagId },
  });
});

module.exports = {
  getStats,
  getAllStudents,
  getPendingStudents,
  changeStudentStatus,
  getAllDoctors,
  createDoctor,
  getAllAdmins,
  createAdmin,
  getAcademicLevelFees,
  setAcademicLevelFees,
  createStudent,
  getFinancialStats,
  getAllCourses,
  linkCard,
};
