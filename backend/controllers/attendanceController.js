const httpstatustext = require('../utilities/httpstatustext');
const asyncWrapper = require('../middleware/asyncWrapper');
const db = require('../utilities/database');

const normalizeRoomKey = (room_id) => {
  if (room_id === null || room_id === undefined || room_id === '') return '';
  return String(room_id).trim();
};


const getLectureAttendance = asyncWrapper(async (req, res) => {
  const { lectureId } = req.params;

  const result = await db.query(
      `SELECT 
        a.attendance_id, a.lec_id, a.user_id AS student_id,
        u.f_name || ' ' || u.l_name AS student_name,
        a.time, a.early_check, a.late_check, a.method
       FROM Attendance a
       INNER JOIN "User" u ON a.user_id = u.user_id
       WHERE a.lec_id = $1`,
      [lectureId]
  );
  const records = result.rows || [];

  res.json({ success: httpstatustext.success, data: records });
});

// GET /attendance/student/:studentId/class/:classId
const getStudentAttendanceByClass = asyncWrapper(async (req, res) => {
  const { studentId, classId } = req.params;

  const result = await db.query(
      `SELECT 
        a.attendance_id, a.lec_id, a.user_id AS student_id,
        u.f_name || ' ' || u.l_name AS student_name,
        a.time, a.early_check, a.late_check, a.method
       FROM Attendance a
       INNER JOIN "User" u ON a.user_id = u.user_id
       INNER JOIN Lecture l ON a.lec_id = l.lec_id
       WHERE a.user_id = $1 AND l.class_id = $2`,
      [studentId, classId]
  );
  const records = result.rows || [];

  res.json({ success: httpstatustext.success, data: records });
});

// GET /lectures/:lectureId/attendance/:studentId  (Doctor/Admin)
const getAttendanceByLectureAndStudent = asyncWrapper(async (req, res) => {
  const { lectureId, studentId } = req.params;

  const result = await db.query(
      `SELECT 
        a.attendance_id, a.lec_id, a.user_id AS student_id,
        u.f_name || ' ' || u.l_name AS student_name,
        a.time, a.early_check, a.late_check, a.method
       FROM Attendance a
       INNER JOIN "User" u ON a.user_id = u.user_id
       WHERE a.lec_id = $1 AND a.user_id = $2`,
      [lectureId, studentId]
  );
  const record = result.rows[0] || null;

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
  const existingResult = await db.query(`SELECT * FROM Attendance WHERE user_id = $1 AND lec_id = $2`, [studentId, lectureId]);
  const existing = existingResult.rows[0] || null;

  if (!existing) {
    return res.status(404).json({ success: httpstatustext.error, message: "Attendance not found" });
  }

  const nextEarly = early !== undefined ? early : existing.early_check;
  const nextLate = late !== undefined ? late : existing.late_check;
  const nextMethod = method || existing.method;
  const nextTime = new Date().toISOString();

  await db.query(
      `UPDATE Attendance SET early_check = $1, late_check = $2, method = $3, time = $4 WHERE user_id = $5 AND lec_id = $6`,
      [nextEarly, nextLate, nextMethod, nextTime, studentId, lectureId]
  );

  res.json({
    success: httpstatustext.success,
    message: "Attendance updated",
    data: { lectureId: Number(lectureId), studentId: Number(studentId), earlyCheck: nextEarly, lateCheck: nextLate, method: nextMethod, time: nextTime }
  });
});

