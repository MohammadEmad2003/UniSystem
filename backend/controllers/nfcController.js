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
