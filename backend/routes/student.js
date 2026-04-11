const express = require("express");
const { getStudentStats, getAllStudents } = require("../controllers/studentController");
const verifyToken = require("../middleware/verifytoken");
const router = express.Router();

router.use(verifyToken);

router.get("/:studentId/stats", getStudentStats);
router.get("/", getAllStudents);

module.exports = router;
