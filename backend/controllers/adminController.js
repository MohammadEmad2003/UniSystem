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
const studentQueries = genericQueries("Student", { primaryKey: "User_ID" });

let isScanningSessionActive = false;

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
      role === "Doctor" ? "d.Specialization" : "a.Permissions_Level";

    db.get(
      `SELECT u.User_ID, u.F_Name, u.L_Name, u.Email, u.Account_Status, u.Role,
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
  const total_students = await getCount("Student");
  const total_doctors = await getCount("Doctor");
  const total_classes = await getCount("Class");
  const total_departments = await getCount("Department");
  const total_courses = await getCount("Courses");
  const pending_approvals = await getCount(
    "User",
    "WHERE Account_Status = 'pending'",
  );

  res.status(200).json({
    success: true,
    data: {
      total_students,
      total_doctors,
      total_classes,
      total_departments,
      total_courses,
      pending_approvals,
    },
  });
});

const getAllStudents = asyncWrapper(async (req, res) => {
  const students = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID, u.F_Name, u.L_Name, u.Email, u.Account_Status, u.Role,
              u.Document, u.Image_Url, s.Academic_Level, s.Payment_Status,
              s.NFC_Tag_ID, s.SSN, s.Dept_ID, s.Total_Hours, s.Total_GPA
       FROM User u
       JOIN Student s ON u.User_ID = s.User_ID`,
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
      `SELECT u.User_ID, u.F_Name, u.L_Name, u.Email, u.Account_Status, u.Document,
              s.SSN, s.Academic_Level
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

  if (!status || !['approved', 'rejected'].includes(status)) {
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
  const doctors = await new Promise((resolve, reject) => {
    db.all(
      `SELECT u.User_ID, u.F_Name, u.L_Name, u.Email, u.Account_Status, u.Role,
              u.Image_Url, d.Specialization
       FROM User u
       JOIN Doctor d ON u.User_ID = d.User_ID`,
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
  const { f_name, l_name, email, password, specialization, department_id } =
    req.body;

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

  if (department_id) {
    const dept = await departmentQueries.getById(department_id);
    if (dept) {
      await workInQueries.create({
        Doctor_ID: userId,
        Dept_ID: department_id,
      });
    }
  }

  const doctor = await getUserWithRoleData(userId, "Doctor");

  res.status(201).json({
    success: true,
    data: doctor,
  });
});

const createAdmin = asyncWrapper(async (req, res) => {
  const { f_name, l_name, email, password, permissions_level } = req.body;

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

  const userResult = await userQueries.create({
    Password: hashedPassword,
    F_Name: f_name,
    L_Name: l_name,
    Email: email,
    Account_Status: "approved",
    Role: "Admin",
  });
  const userId = userResult.lastID;

  const level = typeof permissions_level === "number" ? permissions_level : 1;
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

const linkNfcCard = asyncWrapper(async (req, res) => {
  const { userId, nfcTagId } = req.body;

  if (!userId || !nfcTagId) {
    return res.status(400).json({
      success: false,
      message: "userId and nfcTagId are required",
    });
  }

  // Check if student exists
  const student = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Student WHERE User_ID = ?`, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found",
    });
  }

  // Update NFC Tag ID
  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE Student SET NFC_Tag_ID = ? WHERE User_ID = ?`,
      [nfcTagId, userId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.status(200).json({
    success: true,
    message: "NFC Tag linked successfully",
  });
});

const changeUserRole = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  const { role: newRole, permissions_level, specialization, academic_level, ssn } = req.body;

  const validRoles = ["Admin", "Doctor", "Student"];
  if (!newRole || !validRoles.includes(newRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing role. Must be 'Admin', 'Doctor', or 'Student'",
    });
  }

  const user = await userQueries.getById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const currentRole = user.Role;
  if (currentRole === newRole) {
    return res.status(200).json({
      success: true,
      message: `User is already a ${newRole}`,
    });
  }

  // 1. Remove from old specialized table
  if (currentRole === "Admin") {
    await adminQueries.delete(userId);
  } else if (currentRole === "Doctor") {
    await doctorQueries.delete(userId);
    // Also remove from Work_In if exists
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM Work_In WHERE Doctor_ID = ?`, [userId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } else if (currentRole === "Student") {
    await studentQueries.delete(userId);
    // Also remove from Enrollment if exists
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM Enrollment WHERE User_ID = ?`, [userId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // 2. Update Role in User table
  await userQueries.update(userId, { Role: newRole });

  // 3. Add to new specialized table
  if (newRole === "Admin") {
    await adminQueries.create({
      User_ID: userId,
      Permissions_Level: permissions_level || 1,
    });
  } else if (newRole === "Doctor") {
    await doctorQueries.create({
      User_ID: userId,
      Specialization: specialization || null,
    });
  } else if (newRole === "Student") {
    await studentQueries.create({
      User_ID: userId,
      Academic_Level: academic_level || 1,
      Payment_Status: "Unpaid",
      SSN: ssn || `MIG-${userId}-${Date.now()}`, // Ensure uniqueness
    });
  }

  res.status(200).json({
    success: true,
    message: `User role changed from ${currentRole} to ${newRole} successfully`,
  });
});

const startScanningSession = asyncWrapper(async (req, res) => {
  isScanningSessionActive = true;
  res.status(200).json({
    success: true,
    message: "NFC Scanning session started",
  });
});

const stopScanningSession = asyncWrapper(async (req, res) => {
  isScanningSessionActive = false;
  res.status(200).json({
    success: true,
    message: "NFC Scanning session stopped",
  });
});

const checkScanningSession = () => isScanningSessionActive;

module.exports = {


  getStats,
  getAllStudents,
  getPendingStudents,
  changeStudentStatus,
  getAllDoctors,
  createDoctor,
  createAdmin,
  linkNfcCard,
  changeUserRole,
};



