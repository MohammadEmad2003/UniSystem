const express = require("express");
const { getLecturesByClassID, createLecture, deleteLecture  , getMaterialsByLectureID} = require("../controllers/LectureController");
const { getLectureAttendance, recordAttendance } = require('../controllers/attendanceController');

const router = express.Router();
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const verifyToken = require("../middleware/verifytoken");

router.use(verifyToken);
router.get("/:classId/lectures", getLecturesByClassID);
router.post("/:classId/lectures" , allowedTo(userRoles.DOCTOR), createLecture);
router.delete("/lectures/:lecId" , allowedTo(userRoles.DOCTOR), deleteLecture);

router.get('/:lectureId/attendance', getLectureAttendance);
router.post('/:lectureId/attendance', allowedTo(userRoles.DOCTOR), recordAttendance);


module.exports = router;
