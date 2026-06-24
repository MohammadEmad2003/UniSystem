const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');
const { createBroadcastNotification } = require('../utilities/createNotification');

const lectureModel = genericQueries('Lecture', {
    primaryKey: 'lec_id',
    emailField: 'none'
});

/** Match Room.Room_ID (VARCHAR); null/empty = no room */
const normalizeRoomId = (room_id) => {
    if (room_id === null || room_id === undefined || room_id === '') return null;
    const s = String(room_id).trim();
    return s || null;
};

const roomExists = async (room_id) => {
    const id = normalizeRoomId(room_id);
    if (!id) return false;
    const result = await db.query(`SELECT room_id FROM Room WHERE room_id = $1`, [id]);
    return !!(result.rows && result.rows.length > 0);
};

const checkRoomOccupiedNow = async (room_id, exclude_lec_id = null) => {
    let query = `SELECT * FROM Lecture WHERE room_id = $1 AND status = 'open' AND type IN ('Lecture', 'Section', 'Lab')`;
    let params = [room_id];
    if (exclude_lec_id) {
        query += ` AND lec_id != $2`;
        params.push(exclude_lec_id);
    }
    
    const result = await db.query(query, params);
    const now = new Date();
    for (let lec of result.rows) {
        if (!lec.end_time) {
            return { available: false, reason: "Room is currently occupied by an active lecture." };
        }
        const endTime = new Date(lec.end_time);
        const diffMins = (now - endTime) / 60000;
        if (diffMins < 15) {
            return { available: false, reason: "Room is currently occupied. You must wait 15 minutes after the previous lecture ended." };
        }
    }
    return { available: true };
};

const checkRoomScheduledConflict = async (room_id, date, time) => {
    const query = `SELECT * FROM Lecture WHERE room_id = $1 AND date = $2 AND time = $3 AND type IN ('Lecture', 'Section', 'Lab')`;
    const result = await db.query(query, [room_id, date, time]);
    if (result.rows && result.rows.length > 0) return { available: false, reason: "Room is already booked for another lecture at the same date and time." };
    return { available: true };
};

const getLecturesByClassID = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

    // مفيش Loop هنا! قاعدة البيانات بتبعتلك المصفوفة جاهزة
    const lectures = await lectureModel.getAllByField('class_id', classId);

    res.status(200).json({
        success: true,
        data: lectures
    });
});

// GET /lectures/:lecId
const getLectureById = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;

    const result = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1`, [lecId]);
    const lecture = result.rows[0] || null;

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    res.status(200).json({ success: true, data: lecture });
});

// PUT /lectures/:lecId  (Doctor only)
const updateLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body || {};

    const result = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1`, [lecId]);
    const lecture = result.rows[0] || null;

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    if (lecture.status === 'open') {
        return res.status(400).json({ success: false, message: "Can't update an open lecture" });
    }

    const nextRoom =
        room_id !== undefined ? normalizeRoomId(room_id) : lecture.room_id;

    const nextData = {
        title: title ?? lecture.title,
        date: date ?? lecture.date,
        day: day ?? lecture.day,
        time: time ?? lecture.time,
        type: type ?? lecture.type,
        room_id: nextRoom,
        meeting_link: (meeting_link !== undefined) ? (meeting_link || null) : lecture.meeting_link
    };

    // Validate room constraints for offline types
    if (['Lecture', 'Section', 'Lab'].includes(nextData.type) && nextData.room_id) {
        const exists = await roomExists(nextData.room_id);
        if (!exists) {
            return res.status(400).json({ success: false, message: "Room not found" });
        }

        const scheduleCheck = await checkRoomScheduledConflict(nextData.room_id, nextData.date, nextData.time);
        if (!scheduleCheck.available) {
            // If conflict is with itself, allow (same lecture)
            const conflictResult = await db.query(
                `SELECT lec_id FROM Lecture WHERE room_id = $1 AND date = $2 AND time = $3 AND type IN ('Lecture','Section','Lab')`,
                [nextData.room_id, nextData.date, nextData.time]
            );
            const conflict = conflictResult.rows[0] || null;
            if (conflict && String(conflict.lec_id) !== String(lecId)) {
                return res.status(400).json({ success: false, message: scheduleCheck.reason });
            }
        }
    }

    await lectureModel.update(lecId, nextData);
    res.status(200).json({ success: true, message: "Lecture updated successfully", data: { lec_id: Number(lecId), ...nextData } });
});

