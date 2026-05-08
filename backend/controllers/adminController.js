const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const bcrypt = require("bcryptjs");
const userQueries = genericQueries("User", { primaryKey: "User_ID" });
const doctorQueries = genericQueries("Doctor", { primaryKey: "User_ID" });
const departmentQueries = genericQueries("Department", {
  primaryKey: "Dept_ID",
});
const workInQueries = genericQueries("Work_In", { primaryKey: "Doctor_ID" }); // assuming composite key, but let's see
const adminQueries = genericQueries("Admin", { primaryKey: "User_ID" });
const getCount = (table, where = "") => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) as count FROM ${table} ${where}`, (err, row) => {
      if (err) reject(err);
      resolve(row ? row.count : 0);
    });
  });
};

const getUserWithRoleData = (userId, role) => {
  return new Promise((resolve, reject) => {
    const roleTable = role === "Doctor" ? "Doctor d" : "Admin a";
    const joinCondition = role === "Doctor" ? "d.User_ID" : "a.User_ID";
    const selectField =
      role === "Doctor"
        ? "d.Specialization as specialization"
        : "a.Permissions_Level as permissions_level";

    db.get(
      `SELECT u.User_ID as user_id, u.F_Name as f_name, u.L_Name as l_name, u.Email as email, u.Account_Status as account_status, u.Role as role,
              ${selectField}
       FROM User u
       JOIN ${roleTable} ON u.User_ID = ${joinCondition}
       WHERE u.User_ID = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      },
    );
  });
};

const getStats = asyncWrapper(async (req, res) => {
  const { dept_id } = req.query;
  
  let total_students, total_doctors, total_classes, total_courses, total_departments;
  const pending_approvals = dept_id ? 0 : await getCount("User", "WHERE Account_Status = 'pending'");

  if (dept_id) {
    const dId = Number(dept_id);
    total_students = await getCount("Student", `WHERE Dept_ID = ${dId}`);
    total_doctors = await new Promise((resolve) => {
      db.get(`SELECT COUNT(DISTINCT Doctor_ID) as count FROM Work_In WHERE Dept_ID = ?`, [dId], (err, row) => resolve(row?.count || 0));
    });
    total_classes = await new Promise((resolve) => {
      db.get(`SELECT COUNT(*) as count FROM Class cl JOIN Offers o ON cl.Course_Code = o.Course_Code WHERE o.Dept_ID = ?`, [dId], (err, row) => resolve(row?.count || 0));
    });
    total_courses = await new Promise((resolve) => {
      db.get(`SELECT COUNT(*) as count FROM Offers WHERE Dept_ID = ?`, [dId], (err, row) => resolve(row?.count || 0));
    });
    total_departments = 1;
  } else {
    total_students = await getCount("Student");
    total_doctors = await getCount("Doctor");
    total_classes = await getCount("Class");
    total_departments = await getCount("Department");
    total_courses = await getCount("Courses");
  }

  // Get department stats for the chart
  const dept_stats = await new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        d.Dept_ID as id, 
        d.Dept_Name as name,
        (SELECT COUNT(*) FROM Student s WHERE s.Dept_ID = d.Dept_ID) as students,
        (SELECT COUNT(DISTINCT Doctor_ID) FROM Work_In w WHERE w.Dept_ID = d.Dept_ID) as doctors
      FROM Department d
    `, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

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
    const whereClause = dept_id ? `WHERE s.Dept_ID = ?` : "";
    const params = dept_id ? [dept_id] : [];

  const students = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID as user_id, u.F_Name as f_name, u.L_Name as l_name, u.Email as email, u.Account_Status as account_status, u.Role as role,
              u.Document as document, u.Image_Url as image_url, s.Academic_Level as academic_level, s.Payment_Status as payment_status, s.Paid_Amount as paid_amount,
              s.NFC_Tag_ID as nfc_tag_id, s.SSN as ssn, s.Dept_ID as dept_id, s.Total_Hours as total_hours, s.Total_GPA as total_gpa,
              COALESCE(alf.Total_Fees, 0) as total_fees
       FROM User u
       JOIN Student s ON u.User_ID = s.User_ID
       LEFT JOIN Academic_Level_Fees alf ON s.Academic_Level = alf.Academic_Level AND alf.Semester = 'Fall'
       ${whereClause}`,
      params,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      },
    );
  });

  res.status(200).json({
    success: true,
    data: students,
  });
});

