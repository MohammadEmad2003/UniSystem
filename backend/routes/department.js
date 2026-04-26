const express = require("express");
const {
  getAllDepartments,
  createDepartment,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
  assignDoctor,
  setPermission,
} = require("../controllers/departmentsController");

const verifyToken = require("../middleware/verifytoken");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const router = express.Router();

router
  .route("/")
  .get(getAllDepartments)
  .post(verifyToken, allowedTo(userRoles.ADMIN), createDepartment);

router
  .route("/:departmentId")
  .get(verifyToken, getSingleDepartment)
  .patch(verifyToken, allowedTo(userRoles.ADMIN), updateDepartment)
  .delete(verifyToken, allowedTo(userRoles.ADMIN), deleteDepartment);

router
  .route("/:departmentId/assigndoctor")
  .patch(verifyToken, allowedTo(userRoles.ADMIN), assignDoctor);

router
  .route("/:departmentId/setpermission")
  .patch(verifyToken, allowedTo(userRoles.ADMIN), setPermission);

module.exports = router;
