const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const departmentQueries = genericQueries("Department", {
  primaryKey: "Dept_ID",
});

const getAllDepartments = asyncWrapper(async (req, res) => {
  const departmentsResult = await db.query(
      `SELECT d.dept_id, d.dept_name, d.doctor_id as head_id, u.f_name || ' ' || u.l_name as head_name, d.total_hours_required
       FROM Department d 
       LEFT JOIN "User" u ON d.doctor_id = u.user_id`
  );
  const departments = departmentsResult.rows || [];
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
  const existsResult = await db.query(
      `SELECT * FROM Department WHERE dept_name = $1`,
      [dept_name]
  );
  const exists = existsResult.rows[0];

  if (exists) {
    return res.status(409).json({
      success: false,
      message: "Department name already exists",
    });
  }
  const newDepartmentId = await departmentQueries.create({
    dept_name: dept_name,
    doctor_id: head_id || null,
    total_hours_required: total_hours_required || 144,
  });

  if (head_id) {
    await db.query(
      `UPDATE Doctor SET permission = 1 WHERE user_id = $1`,
      [head_id]
    );
  }

  const newDepartmentResult = await db.query(
      `SELECT d.dept_id, d.dept_name, d.doctor_id as head_id, u.f_name || ' ' || u.l_name as head_name, d.total_hours_required
       FROM Department d 
       LEFT JOIN "User" u ON d.doctor_id = u.user_id
       WHERE d.dept_id = $1`,
      [newDepartmentId.dept_id]
  );
  const newDepartment = newDepartmentResult.rows[0];

  res.status(201).json({
    success: true,
    data: newDepartment,
    message: "Department created successfully",
  });
});

const getSingleDepartment = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const departmentResult = await db.query(
      `SELECT d.dept_id, d.dept_name, d.doctor_id as head_id, u.f_name || ' ' || u.l_name as head_name, d.total_hours_required
       FROM Department d 
       LEFT JOIN "User" u ON d.doctor_id = u.user_id
       WHERE d.dept_id = $1`,
      [departmentId]
  );
  const department = departmentResult.rows[0];
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
    const duplicateResult = await db.query(
        `SELECT * FROM Department WHERE dept_name = $1 AND dept_id != $2`,
        [dept_name, departmentId]
    );
    const duplicate = duplicateResult.rows[0];

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Department name already exists",
      });
    }
  }

  const updateData = {};
  if (dept_name) updateData.dept_name = dept_name;
  if (head_id !== undefined) updateData.doctor_id = head_id;
  if (total_hours_required !== undefined) updateData.total_hours_required = total_hours_required;

  await departmentQueries.update(departmentId, updateData);

  // Update permissions if head changed
  if (head_id !== undefined && existing.doctor_id !== head_id) {
    if (existing.doctor_id) {
      await db.query(`UPDATE Doctor SET permission = NULL WHERE user_id = $1`, [existing.doctor_id]);
    }
    if (head_id) {
      await db.query(`UPDATE Doctor SET permission = 1 WHERE user_id = $1`, [head_id]);
    }
  }

  const updatedDepartmentResult = await db.query(
      `SELECT d.dept_id, d.dept_name, d.doctor_id as head_id, u.f_name || ' ' || u.l_name as head_name, d.total_hours_required
       FROM Department d 
       LEFT JOIN "User" u ON d.doctor_id = u.user_id
       WHERE d.dept_id = $1`,
      [departmentId]
  );
  const updatedDepartment = updatedDepartmentResult.rows[0];

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
    const doctorResult = await db.query(`SELECT * FROM Doctor WHERE user_id = $1`, [head_id]);
    const doctor = doctorResult.rows[0];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }
  }

  if (department.doctor_id && department.doctor_id !== head_id) {
    await db.query(`UPDATE Doctor SET permission = NULL WHERE user_id = $1`, [department.doctor_id]);
  }
  if (head_id) {
    await db.query(`UPDATE Doctor SET permission = 1 WHERE user_id = $1`, [head_id]);
  }

  await departmentQueries.update(departmentId, { doctor_id: head_id || null });

  const updatedDepartmentResult = await db.query(
      `SELECT d.dept_id, d.dept_name, d.doctor_id as head_id, u.f_name || ' ' || u.l_name as head_name, d.total_hours_required
       FROM Department d 
       LEFT JOIN "User" u ON d.doctor_id = u.user_id
       WHERE d.dept_id = $1`,
      [departmentId]
  );
  const updatedDepartment = updatedDepartmentResult.rows[0];

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
  if (!department || !department.doctor_id) {
    return res.status(400).json({
      success: false,
      message: "Department not found or no doctor assigned",
    });
  }

  await db.query(`UPDATE Doctor SET permission = $1 WHERE user_id = $2`, [permission, department.doctor_id]);

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
