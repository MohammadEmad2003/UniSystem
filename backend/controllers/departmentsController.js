const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const departmentQueries = genericQueries("Department", {
  primaryKey: "Dept_ID",
});

const getAllDepartments = asyncWrapper(async (req, res) => {
  const departments = await new Promise((resolve, reject) => {
    db.all(
      `SELECT d.Dept_ID as dept_id, d.Dept_Name as dept_name, d.Doctor_ID as head_id, u.F_Name || ' ' || u.L_Name as head_name, d.Total_Hours_Required as total_hours_required
       FROM Department d 
       LEFT JOIN User u ON d.Doctor_ID = u.User_ID`,
      [],
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
  res.status(200).json({
    success: true,
    data: departments,
    message: "Departments fetched successfully",
  });
});

const createDepartment = asyncWrapper(async (req, res) => {
  const { dept_name, head_id, total_hours_required } = req.body;
  if (!dept_name) {
    return res.status(400).json({
      success: false,
      message: "dept_name is required",
    });
  }
  const exists = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Department WHERE Dept_Name = ?`,
      [dept_name],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      },
    );
  });

  if (exists) {
    return res.status(409).json({
      success: false,
      message: "Department name already exists",
    });
  }
  const newDepartmentId = await departmentQueries.create({
    Dept_Name: dept_name,
    Doctor_ID: head_id || null,
    Total_Hours_Required: total_hours_required || 144,
  });

  if (head_id) {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Doctor SET Permission = 1 WHERE User_ID = ?`,
        [head_id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  const newDepartment = await new Promise((resolve, reject) => {
    db.get(
      `SELECT d.Dept_ID as dept_id, d.Dept_Name as dept_name, d.Doctor_ID as head_id, u.F_Name || ' ' || u.L_Name as head_name, d.Total_Hours_Required as total_hours_required
       FROM Department d 
       LEFT JOIN User u ON d.Doctor_ID = u.User_ID
       WHERE d.Dept_ID = ?`,
      [newDepartmentId.lastID],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });

  res.status(201).json({
    success: true,
    data: newDepartment,
    message: "Department created successfully",
  });
});

const getSingleDepartment = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const department = await new Promise((resolve, reject) => {
    db.get(
      `SELECT d.Dept_ID as dept_id, d.Dept_Name as dept_name, d.Doctor_ID as head_id, u.F_Name || ' ' || u.L_Name as head_name, d.Total_Hours_Required as total_hours_required
       FROM Department d 
       LEFT JOIN User u ON d.Doctor_ID = u.User_ID
       WHERE d.Dept_ID = ?`,
      [departmentId],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }
  res.status(200).json({
    success: true,
    data: department,
    message: "Department fetched successfully",
  });
});

const updateDepartment = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const { dept_name, head_id, total_hours_required } = req.body;

  const existing = await departmentQueries.getById(departmentId);
  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  if (dept_name) {
    const duplicate = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Department WHERE Dept_Name = ? AND Dept_ID != ?`,
        [dept_name, departmentId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        },
      );
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Department name already exists",
      });
    }
  }

  const updateData = {};
  if (dept_name) updateData.Dept_Name = dept_name;
  if (head_id !== undefined) updateData.Doctor_ID = head_id;
  if (total_hours_required !== undefined) updateData.Total_Hours_Required = total_hours_required;

  await departmentQueries.update(departmentId, updateData);

  // Update permissions if head changed
  if (head_id !== undefined && existing.Doctor_ID !== head_id) {
    if (existing.Doctor_ID) {
      await db.run(`UPDATE Doctor SET Permission = NULL WHERE User_ID = ?`, [existing.Doctor_ID]);
    }
    if (head_id) {
      await db.run(`UPDATE Doctor SET Permission = 1 WHERE User_ID = ?`, [head_id]);
    }
  }

  const updatedDepartment = await new Promise((resolve, reject) => {
    db.get(
      `SELECT d.Dept_ID as dept_id, d.Dept_Name as dept_name, d.Doctor_ID as head_id, u.F_Name || ' ' || u.L_Name as head_name, d.Total_Hours_Required as total_hours_required
       FROM Department d 
       LEFT JOIN User u ON d.Doctor_ID = u.User_ID
       WHERE d.Dept_ID = ?`,
      [departmentId],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });

  res.status(200).json({
    success: true,
    data: updatedDepartment,
    message: "Department updated successfully",
  });
});

const deleteDepartment = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  await departmentQueries.delete(departmentId);
  res.status(200).json({
    success: true,
    message: "Department deleted successfully",
  });
});

const assignDoctor = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const { head_id } = req.body;

  const department = await departmentQueries.getById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  if (head_id) {
    const doctor = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM Doctor WHERE User_ID = ?`, [head_id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }
  }

  if (department.Doctor_ID && department.Doctor_ID !== head_id) {
    await db.run(`UPDATE Doctor SET Permission = NULL WHERE User_ID = ?`, [department.Doctor_ID]);
  }
  if (head_id) {
    await db.run(`UPDATE Doctor SET Permission = 1 WHERE User_ID = ?`, [head_id]);
  }

  await departmentQueries.update(departmentId, { Doctor_ID: head_id || null });

  const updatedDepartment = await new Promise((resolve, reject) => {
    db.get(
      `SELECT d.Dept_ID as dept_id, d.Dept_Name as dept_name, d.Doctor_ID as head_id, u.F_Name || ' ' || u.L_Name as head_name, d.Total_Hours_Required as total_hours_required
       FROM Department d 
       LEFT JOIN User u ON d.Doctor_ID = u.User_ID
       WHERE d.Dept_ID = ?`,
      [departmentId],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      }
    );
  });

  res.status(200).json({
    success: true,
    data: updatedDepartment,
    message: "Doctor assigned successfully",
  });
});

const setPermission = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const { permission } = req.body;

  const department = await departmentQueries.getById(departmentId);
  if (!department || !department.Doctor_ID) {
    return res.status(400).json({
      success: false,
      message: "Department not found or no doctor assigned",
    });
  }

  await db.run(`UPDATE Doctor SET Permission = ? WHERE User_ID = ?`, [permission, department.Doctor_ID]);

  res.status(200).json({
    success: true,
    message: "Permission set successfully",
  });
});

module.exports = {
  getAllDepartments,
  createDepartment,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
  assignDoctor,
  setPermission,
};