// DELETE /lectures/:lectureId/attendance/:studentId  (Doctor only)
const deleteAttendanceByLectureAndStudent = asyncWrapper(async (req, res) => {
  const { lectureId, studentId } = req.params;

  const result = await db.query(`DELETE FROM Attendance WHERE user_id = $1 AND lec_id = $2`, [studentId, lectureId]);

  if (result.rowCount === 0) {
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
  const lectureResult = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1`, [lectureId]);
  const lecture = lectureResult.rows[0];

  if (!lecture) {
    return res.status(404).json({ success: httpstatustext.error, message: 'Lecture not found' });
  }

  // تأكد مش سجّل قبل كده
  const existingResult = await db.query(
      `SELECT * FROM Attendance WHERE user_id = $1 AND lec_id = $2`,
      [student_id, lectureId]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    return res.status(400).json({ success: httpstatustext.error, message: 'Attendance already recorded' });
  }

  await db.query(
      `INSERT INTO Attendance (user_id, lec_id, early_check, late_check, method) VALUES ($1, $2, $3, $4, $5)`,
      [student_id, lectureId, 1, 0, 'manual']
  );

  res.status(201).json({ success: httpstatustext.success, message: 'Attendance recorded successfully' });
});

// POST /attendance/nfc
const nfcAttendance = asyncWrapper(async (req, res) => {
  const { uid, room_id } = req.body;
  console.log(`[Hardware] NFC Request - UID: ${uid}, Room: ${room_id}`);

  if (!uid || !room_id) {
    return res.status(400).json({ success: httpstatustext.error, message: "uid and room_id are required" });
  }

  const rk = normalizeRoomKey(room_id);

  const roomResult = await db.query(`SELECT room_id FROM Room WHERE room_id = $1`, [rk]);
  const roomOk = !!(roomResult.rows && roomResult.rows.length > 0);
  if (!roomOk) {
    return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
  }

  // Find the active lecture in this room
  const lectureResult = await db.query(`SELECT lec_id FROM Lecture WHERE room_id = $1 AND status = 'open'`, [rk]);
  const lecture = lectureResult.rows[0];

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "No active lecture in this room" });
  }

  // Check if uid is actually an HCE JSON payload (phone HCE)
  let studentId = null;
  let isHcePayload = false;
  let debugInfo = {
    originalUid: uid,
    uidLength: uid ? uid.length : 0,
    parseAttempts: []
  };

  try {
    let uidToParse = uid;

    // 1. Try to decode hex string first (some readers might send hex-encoded data)
    if (uid && uid.length > 20 && !uid.includes(':') && /^[0-9a-fA-F]+$/.test(uid)) {
      try {
        let decoded = '';
        for (let i = 0; i < uid.length; i += 2) {
          decoded += String.fromCharCode(parseInt(uid.substr(i, 2), 16));
        }
        uidToParse = decoded;
        debugInfo.parseAttempts.push(`Hex decoded from length ${uid.length} to: ${uidToParse.substring(0, 100)}`);
        console.log(`[Hardware] Decoded hex string to: ${uidToParse.substring(0, 50)}...`);
      } catch (hexError) {
        debugInfo.parseAttempts.push(`Hex decode failed: ${hexError.message}`);
        console.log(`[Hardware] Hex decode failed, using original uid`);
      }
    }

    // 2. Try to parse as JSON directly (for direct JSON payloads)
    if (uidToParse && (uidToParse.includes('{') || uidToParse.includes('studentId'))) {
      try {
        // Try to find JSON object in the string
        const jsonMatch = uidToParse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          // Check for nfcTagId first (new format), fallback to studentId
          if (parsed.nfcTagId) {
            studentId = String(parsed.nfcTagId).trim();
            isHcePayload = true;
            debugInfo.parseAttempts.push(`JSON HCE payload detected: nfcTagId=${studentId}`);
            console.log(`[Hardware] ✅ Detected HCE JSON payload with nfcTagId: ${studentId}`);
          } else if (parsed.studentId) {
            studentId = String(parsed.studentId).trim();
            isHcePayload = true;
            debugInfo.parseAttempts.push(`JSON HCE payload detected: studentId=${studentId}`);
            console.log(`[Hardware] ✅ Detected HCE JSON payload, studentId: ${studentId}`);
          }
        }
      } catch (jsonError) {
        debugInfo.parseAttempts.push(`JSON parse failed: ${jsonError.message}`);
        console.log(`[Hardware] ⚠️ JSON parse failed: ${jsonError.message}`);
      }
    } else {
      debugInfo.parseAttempts.push(`No JSON indicators found in uidToParse`);
    }
  } catch (e) {
    debugInfo.parseAttempts.push(`Exception during parse: ${e.message}`);
    console.log(`[Hardware] Exception: ${e.message}`);
  }

  let student;

  if (isHcePayload) {
    // For HCE payload, look up student by user_id directly
    console.log(`[Hardware] 📱 Looking up student by user_id: ${studentId} (HCE mode)`);
    const studentResult = await db.query(
      `SELECT user_id FROM "User" WHERE user_id = $1`,
      [studentId]
    );
    student = studentResult.rows[0];
    
    if (!student) {
      console.log(`[Hardware] ❌ HCE Student NOT found with ID: ${studentId}`);
    } else {
      console.log(`[Hardware] ✅ HCE Student found: ${student.user_id}`);
    }
  } else {
    // For regular card, look up by NFC tag ID
    console.log(`[Hardware] 🎫 Looking up student by NFC card tag: ${uid}`);
    const studentResult = await db.query(
      `SELECT user_id FROM Student WHERE nfc_tag_id = $1`,
      [uid]
    );
    student = studentResult.rows[0];
    
    if (!student) {
      console.log(`[Hardware] ❌ Card UID NOT found: ${uid}`);
    } else {
      console.log(`[Hardware] ✅ Card found, student ID: ${student.user_id}`);
    }
  }

  if (!student) {
    const errorMessage = isHcePayload 
      ? `Student not found from HCE payload (ID: ${studentId})`
      : `Student not found with this NFC tag (UID: ${uid})`;
    
    console.log(`[Hardware] ❌ NFC Attendance FAILED - ${errorMessage}`);
    console.log(`[Hardware] Debug Info:`, debugInfo);
    
    // Extra debugging for HCE issues
    if (!isHcePayload && uid && uid.includes(':')) {
      console.log(`[Hardware] ⚠️ Detected colon-separated UID format (${uid})`);
      console.log(`[Hardware] ℹ️ This looks like a physical card or HCE not properly initialized`);
      console.log(`[Hardware] ℹ️ If this is a phone scan, please check:`);
      console.log(`[Hardware]   1. Flutter app is updated with latest code`);
      console.log(`[Hardware]   2. NFC is enabled on phone`);
      console.log(`[Hardware]   3. App is set as default NFC payment app`);
      console.log(`[Hardware]   4. Student UID is registered in database: ${uid}`);
    }
    
    return res.status(404).json({ 
      success: httpstatustext.error, 
      message: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
    });
  }

  console.log(`[Hardware] ✅ Student found, processing attendance...`);

  return processAttendance(student.user_id, lecture.lec_id, 'nfc', res);
});

// POST /attendance/manual
const manualAttendance = asyncWrapper(async (req, res) => {
  const { studentId, password, room_id } = req.body;
  console.log(`[Hardware] Manual Request - ID: ${studentId}, Room: ${room_id}`);

  if (!studentId || !password || !room_id) {
    return res.status(400).json({ success: httpstatustext.error, message: "studentId, password and room_id are required" });
  }

  const rk = normalizeRoomKey(room_id);
  const roomResult = await db.query(`SELECT room_id FROM Room WHERE room_id = $1`, [rk]);
  const roomOk = !!(roomResult.rows && roomResult.rows.length > 0);
  if (!roomOk) {
    return res.status(404).json({ success: httpstatustext.error, message: "Room not found" });
  }

  // Find the active lecture in this room
  const lectureResult = await db.query(`SELECT lec_id FROM Lecture WHERE room_id = $1 AND status = 'open'`, [rk]);
  const lecture = lectureResult.rows[0];

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "No active lecture in this room" });
  }

  const lec_id = lecture.lec_id;

  // Validate user
  const userResult = await db.query(`SELECT * FROM "User" WHERE user_id = $1`, [studentId]);
  const user = userResult.rows[0];

  if (!user) {
    return res.status(401).json({ success: httpstatustext.error, message: "Invalid credentials" });
  }

  const bcrypt = require('bcryptjs');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: httpstatustext.error, message: "Invalid credentials" });
  }

  return processAttendance(user.user_id, lec_id, 'manual', res);
});

// POST /attendance/online
const onlineAttendance = asyncWrapper(async (req, res) => {
  const { lectureId, code, studentId } = req.body;

  if (!lectureId || !code || !studentId) {
    return res.status(400).json({ success: httpstatustext.error, message: "lectureId, code and studentId are required" });
  }

  // 1. Get lecture and verify code
  const lectureResult = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1`, [lectureId]);
  const lecture = lectureResult.rows[0];

  if (!lecture) {
    return res.status(404).json({ success: httpstatustext.error, message: "Lecture not found" });
  }

  if (lecture.type !== 'Online') {
    return res.status(400).json({ success: httpstatustext.error, message: "This is not an online lecture" });
  }

  if (lecture.attendance_code !== code) {
    return res.status(400).json({ success: httpstatustext.error, message: "Invalid attendance code" });
  }

  // 2. Process attendance using common logic
  return processAttendance(studentId, lectureId, 'online', res);
});

