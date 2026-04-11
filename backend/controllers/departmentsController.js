const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require("../utilities/genericQueries");
const db = require("../utilities/database");
const departmentQueries = genericQueries("Department", {
  primaryKey: "Dept_ID",
});

const getAllDepartments = asyncWrapper(async (req, res) => {
  const departments = await departmentQueries.getAll();
  res.status(200).json({
    success: true,
    data: departments,
    message: "Departments fetched successfully",
  });
});

const createDepartment = asyncWrapper(async (req, res) => {
  if (!req.body.Dept_Name) {
    return res.status(400).json({
      success: false,
      message: "Dept_Name is required",
    });
  }
  const exists = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Department WHERE Dept_Name = ?`,
      [req.body.Dept_Name],
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
  const newDepartmentId = await departmentQueries.create(req.body);
  const newDepartment = await departmentQueries.getById(newDepartmentId.lastID);
  res.status(201).json({
    success: true,
    data: newDepartment,
    message: "Department created successfully",
  });
});

const getSingleDepartment = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const department = await departmentQueries.getById(departmentId);
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

  const existing = await departmentQueries.getById(departmentId);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  if (req.body.Dept_Name) {
    const duplicate = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM Department 
         WHERE Dept_Name = ? AND Dept_ID != ?`,
        [req.body.Dept_Name, departmentId],
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

  await departmentQueries.update(departmentId, req.body);

  const updatedDepartment = await departmentQueries.getById(departmentId);

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
  const { Doctor_ID } = req.body;

  const department = await departmentQueries.getById(departmentId);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  const doctor = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Doctor WHERE User_ID = ?`,
      [Doctor_ID],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      },
    );
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: "Doctor not found",
    });
  }

  await departmentQueries.update(departmentId, {
    Doctor_ID,
  });

  const updatedDepartment = await departmentQueries.getById(departmentId);

  res.status(200).json({
    success: true,
    data: updatedDepartment,
    message: "Doctor assigned successfully",
  });
});

const setPermission = asyncWrapper(async (req, res) => {
  const { departmentId } = req.params;
  const { Permission } = req.body;

  const department = await departmentQueries.getById(departmentId);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: "Department not found",
    });
  }

  await departmentQueries.update(departmentId, {
    Permission,
  });

  const updatedDepartment = await departmentQueries.getById(departmentId);

  res.status(200).json({
    success: true,
    data: updatedDepartment,
    message: "Permission updated successfully",
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
