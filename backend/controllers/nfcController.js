const crypto = require('crypto');
const { query } = require('../utilities/database');

// Generate a random challenge token
const generateChallenge = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate device ID if not provided
const generateDeviceId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// POST /api/nfc/auth-challenge
exports.authChallenge = async (req, res) => {
  try {
    const { studentId, deviceId, sessionToken } = req.body;

    if (!studentId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'studentId and deviceId are required'
      });
    }

    // Verify student exists and is approved
    const studentQuery = `
      SELECT u.user_id, u.account_status, u.f_name, u.l_name, s.ssn as student_id, s.dept_id, s.academic_level, s.payment_status
      FROM "User" u
      JOIN student s ON u.user_id = s.user_id
      WHERE u.user_id = $1
    `;
    const studentResult = await query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    // Check if student is approved
    if (student.account_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Student account is not approved'
      });
    }

    // Generate challenge
    const challenge = generateChallenge();
    const timestamp = Date.now();
    const expiresAt = timestamp + 5 * 60 * 1000; // 5 minutes

    // Store challenge in database
    const insertChallengeQuery = `
      INSERT INTO nfc_challenges (student_id, device_id, challenge, created_at, expires_at)
      VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), to_timestamp($5 / 1000.0))
      RETURNING id
    `;
    
    try {
      await query(insertChallengeQuery, [studentId, deviceId, challenge, timestamp, expiresAt]);
    } catch (error) {
      console.error('Failed to store challenge:', error);
      // Continue anyway, but log the error
    }
    
    res.json({
      success: true,
      data: {
        challenge,
        timestamp,
        permittedActions: ['check_in', 'access'],
        expiresAt: expiresAt
      }
    });
  } catch (error) {
    console.error('Auth challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /api/nfc/verify-response
exports.verifyResponse = async (req, res) => {
  try {
    const { studentId, challengeResponse, deviceId } = req.body;

    if (!studentId || !challengeResponse || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'studentId, challengeResponse, and deviceId are required'
      });
    }

    // Verify student exists
    const studentQuery = `
      SELECT u.user_id, u.f_name, u.l_name, s.ssn as student_id, s.dept_id as department_id
      FROM "User" u
      JOIN student s ON u.user_id = s.user_id
      WHERE u.user_id = $1
    `;
    const studentResult = await query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    // Verify the challenge response against stored challenge
    // Parse the challenge response (should contain the original challenge)
    let challengeFromResponse = '';
    try {
      if (typeof challengeResponse === 'string') {
        const parts = challengeResponse.split(':');
        challengeFromResponse = parts[0];
      }
    } catch (error) {
      console.error('Failed to parse challenge response:', error);
    }

    // Look up the challenge in database
    const challengeQuery = `
      SELECT id, student_id, device_id, challenge, expires_at, used
      FROM nfc_challenges
      WHERE challenge = $1
        AND student_id = $2
        AND device_id = $3
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const challengeResult = await query(challengeQuery, [challengeFromResponse, studentId, deviceId]);

    if (challengeResult.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Challenge not found, expired, or already used'
      });
    }

    const challengeRecord = challengeResult.rows[0];

    // Mark challenge as used
    const updateChallengeQuery = `
      UPDATE nfc_challenges
      SET used = TRUE
      WHERE id = $1
    `;
    await query(updateChallengeQuery, [challengeRecord.id]);

    // Verification successful
    res.json({
      success: true,
      data: {
        verified: true,
        attendanceStatus: 'present',
        userData: {
          id: student.user_id,
          name: `${student.f_name} ${student.l_name}`,
          studentNumber: student.student_id,
          department: student.department_id?.toString() || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('Verify response error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /api/nfc/log-event
exports.logEvent = async (req, res) => {
  try {
    const { studentId, deviceId, eventType, status, location, metadata } = req.body;

    if (!studentId || !deviceId || !eventType || !status) {
      return res.status(400).json({
        success: false,
        message: 'studentId, deviceId, eventType, and status are required'
      });
    }

    // Create NFC event log
    const insertQuery = `
      INSERT INTO nfc_events (student_id, device_id, event_type, status, timestamp, location, metadata, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, timestamp
    `;
    
    const values = [
      studentId,
      deviceId,
      eventType,
      status,
      Date.now(),
      location || 'unknown',
      JSON.stringify(metadata || {}),
      'nfc_system'
    ];

    const result = await query(insertQuery, values);

    res.json({
      success: true,
      data: {
        logId: result.rows[0].id,
        timestamp: result.rows[0].timestamp
      }
    });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/nfc/student/:id
exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const studentQuery = `
      SELECT u.user_id, s.ssn as student_id, u.f_name, u.l_name, s.dept_id as department_id, 
             d.dept_name as department_name, s.academic_level, u.account_status, s.payment_status, s.nfc_tag_id
      FROM "User" u
      JOIN student s ON u.user_id = s.user_id
      LEFT JOIN Department d ON s.dept_id = d.dept_id
      WHERE u.user_id = $1
    `;
    const studentResult = await query(studentQuery, [id]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    res.json({
      success: true,
      data: {
        id: student.user_id,
        studentNumber: student.student_id,
        name: `${student.f_name} ${student.l_name}`,
        faculty: 'Faculty of Information Technology',
        department: student.department_name || student.department_id?.toString() || 'N/A',
        academicLevel: student.academic_level,
        accountStatus: student.account_status,
        paymentStatus: student.payment_status,
        nfcTagId: student.nfc_tag_id
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /api/nfc/register-device
exports.registerDevice = async (req, res) => {
  try {
    const { deviceId, studentId, deviceName } = req.body;

    if (!deviceId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and studentId are required'
      });
    }

    // Check if device already exists
    const checkDeviceQuery = `
      SELECT id, student_id, is_active
      FROM nfc_devices
      WHERE device_id = $1
    `;
    const existingDevice = await query(checkDeviceQuery, [deviceId]);

    if (existingDevice.rows.length > 0) {
      // Device exists, update last_used_at and reactivate if needed
      const updateDeviceQuery = `
        UPDATE nfc_devices
        SET last_used_at = NOW(),
            is_active = TRUE,
            device_name = COALESCE($2, device_name)
        WHERE device_id = $1
        RETURNING id, registered_at
      `;
      const result = await query(updateDeviceQuery, [deviceId, deviceName]);
      
      return res.json({
        success: true,
        data: {
          deviceId,
          registeredAt: result.rows[0].registered_at,
          isNew: false
        }
      });
    }

    // Register new device
    const insertDeviceQuery = `
      INSERT INTO nfc_devices (device_id, student_id, device_name, registered_at, last_used_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, registered_at
    `;
    const result = await query(insertDeviceQuery, [deviceId, studentId, deviceName || 'Mobile Device']);
    
    res.json({
      success: true,
      data: {
        deviceId,
        registeredAt: result.rows[0].registered_at,
        isNew: true
      }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// POST /api/nfc/direct-attendance
// New endpoint for phone to submit attendance directly (bypass embedded system)
exports.directAttendance = async (req, res) => {
  try {
    const { studentId, deviceId, challenge, room_id } = req.body;

    if (!studentId || !room_id) {
      return res.status(400).json({
        success: false,
        message: 'studentId and room_id are required'
      });
    }

    // Verify student exists
    const studentQuery = `
      SELECT u.user_id, u.f_name, u.l_name, u.account_status
      FROM "User" u
      WHERE u.user_id = $1
    `;
    const studentResult = await query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    // Check if student is approved
    if (student.account_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Student account is not approved'
      });
    }

    // Verify room exists
    const roomQuery = `SELECT room_id FROM Room WHERE room_id = $1`;
    const roomResult = await query(roomQuery, [room_id]);

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Find active lecture in this room
    const lectureQuery = `
      SELECT lec_id, class_id, start_time, end_time, type
      FROM Lecture
      WHERE room_id = $1 AND status = 'open'
    `;
    const lectureResult = await query(lectureQuery, [room_id]);
    const lecture = lectureResult.rows[0];

    if (!lecture) {
      return res.status(400).json({
        success: false,
        message: 'No active lecture in this room'
      });
    }

    // Verify student enrollment
    const enrollmentQuery = `
      SELECT * FROM Enrollment WHERE user_id = $1 AND class_id = $2
    `;
    const enrollmentResult = await query(enrollmentQuery, [studentId, lecture.class_id]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Student is not enrolled in this class'
      });
    }

    // Calculate early/late check
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
        // Close the lecture
        await query(`UPDATE Lecture SET status = 'closed' WHERE lec_id = $1`, [lecture.lec_id]);
        return res.status(400).json({
          success: false,
          message: 'Attendance window closed (15 minutes passed since lecture ended)'
        });
      } else {
        lateCheck = 1;
      }
    }

    // Check if attendance already exists
    const existingQuery = `
      SELECT * FROM Attendance WHERE user_id = $1 AND lec_id = $2
    `;
    const existingResult = await query(existingQuery, [studentId, lecture.lec_id]);
    const existing = existingResult.rows[0];

    if (existing) {
      // Update existing record
      const updateData = {
        early_check: existing.early_check || earlyCheck,
        late_check: existing.late_check || lateCheck,
        method: 'nfc',
        time: new Date().toISOString()
      };

      await query(
        `UPDATE Attendance SET early_check = $1, late_check = $2, method = $3, time = $4 WHERE user_id = $5 AND lec_id = $6`,
        [updateData.early_check, updateData.late_check, updateData.method, updateData.time, studentId, lecture.lec_id]
      );
    } else {
      // Insert new record
      await query(
        `INSERT INTO Attendance (user_id, lec_id, early_check, late_check, method) VALUES ($1, $2, $3, $4, $5)`,
        [studentId, lecture.lec_id, earlyCheck, lateCheck, 'nfc']
      );
    }

    let message = 'Attendance recorded';
    if (lateCheck) message = 'Last attendance recorded';
    else if (earlyCheck) message = 'First attendance recorded';

    res.json({
      success: true,
      message,
      data: {
        studentId,
        studentName: `${student.f_name} ${student.l_name}`,
        earlyCheck,
        lateCheck,
        lectureId: lecture.lec_id
      }
    });
  } catch (error) {
    console.error('Direct attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// GET /api/nfc/my-tag
// Get the NFC tag ID for the logged-in student
exports.getMyTag = async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required'
      });
    }

    const studentQuery = `
      SELECT s.nfc_tag_id, u.user_id, u.f_name, u.l_name
      FROM Student s
      JOIN "User" u ON s.user_id = u.user_id
      WHERE s.user_id = $1
    `;
    const studentResult = await query(studentQuery, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const student = studentResult.rows[0];

    res.json({
      success: true,
      data: {
        studentId: student.user_id,
        studentName: `${student.f_name} ${student.l_name}`,
        nfcTagId: student.nfc_tag_id
      }
    });
  } catch (error) {
    console.error('Get my tag error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
