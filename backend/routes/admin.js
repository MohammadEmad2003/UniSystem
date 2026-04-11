const express = require("express");
const {
  getStats,
  getAllStudents,
  getPendingStudents,
  changeStudentStatus,
  getAllDoctors,
  createDoctor,
  createAdmin,
} = require("../controllers/adminController");

const verifyToken = require("../middleware/verifytoken");
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const router = express.Router();

router.use(verifyToken);
router.use(allowedTo(userRoles.ADMIN));

router.route("/stats").get(getStats);

router.route("/students/pending").get(getPendingStudents);
router.route("/students").get(getAllStudents);
router.route("/students/:studentId/status").patch(changeStudentStatus);

router.route("/doctors").get(getAllDoctors);
router.route("/doctors").post(createDoctor);

router.route("/admins").post(createAdmin);

module.exports = router;
