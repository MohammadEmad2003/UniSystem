const express = require('express');
const router = express.Router();
const { 
  getLectureAttendance, 
  getStudentAttendanceByClass, 
  recordAttendance,
  nfcAttendance,
  manualAttendance,
  onlineAttendance,
  scanCardOnly,
  readCardInfo 
} = require('../controllers/attendanceController');
const verifyToken = require('../middleware/verifytoken');

// NFC Attendance is called by hardware, might not have a user token
router.post('/nfc', nfcAttendance);
router.post('/manual', manualAttendance);
router.post('/nfc/scan', scanCardOnly);
router.post('/nfc/read-only', scanCardOnly);
router.post('/nfc/read-info', readCardInfo);


router.use(verifyToken);
router.post('/online', onlineAttendance);

router.get('/student/:studentId/class/:classId', getStudentAttendanceByClass);

module.exports = router;