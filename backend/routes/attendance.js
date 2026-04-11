const express = require('express');
const router = express.Router();
const { getLectureAttendance, getStudentAttendanceByClass, recordAttendance } = require('../controllers/attendanceController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

router.get('/student/:studentId/class/:classId', getStudentAttendanceByClass);

module.exports = router;