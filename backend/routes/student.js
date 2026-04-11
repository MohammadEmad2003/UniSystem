const express = require("express");
const { getStudentStats, getAllStudents } = require("../controllers/studentController");

const router = express.Router();

router.get("/:studentId/stats", getStudentStats);
router.get("/", getAllStudents);

module.exports = router;