const createLecture = asyncWrapper(async (req, res) => {
    const { classId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body;

    if (!day || !time || !type || !title || !date) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const rid = normalizeRoomId(room_id);

    if (['Lecture', 'Section', 'Lab'].includes(type) && rid) {
        const exists = await roomExists(rid);
        if (!exists) {
            return res.status(400).json({ success: false, message: "Room not found" });
        }

        // 1. Check scheduling conflicts
        const scheduleCheck = await checkRoomScheduledConflict(rid, date, time);
        if (!scheduleCheck.available) {
            return res.status(400).json({ success: false, message: scheduleCheck.reason });
        }

        // 2. Check if the room is currently occupied (prevents on-the-fly overlap)
        const occupiedCheck = await checkRoomOccupiedNow(rid);
        if (!occupiedCheck.available) {
            return res.status(400).json({ success: false, message: occupiedCheck.reason });
        }
    }

    const newData = {
        title: title,
        date: date,
        day: day,
        time: time,
        type: type,
        room_id: rid,
        meeting_link: meeting_link || null,
        class_id: classId
    };

    const result = await lectureModel.create(newData);

    const studentsResult = await db.query(
        `SELECT user_id FROM Enrollment WHERE class_id = $1`,
        [classId]
    );
    const students = studentsResult.rows || [];
    if (students.length) {
        createBroadcastNotification({
            userIds: students.map((s) => s.user_id),
            classId: Number(classId),
            type: 'new_lecture',
            title: 'New Lecture Scheduled',
            message: `A new lecture "${title}" has been scheduled for ${date} at ${time}.`,
            referenceId: result.lec_id,
        }).catch((e) => console.error('[notify] new_lecture broadcast failed:', e.message));
    }

    res.status(201).json({
        success: true,
        message: "Lecture created successfully",
        data: { lec_id: result.lec_id, ...newData }
    });
});

const deleteLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;

    await lectureModel.delete(lecId);

    res.status(200).json({
        success: true,
        message: "Lecture deleted successfully"
    });
});

const startLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;
    const nowDate = new Date();
    const now = nowDate.toISOString();

    // Verify if room is actually free before starting
    const result = await db.query(`SELECT * FROM Lecture WHERE lec_id = $1`, [lecId]);
    const lecture = result.rows[0];

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    // Offline (Lecture/Section/Lab): doctor can only start within [scheduled_time, scheduled_time + 60min]
    // Online: can start anytime
    if (['Lecture', 'Section', 'Lab'].includes(lecture.type)) {
        const dateStr = lecture.date;
        const timeStr = lecture.time;

        if (!dateStr || !timeStr) {
            return res.status(400).json({ success: false, message: "Lecture schedule (date/time) is missing" });
        }

        // Interpret as local server time (no timezone suffix)
        const scheduledStart = new Date(`${dateStr}T${timeStr}`);
        if (Number.isNaN(scheduledStart.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid lecture schedule (date/time)" });
        }

        const latestAllowedStart = new Date(scheduledStart.getTime() + 60 * 60000);
        if (nowDate < scheduledStart) {
            return res.status(400).json({
                success: false,
                message: "You can't start this offline lecture before its scheduled time"
            });
        }
        if (nowDate > latestAllowedStart) {
            return res.status(400).json({
                success: false,
                message: "Start window expired (offline lectures can be started up to 60 minutes after scheduled time)"
            });
        }
    }

    if (['Lecture', 'Section', 'Lab'].includes(lecture.type) && lecture.room_id) {
        const rid = normalizeRoomId(lecture.room_id);
        if (rid) {
            const exists = await roomExists(rid);
            if (!exists) {
                return res.status(400).json({ success: false, message: "Lecture room no longer exists" });
            }
        }
        const occupiedCheck = await checkRoomOccupiedNow(lecture.room_id, lecId);
        if (!occupiedCheck.available) {
            return res.status(400).json({ success: false, message: occupiedCheck.reason });
        }
    }

    const { attendanceCode } = req.body || {};
    let finalCode = undefined;

    if (lecture.type === 'Online') {
        finalCode = attendanceCode || lecture.attendance_code;
        if (!finalCode) {
            // Generate a random 6-character alphanumeric code
            finalCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
    }

    await lectureModel.update(lecId, {
        status: 'open',
        start_time: now,
        attendance_code: lecture.type === 'Online' ? finalCode : lecture.attendance_code
    });

    const studentsResult = await db.query(
        `SELECT user_id FROM Enrollment WHERE class_id = $1`,
        [lecture.class_id]
    );
    const students = studentsResult.rows || [];
    if (students.length) {
        createBroadcastNotification({
            userIds: students.map((s) => s.user_id),
            classId: Number(lecture.class_id),
            type: 'lecture_started',
            title: 'Lecture Started',
            message: `The lecture "${lecture.title}" has started. You can now record your attendance.`,
            referenceId: Number(lecId),
        }).catch((e) => console.error('[notify] lecture_started broadcast failed:', e.message));
    }

    res.status(200).json({
        success: true,
        message: "Lecture started successfully",
        data: lecture.type === 'Online'
            ? { start_time: now, attendance_code: finalCode }
            : { start_time: now }
    });
});

const endLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;
    const now = new Date().toISOString();

    // Do NOT set Status to 'closed' yet. Keep it open so students can scan out.
    // The attendance controller will automatically close it after 15 minutes.
    await lectureModel.update(lecId, {
        status: 'open',
        end_time: now
    });

    res.status(200).json({
        success: true,
        message: "Lecture ended. Students have 15 minutes to record departure attendance.",
        data: { end_time: now }
    });
});

module.exports = { getLecturesByClassID, getLectureById, createLecture, updateLecture, deleteLecture, startLecture, endLecture };