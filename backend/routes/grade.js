const express = require("express");
const controller = require("../controllers/gradeController");
const verifyToken = require("../middleware/verifytoken");

const router = express.Router();

// ============ GRADES ROUTES ============

// GET STUDENT GRADES - Get all grades for a student across all classes
router.route("/student/:studentId")
  .get(verifyToken, controller.getStudentGrades);

module.exports = router;