// Helper function to process attendance logic
async function processAttendance(userId, lecId, method, res) {
  // Fetch student/user name for response (for LCD display)
  const userInfoResult = await db.query(
      `SELECT user_id, f_name, l_name FROM "User" WHERE user_id = $1`,
      [userId]
  );
  const userInfo = userInfoResult.rows[0];
  const studentName = userInfo ? `${userInfo.f_name || ''} ${userInfo.l_name || ''}`.trim() : null;

  // Check lecture status
  const lectureResult = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1 AND status = 'open'`, [lecId]);
  const lecture = lectureResult.rows[0];

  if (!lecture) {
    return res.status(400).json({ success: httpstatustext.error, message: "Lecture is not open for attendance" });
  }

  // NEW: Verify student enrollment in this class
  const enrollmentResult = await db.query(
      `SELECT * FROM Enrollment WHERE user_id = $1 AND class_id = $2`,
      [userId, lecture.class_id]
  );
  const enrollment = enrollmentResult.rows[0];

  if (!enrollment) {
    return res.status(403).json({ success: httpstatustext.error, message: "Student is not enrolled in this class" });
  }

  const now = new Date();
  const startTime = new Date(lecture.start_time);
  const endTime = lecture.end_time ? new Date(lecture.end_time) : null;

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
      await db.query(`UPDATE Lecture SET status = 'closed' WHERE lec_id = $1`, [lecId]);
      return res.status(400).json({ success: httpstatustext.error, message: "Attendance window closed (15 minutes passed since lecture ended)" });
    } else {
      // Student is scanning within the 15-minute grace period after End_Time
      lateCheck = 1;
    }
  }

  // Check if attendance already exists
  const existingResult = await db.query(`SELECT * FROM Attendance WHERE user_id = $1 AND lec_id = $2`, [userId, lecId]);
  const existing = existingResult.rows[0];

  if (existing) {
    // Update existing record with new flags (don't overwrite 1 with 0)
    const updateData = {
      early_check: existing.early_check || earlyCheck,
      late_check: existing.late_check || lateCheck,
      method: method,
      time: new Date().toISOString()
    };

    await db.query(
      `UPDATE Attendance SET early_check = $1, late_check = $2, method = $3, time = $4 WHERE user_id = $5 AND lec_id = $6`,
      [updateData.early_check, updateData.late_check, updateData.method, updateData.time, userId, lecId]
    );
  } else {
    // Insert new record
    await db.query(
      `INSERT INTO Attendance (user_id, lec_id, early_check, late_check, method) VALUES ($1, $2, $3, $4, $5)`,
      [userId, lecId, earlyCheck, lateCheck, method]
    );
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

const scanCardOnly = asyncWrapper(async (req, res) => {
  const { uid, room_id } = req.body;
  console.log(`[Hardware] Standalone Card Read - UID: ${uid}, Room: ${room_id}`);

  if (!uid) {
    return res.status(400).json({ success: httpstatustext.error, message: "uid is required" });
  }

  const rk = normalizeRoomKey(room_id);

  const studentResult = await db.query(
    `SELECT s.user_id, u.f_name, u.l_name
       FROM Student s
       INNER JOIN "User" u ON s.user_id = u.user_id
      WHERE s.nfc_tag_id = $1`,
    [uid]
  );
  const student = studentResult.rows[0] || null;
  const studentName = student ? `${student.f_name || ''} ${student.l_name || ''}`.trim() : null;

  const io = req.app.get("io");
  if (io) {
    io.emit("nfc_scan", {
      uid,
      room_id: rk || null,
      linked: !!student,
      studentId: student ? student.user_id : null,
      studentName,
      time: new Date().toISOString()
    });
  }

  return res.status(200).json({
    success: httpstatustext.success,
    message: student ? "Card linked" : "Card not linked",
    data: { uid, linked: !!student, studentId: student ? student.user_id : null, studentName }
  });
});

const readCardInfo = asyncWrapper(async (req, res) => {
  const { uid, room_id } = req.body;
  console.log(`[Hardware] Card Info Read - UID: ${uid}, Room: ${room_id}`);

  if (!uid) {
    return res.status(400).json({ success: httpstatustext.error, message: "uid is required" });
  }

  const rk = normalizeRoomKey(room_id);

  const studentResult = await db.query(
    `SELECT s.user_id, u.f_name, u.l_name, s.academic_level, s.total_gpa, d.dept_name
       FROM Student s
       INNER JOIN "User" u ON s.user_id = u.user_id
       LEFT JOIN Department d ON s.dept_id = d.dept_id
      WHERE s.nfc_tag_id = $1`,
    [uid]
  );
  const student = studentResult.rows[0] || null;
  const studentName = student ? `${student.f_name || ''} ${student.l_name || ''}`.trim() : null;

  return res.status(200).json({
    success: httpstatustext.success,
    message: student ? "Card info retrieved" : "Card not linked",
    data: { 
      uid, 
      linked: !!student, 
      studentId: student ? student.user_id : null, 
      studentName,
      academicLevel: student ? student.academic_level : null,
      gpa: student ? student.total_gpa : null,
      department: student ? student.dept_name : null
    }
  });
});

module.exports = {
  getLectureAttendance,
  getStudentAttendanceByClass,
  getAttendanceByLectureAndStudent,
  updateAttendanceByLectureAndStudent,
  deleteAttendanceByLectureAndStudent,
  recordAttendance,
  nfcAttendance,
  manualAttendance,
  onlineAttendance,
  scanCardOnly,
  readCardInfo
};