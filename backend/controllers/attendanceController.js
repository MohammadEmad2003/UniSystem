const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');

// GET /lectures/:lectureId/attendance
const getLectureAttendance = asyncWrapper(async (req, res) => {
  const { lectureId } = req.params;

  const records = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        a.Attendance_ID, a.Lec_ID, a.User_ID AS Student_ID,
        u.F_Name || ' ' || u.L_Name AS Student_Name,
        a.Time, a.Is_Verified, a.Status
       FROM Attendance a
       INNER JOIN User u ON a.User_ID = u.User_ID
       WHERE a.Lec_ID = ?`,
      [lectureId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: records });
});

// GET /attendance/student/:studentId/class/:classId
const getStudentAttendanceByClass = asyncWrapper(async (req, res) => {
  const { studentId, classId } = req.params;

  const records = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        a.Attendance_ID, a.Lec_ID, a.User_ID AS Student_ID,
        u.F_Name || ' ' || u.L_Name AS Student_Name,
        a.Time, a.Is_Verified, a.Status
       FROM Attendance a
       INNER JOIN User u ON a.User_ID = u.User_ID
       INNER JOIN Lecture l ON a.Lec_ID = l.Lec_ID
       WHERE a.User_ID = ? AND l.Class_ID = ?`,
      [studentId, classId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json({ success: httpstatustext.success, data: records });
});

// POST /lectures/:lectureId/attendance — Doctor only
const recordAttendance = asyncWrapper(async (req, res) => {
  const { lectureId } = req.params;
  const { student_id, status, is_verified } = req.body;

  if (!student_id || !status) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'student_id and status are required' } });
  }

  // تأكد إن الـ lecture موجودة
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lectureId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(404).json({ success: httpstatustext.error, message: { msg: 'Lecture not found' } });
  }

  // تأكد مش سجّل قبل كده
  const existing = await new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Attendance WHERE User_ID = ? AND Lec_ID = ?`,
      [student_id, lectureId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (existing) {
    return res.status(400).json({ success: httpstatustext.error, message: { msg: 'Attendance already recorded' } });
  }

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Attendance (User_ID, Lec_ID, Is_Verified, Status) VALUES (?, ?, ?, ?)`,
      [student_id, lectureId, is_verified ? 1 : 0, status],
      function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID });
      }
    );
  });

  res.status(201).json({ success: httpstatustext.success, message: { msg: 'Attendance recorded successfully' } });
});

module.exports = { getLectureAttendance, getStudentAttendanceByClass, recordAttendance };