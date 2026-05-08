const express = require("express");
const {
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
} = require("../controllers/adminController");

const verifyToken = require("../middleware/verifytoken");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const router = express.Router();

router.use(verifyToken);

router.route("/stats").get(allowedTo(userRoles.ADMIN, userRoles.DOCTOR), getStats);

router.route("/students/pending").get(allowedTo(userRoles.ADMIN), getPendingStudents);
router.route("/students")
  .get(allowedTo(userRoles.ADMIN, userRoles.DOCTOR), getAllStudents)
  .post(allowedTo(userRoles.ADMIN), createStudent);

router.route("/students/:studentId/status").patch(allowedTo(userRoles.ADMIN), changeStudentStatus);
router.route("/financial-stats").get(allowedTo(userRoles.ADMIN), getFinancialStats);

router.route("/doctors").get(allowedTo(userRoles.ADMIN, userRoles.DOCTOR), getAllDoctors);
router.route("/doctors").post(allowedTo(userRoles.ADMIN), createDoctor);

router.route("/admins")
  .get(allowedTo(userRoles.ADMIN), getAllAdmins)
  .post(allowedTo(userRoles.ADMIN), createAdmin);

router.route("/fees")
  .get(allowedTo(userRoles.ADMIN, userRoles.DOCTOR, userRoles.STUDENT), getAcademicLevelFees)
  .post(allowedTo(userRoles.ADMIN), setAcademicLevelFees);

router.route("/courses").get(allowedTo(userRoles.ADMIN, userRoles.DOCTOR), getAllCourses);

module.exports = router;