const getPendingStudents = asyncWrapper(async (req, res) => {
  const pendingStudents = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID as user_id, u.F_Name as f_name, u.L_Name as l_name, u.Email as email, u.Account_Status as account_status, u.Document as document,
              s.SSN as ssn, s.Academic_Level as academic_level
       FROM User u
       JOIN Student s ON u.User_ID = s.User_ID
       WHERE u.Role = 'Student'
       AND u.Account_Status = 'pending'`,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      },
    );
  });

  res.status(200).json({
    success: true,
    data: pendingStudents,
  });
});

const changeStudentStatus = asyncWrapper(async (req, res) => {
  const { studentId } = req.params;
  const { Account_Status: status } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Must be 'approved' or 'rejected'",
    });
  }

  const student = await userQueries.getById(studentId);

  if (!student || student.Role !== "Student") {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  if (student.Account_Status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "Student account is not pending",
    });
  }

  await userQueries.update(studentId, {
    Account_Status: status,
  });

  res.status(200).json({
    success: true,
    message: `Student ${status} successfully`,
  });
});

const getAllDoctors = asyncWrapper(async (req, res) => {
    const { dept_id } = req.query;
    const whereClause = dept_id ? `WHERE d.User_ID IN (SELECT Doctor_ID FROM Work_In WHERE Dept_ID = ?)` : "";
    const params = dept_id ? [dept_id] : [];

  const doctors = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID as user_id, u.F_Name as f_name, u.L_Name as l_name, u.Email as email, u.Account_Status as account_status, u.Role as role,
              u.Image_Url as image_url, d.Specialization as specialization
       FROM User u
       JOIN Doctor d ON u.User_ID = d.User_ID
       ${whereClause}`,
      params,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      },
    );
  });

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
    Password: hashedPassword,
    F_Name: f_name,
    L_Name: l_name,
    Email: email,
    Account_Status: "approved",
    Role: "Doctor",
  });
  const userId = userResult.lastID;

  await doctorQueries.create({
    User_ID: userId,
    Specialization: specialization || null,
  });

  if (department_ids && Array.isArray(department_ids)) {
    for (const dId of department_ids) {
      const dept = await departmentQueries.getById(dId);
      if (dept) {
        await workInQueries.create({
          Doctor_ID: userId,
          Dept_ID: dId,
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
    const deanExists = await new Promise((resolve) => {
      db.get(`SELECT * FROM Admin WHERE Permissions_Level = 1`, (err, row) =>
        resolve(!!row),
      );
    });
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
    Password: hashedPassword,
    F_Name: f_name,
    L_Name: l_name,
    Email: email,
    Account_Status: "approved",
    Role: "Admin",
  });
  const userId = userResult.lastID;

  await adminQueries.create({
    User_ID: userId,
    Permissions_Level: level,
  });

  const admin = await getUserWithRoleData(userId, "Admin");

  res.status(201).json({
    success: true,
    data: admin,
  });
});

const getAllAdmins = asyncWrapper(async (req, res) => {
  const admins = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID as user_id, u.F_Name as f_name, u.L_Name as l_name, u.Email as email, u.Account_Status as account_status, u.Role as role,
              a.Permissions_Level as permissions_level
       FROM User u
       JOIN Admin a ON u.User_ID = a.User_ID`,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows || []);
      },
    );
  });

  res.status(200).json({
    success: true,
    data: admins,
  });
});

const getAcademicLevelFees = asyncWrapper(async (req, res) => {
  const fees = await new Promise((resolve, reject) => {
    db.all(`SELECT * FROM Academic_Level_Fees`, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
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
    INSERT INTO Academic_Level_Fees (Academic_Level, Semester, Total_Fees, Max_Hours, Min_Hours, Hour_Price) 
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(Academic_Level, Semester) DO UPDATE SET
      Total_Fees = COALESCE(excluded.Total_Fees, Total_Fees),
      Max_Hours = COALESCE(excluded.Max_Hours, Max_Hours),
      Min_Hours = COALESCE(excluded.Min_Hours, Min_Hours),
      Hour_Price = COALESCE(excluded.Hour_Price, Hour_Price)
  `;

  await new Promise((resolve, reject) => {
    db.run(
      query,
      [academic_level, semester, total_fees ?? null, max_hours ?? null, min_hours ?? null, hour_price ?? null],
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });

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
  const userId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO User (F_Name, L_Name, Email, Password, Role, Account_Status) VALUES (?, ?, ?, ?, 'Student', 'approved')`,
      [f_name, l_name, email, hashedPassword],
      function (err) {
        if (err) reject(err);
        resolve(this.lastID);
      },
    );
  });

  // Create Student
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Student (User_ID, SSN, Academic_Level, Dept_ID, Payment_Status, Paid_Amount) VALUES (?, ?, ?, ?, 'Unpaid', 0)`,
      [userId, ssn, academic_level, department_id || null],
      (err) => {
        if (err) reject(err);
        resolve();
      },
    );
  });

  res.status(201).json({
    success: true,
    message: "Student created and approved successfully",
    data: { user_id: userId, f_name, l_name, email },
  });
});

const getFinancialStats = asyncWrapper(async (req, res) => {
  const stats = await new Promise((resolve, reject) => {
    db.all(
      `
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN u.Account_Status = 'pending' THEN 1 ELSE 0 END) as pending_students,
        SUM(CASE WHEN u.Account_Status = 'approved' THEN 1 ELSE 0 END) as approved_students,
        SUM(s.Paid_Amount) as total_paid,
        SUM(
          CASE 
            WHEN f.Hour_Price > 0 THEN (
              SELECT COALESCE(SUM(co.Credit_Hours), 0) * f.Hour_Price
              FROM Enrollment e 
              JOIN Class cl ON e.Class_ID = cl.Class_ID 
              JOIN Courses co ON cl.Course_Code = co.Course_Code 
              WHERE e.User_ID = s.User_ID
            )
            ELSE COALESCE(f.Total_Fees, 0)
          END
        ) as total_expected
      FROM User u
      JOIN Student s ON u.User_ID = s.User_ID
      LEFT JOIN Academic_Level_Fees f ON s.Academic_Level = f.Academic_Level AND f.Semester = 'Fall'
      WHERE u.Role = 'Student'
    `,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows[0]);
      },
    );
  });

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
    ? `SELECT c.* FROM Courses c JOIN Offers o ON c.Course_Code = o.Course_Code WHERE o.Dept_ID = ?`
    : `SELECT * FROM Courses`;
  const params = dept_id ? [dept_id] : [];

  const courses = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });

  res.status(200).json({
    success: true,
    data: courses,
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
};
