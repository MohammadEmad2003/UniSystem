const express = require("express");
const { getLecturesByClassID, getLectureById, createLecture, updateLecture, deleteLecture, startLecture, endLecture, getMaterialsByLectureID } = require("../controllers/LectureController");
const {
  getLectureAttendance,
  getAttendanceByLectureAndStudent,
  updateAttendanceByLectureAndStudent,
  deleteAttendanceByLectureAndStudent,
  recordAttendance
} = require('../controllers/attendanceController');

const router = express.Router();
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const verifyToken = require("../middleware/verifytoken");

router.use(verifyToken);
router.get("/:classId/lectures", getLecturesByClassID);
router.get("/lectures/:lecId", getLectureById);
router.post("/:classId/lectures" , allowedTo(userRoles.DOCTOR), createLecture);
router.put("/lectures/:lecId", allowedTo(userRoles.DOCTOR), updateLecture);
router.delete("/lectures/:lecId" , allowedTo(userRoles.DOCTOR), deleteLecture);

router.get('/:lectureId/attendance', getLectureAttendance);
router.post('/:lectureId/attendance', allowedTo(userRoles.DOCTOR), recordAttendance);
router.get('/:lectureId/attendance/:studentId', allowedTo(userRoles.DOCTOR, userRoles.ADMIN), getAttendanceByLectureAndStudent);
router.put('/:lectureId/attendance/:studentId', allowedTo(userRoles.DOCTOR), updateAttendanceByLectureAndStudent);
router.delete('/:lectureId/attendance/:studentId', allowedTo(userRoles.DOCTOR), deleteAttendanceByLectureAndStudent);

router.post('/lectures/:lecId/start', allowedTo(userRoles.DOCTOR), startLecture);
router.post('/lectures/:lecId/end', allowedTo(userRoles.DOCTOR), endLecture);


module.exports = router;
