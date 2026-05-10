const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');
const adminController = require('./adminController');

// GET /lectures/:lectureId/attendance

const getLectureAttendance = asyncWrapper(async (req, res) => {
  const { lectureId } = req.params;

  const records = await new Promise((resolve, reject) => {
    db.all(
      `SELECT 
        a.Attendance_ID, a.Lec_ID, a.User_ID AS Student_ID,
        u.F_Name || ' ' || u.L_Name AS Student_Name,
        a.Time, a.Early_Check, a.Late_Check, a.Method
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
        a.Time, a.Early_Check, a.Late_Check, a.Method
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

// GET /lectures/:lectureId/attendance/:studentId  (Doctor/Admin)
const getAttendanceByLectureAndStudent = asyncWrapper(async (req, res) => {
  const { lectureId, studentId } = req.params;

  const record = await new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        a.Attendance_ID, a.Lec_ID, a.User_ID AS Student_ID,
        u.F_Name || ' ' || u.L_Name AS Student_Name,
        a.Time, a.Early_Check, a.Late_Check, a.Method
       FROM Attendance a
       INNER JOIN User u ON a.User_ID = u.User_ID
       WHERE a.Lec_ID = ? AND a.User_ID = ?`,
      [lectureId, studentId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

  if (!record) {
    return res.status(404).json({ success: httpstatustext.error, message: "Attendance not found" });
  }

  res.json({ success: httpstatustext.success, data: record });
});

// PUT /lectures/:lectureId/attendance/:studentId  (Doctor only)
// body: { earlyCheck?: 0|1|boolean, lateCheck?: 0|1|boolean, method?: 'manual'|'nfc'|'online' }
const updateAttendanceByLectureAndStudent = asyncWrapper(async (req, res) => {
  const { lectureId, studentId } = req.params;
  const { earlyCheck, lateCheck, method } = req.body || {};

  const normalizeBool01 = (v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v ? 1 : 0;
    if (typeof v === 'string') return (v === '1' || v.toLowerCase() === 'true') ? 1 : 0;
    return undefined;
  };

  const early = normalizeBool01(earlyCheck);
  const late = normalizeBool01(lateCheck);

  if (early === undefined && late === undefined && !method) {
    return res.status(400).json({ success: httpstatustext.error, message: "No fields to update" });
  }

  // Ensure record exists first
  const existing = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Attendance WHERE User_ID = ? AND Lec_ID = ?`, [studentId, lectureId], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

  if (!existing) {
    return res.status(404).json({ success: httpstatustext.error, message: "Attendance not found" });
  }

  const nextEarly = early !== undefined ? early : existing.Early_Check;
  const nextLate = late !== undefined ? late : existing.Late_Check;
  const nextMethod = method || existing.Method;
  const nextTime = new Date().toISOString();

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE Attendance SET Early_Check = ?, Late_Check = ?, Method = ?, Time = ? WHERE User_ID = ? AND Lec_ID = ?`,
      [nextEarly, nextLate, nextMethod, nextTime, studentId, lectureId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });

  res.json({
    success: httpstatustext.success,
    message: "Attendance updated",
    data: { lectureId: Number(lectureId), studentId: Number(studentId), earlyCheck: nextEarly, lateCheck: nextLate, method: nextMethod, time: nextTime }
  });
});

// DELETE /lectures/:lectureId/attendance/:studentId  (Doctor only)
const deleteAttendanceByLectureAndStudent = asyncWrapper(async (req, res) => {
  const { lectureId, studentId } = req.params;

  const result = await new Promise((resolve, reject) => {
    db.run(`DELETE FROM Attendance WHERE User_ID = ? AND Lec_ID = ?`, [studentId, lectureId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });

  if (!result.changes) {
    return res.status(404).json({ success: httpstatustext.error, message: "Attendance not found" });
  }

  res.json({ success: httpstatustext.success, message: "Attendance deleted" });
});

// POST /lectures/:lectureId/attendance — Doctor only
const recordAttendance = asyncWrapper(async (req, res) => {
  const { lectureId } = req.params;
  const { student_id, status, is_verified } = req.body;

  if (!student_id) {
    return res.status(400).json({ success: httpstatustext.error, message: 'student_id is required' });
  }

  // تأكد إن الـ lecture موجودة
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lectureId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(404).json({ success: httpstatustext.error, message: 'Lecture not found' });
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
    return res.status(400).json({ success: httpstatustext.error, message: 'Attendance already recorded' });
  }

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO Attendance (User_ID, Lec_ID, Early_Check, Late_Check, Method) VALUES (?, ?, ?, ?, ?)`,
      [student_id, lectureId, 1, 0, 'manual'],
      function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID });
      }
    );
  });

  res.status(201).json({ success: httpstatustext.success, message: 'Attendance recorded successfully' });
});

// POST /attendance/nfc
const nfcAttendance = asyncWrapper(async (req, res) => {
  const { uid, room_id } = req.body;
  console.log(`[Hardware] NFC Request - UID: ${uid}, Room: ${room_id}`);

  if (!uid || !room_id) {
    return res.status(400).json({ success: httpstatustext.error, message: "uid and room_id are required" });
  }

  // Find the active lecture in this room
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT Lec_ID FROM Lecture WHERE Room_ID = ? AND Status = 'open'`, [room_id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "No active lecture in this room" });
  }

  const lec_id = lecture.Lec_ID;

  // 1. Monitor Path: Emit to Socket.io IMMEDIATELY (Proxy Mode)
  const io = req.app.get("io");
  if (io) {
    io.emit("nfc_scan", {
      uid,
      lec_id,
      room_id,
      time: new Date().toISOString()
    });
  }

  // Find student by NFC UID
  const student = await new Promise((resolve, reject) => {
    db.get(`SELECT User_ID FROM Student WHERE NFC_Tag_ID = ?`, [uid], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!student) {
    return res.status(404).json({ success: httpstatustext.error, message: "Student not found with this NFC tag" });
  }

  return processAttendance(student.User_ID, lec_id, 'nfc', res);
});

// POST /attendance/manual
const manualAttendance = asyncWrapper(async (req, res) => {
  const { studentId, password, room_id } = req.body;
  console.log(`[Hardware] Manual Request - ID: ${studentId}, Room: ${room_id}`);

  if (!studentId || !password || !room_id) {
    return res.status(400).json({ success: httpstatustext.error, message: "studentId, password and room_id are required" });
  }

  // Find the active lecture in this room
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT Lec_ID FROM Lecture WHERE Room_ID = ? AND Status = 'open'`, [room_id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "No active lecture in this room" });
  }

  const lec_id = lecture.Lec_ID;

  // Validate user
  const user = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM User WHERE User_ID = ?`, [studentId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!user) {
    return res.status(401).json({ success: httpstatustext.error, message: "Invalid credentials" });
  }

  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, user.Password);
  if (!isMatch) {
    return res.status(401).json({ success: httpstatustext.error, message: "Invalid credentials" });
  }

  return processAttendance(user.User_ID, lec_id, 'manual', res);
});

// POST /attendance/online
const onlineAttendance = asyncWrapper(async (req, res) => {
  const { lectureId, code, studentId } = req.body;

  if (!lectureId || !code || !studentId) {
    return res.status(400).json({ success: httpstatustext.error, message: "lectureId, code and studentId are required" });
  }

  // 1. Get lecture and verify code
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lectureId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(404).json({ success: httpstatustext.error, message: "Lecture not found" });
  }

  if (lecture.Type !== 'Online') {
    return res.status(400).json({ success: httpstatustext.error, message: "This is not an online lecture" });
  }

  if (lecture.Attendance_Code !== code) {
    return res.status(400).json({ success: httpstatustext.error, message: "Invalid attendance code" });
  }

  // 2. Process attendance using common logic
  return processAttendance(studentId, lectureId, 'online', res);
});

// Helper function to process attendance logic
async function processAttendance(userId, lecId, method, res) {
  // Fetch student/user name for response (for LCD display)
  const userInfo = await new Promise((resolve, reject) => {
    db.get(
      `SELECT User_ID, F_Name, L_Name FROM User WHERE User_ID = ?`,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  const studentName = userInfo ? `${userInfo.F_Name || ''} ${userInfo.L_Name || ''}`.trim() : null;

  // Check lecture status
  const lecture = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Lecture WHERE Lec_ID = ? AND Status = 'open'`, [lecId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "Lecture is not open for attendance" });
  }

  const now = new Date();
  const startTime = new Date(lecture.Start_Time);
  const endTime = lecture.End_Time ? new Date(lecture.End_Time) : null;

  let earlyCheck = 0;
  let lateCheck = 0;

  // Early Window = Start_Time → Start_Time + 15 min
  const earlyLimit = new Date(startTime.getTime() + 15 * 60000);
  if (now >= startTime && now <= earlyLimit) {
    earlyCheck = 1;
  }

  // Late Window = After End_Time (up to 15 mins)
  if (endTime) {
    const timeSinceEnd = now.getTime() - endTime.getTime();

    if (timeSinceEnd > 15 * 60000) {
      // 15 minutes have passed since the lecture ended! Close it permanently in DB.
      await new Promise((resolve) => {
        db.run(`UPDATE Lecture SET Status = 'closed' WHERE Lec_ID = ?`, [lecId], resolve);
      });
      return res.status(400).json({ success: httpstatustext.error, message: "Attendance window closed (15 minutes passed since lecture ended)" });
    } else {
      // Student is scanning within the 15-minute grace period after End_Time
      lateCheck = 1;
    }
  }

  // Check if attendance already exists
  const existing = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM Attendance WHERE User_ID = ? AND Lec_ID = ?`, [userId, lecId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (existing) {
    // Update existing record with new flags (don't overwrite 1 with 0)
    const updateData = {
      Early_Check: existing.Early_Check || earlyCheck,
      Late_Check: existing.Late_Check || lateCheck,
      Method: method,
      Time: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE Attendance SET Early_Check = ?, Late_Check = ?, Method = ?, Time = ? WHERE User_ID = ? AND Lec_ID = ?`,
        [updateData.Early_Check, updateData.Late_Check, updateData.Method, updateData.Time, userId, lecId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  } else {
    // Insert new record
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO Attendance (User_ID, Lec_ID, Early_Check, Late_Check, Method) VALUES (?, ?, ?, ?, ?)`,
        [userId, lecId, earlyCheck, lateCheck, method],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  // Short status message for LCD:
  // - First att: check-in window (first 15 mins after start)
  // - Last att: check-out window (within 15 mins after end)
  // - Att taken: otherwise
  let lcdMsg = "Att taken";
  if (lateCheck) lcdMsg = "Last att taken";
  else if (earlyCheck) lcdMsg = "First att taken";

  return res.status(200).json({
    success: httpstatustext.success,
    message: lcdMsg,
    data: { earlyCheck, lateCheck, studentName, studentId: userId }
  });
}

module.exports = {
  getLectureAttendance,
  getStudentAttendanceByClass,
  getAttendanceByLectureAndStudent,
  updateAttendanceByLectureAndStudent,
  deleteAttendanceByLectureAndStudent,
  recordAttendance,
  nfcAttendance,
  manualAttendance,
  onlineAttendance
};