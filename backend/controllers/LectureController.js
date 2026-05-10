const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const lectureModel = genericQueries('Lecture', {
    primaryKey: 'Lec_ID',
    emailField: 'none'
});

const checkRoomOccupiedNow = async (room_id, exclude_lec_id = null) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM Lecture WHERE Room_ID = ? AND Status = 'open' AND Type IN ('Lecture', 'Section', 'Lab')`;
        let params = [room_id];
        if (exclude_lec_id) {
            query += ` AND Lec_ID != ?`;
            params.push(exclude_lec_id);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            
            const now = new Date();
            for (let lec of rows) {
                if (!lec.End_Time) {
                    return resolve({ available: false, reason: "Room is currently occupied by an active lecture." });
                }
                const endTime = new Date(lec.End_Time);
                const diffMins = (now - endTime) / 60000;
                if (diffMins < 15) {
                    return resolve({ available: false, reason: "Room is currently occupied. You must wait 15 minutes after the previous lecture ended." });
                }
            }
            resolve({ available: true });
        });
    });
};

const checkRoomScheduledConflict = async (room_id, date, time) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM Lecture WHERE Room_ID = ? AND Date = ? AND Time = ? AND Type IN ('Lecture', 'Section', 'Lab')`;
        db.get(query, [room_id, date, time], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve({ available: false, reason: "Room is already booked for another lecture at the same date and time." });
            resolve({ available: true });
        });
    });
};

const getLecturesByClassID = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

    // مفيش Loop هنا! قاعدة البيانات بتبعتلك المصفوفة جاهزة
    const lectures = await lectureModel.getAllByField('Class_ID', classId);

    res.status(200).json({
        success: true,
        data: lectures
    });
});

// GET /lectures/:lecId
const getLectureById = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;

    const lecture = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lecId], (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    res.status(200).json({ success: true, data: lecture });
});

// PUT /lectures/:lecId  (Doctor only)
const updateLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body || {};

    const lecture = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lecId], (err, row) => {
            if (err) return reject(err);
            resolve(row || null);
        });
    });

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    if (lecture.Status === 'open') {
        return res.status(400).json({ success: false, message: "Can't update an open lecture" });
    }

    const nextData = {
        Title: title ?? lecture.Title,
        Date: date ?? lecture.Date,
        Day: day ?? lecture.Day,
        Time: time ?? lecture.Time,
        Type: type ?? lecture.Type,
        Room_ID: (room_id !== undefined) ? (room_id || null) : lecture.Room_ID,
        Meeting_Link: (meeting_link !== undefined) ? (meeting_link || null) : lecture.Meeting_Link
    };

    // Validate room constraints for offline types
    if (['Lecture', 'Section', 'Lab'].includes(nextData.Type) && nextData.Room_ID) {
        const scheduleCheck = await checkRoomScheduledConflict(nextData.Room_ID, nextData.Date, nextData.Time);
        if (!scheduleCheck.available) {
            // If conflict is with itself, allow (same lecture)
            const conflict = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT Lec_ID FROM Lecture WHERE Room_ID = ? AND Date = ? AND Time = ? AND Type IN ('Lecture','Section','Lab')`,
                    [nextData.Room_ID, nextData.Date, nextData.Time],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row || null);
                    }
                );
            });
            if (conflict && String(conflict.Lec_ID) !== String(lecId)) {
                return res.status(400).json({ success: false, message: scheduleCheck.reason });
            }
        }
    }

    const result = await lectureModel.update(lecId, nextData);
    if (result.changes === 0) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    res.status(200).json({ success: true, message: "Lecture updated successfully", data: { Lec_ID: Number(lecId), ...nextData } });
});

const createLecture = asyncWrapper(async (req, res) => {
    const { classId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body;

    if (!day || !time || !type || !title || !date) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    if (['Lecture', 'Section', 'Lab'].includes(type) && room_id) {
        // 1. Check scheduling conflicts
        const scheduleCheck = await checkRoomScheduledConflict(room_id, date, time);
        if (!scheduleCheck.available) {
            return res.status(400).json({ success: false, message: scheduleCheck.reason });
        }

        // 2. Check if the room is currently occupied (prevents on-the-fly overlap)
        const occupiedCheck = await checkRoomOccupiedNow(room_id);
        if (!occupiedCheck.available) {
            return res.status(400).json({ success: false, message: occupiedCheck.reason });
        }
    }

    const newData = {
        Title: title,
        Date: date,
        Day: day,
        Time: time,
        Type: type,
        Room_ID: room_id || null,
        Meeting_Link: meeting_link || null,
        Class_ID: classId
    };

    const result = await lectureModel.create(newData);

    // Send notifications to all students in the class
    db.all(
        `SELECT User_ID FROM Enrollment WHERE Class_ID = ?`,
        [classId],
        (err, students) => {
            if (!err && students) {
                const now = new Date().toISOString();
                const insertNotif = db.prepare(
                    `INSERT INTO Notification (User_ID, Title, Message, Type, Is_Read, Created_At) VALUES (?, ?, ?, ?, 0, ?)`
                );
                students.forEach(student => {
                    insertNotif.run(
                        student.User_ID,
                        'New Lecture Scheduled',
                        `A new lecture "${title}" has been scheduled for ${date} at ${time}.`,
                        'new_lecture',
                        now
                    );
                });
                insertNotif.finalize();
            }
        }
    );

    res.status(201).json({
        success: true,
        message: "Lecture created successfully",
        data: { Lec_ID: result.lastID, ...newData }
    });
});

const deleteLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;

    const result = await lectureModel.delete(lecId);

    if (result.changes === 0) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

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
    const lecture = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM Lecture WHERE Lec_ID = ?`, [lecId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

    if (!lecture) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    // Offline (Lecture/Section/Lab): doctor can only start within [scheduled_time, scheduled_time + 60min]
    // Online: can start anytime
    if (['Lecture', 'Section', 'Lab'].includes(lecture.Type)) {
        const dateStr = lecture.Date;
        const timeStr = lecture.Time;

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

    if (['Lecture', 'Section', 'Lab'].includes(lecture.Type) && lecture.Room_ID) {
        const occupiedCheck = await checkRoomOccupiedNow(lecture.Room_ID, lecId);
        if (!occupiedCheck.available) {
            return res.status(400).json({ success: false, message: occupiedCheck.reason });
        }
    }

    const { attendanceCode } = req.body || {};
    let finalCode = undefined;

    if (lecture.Type === 'Online') {
        finalCode = attendanceCode || lecture.Attendance_Code;
        if (!finalCode) {
            // Generate a random 6-character alphanumeric code
            finalCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
    }

    const result = await lectureModel.update(lecId, {
        Status: 'open',
        Start_Time: now,
        Attendance_Code: lecture.Type === 'Online' ? finalCode : lecture.Attendance_Code
    });

    if (result.changes === 0) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    // Send notifications to all students in the class
    db.all(
        `SELECT User_ID FROM Enrollment WHERE Class_ID = ?`,
        [lecture.Class_ID],
        (err, students) => {
            if (!err && students) {
                const insertNotif = db.prepare(
                    `INSERT INTO Notification (User_ID, Title, Message, Type, Is_Read, Created_At) VALUES (?, ?, ?, ?, 0, ?)`
                );
                students.forEach(student => {
                    insertNotif.run(
                        student.User_ID,
                        'Lecture Started',
                        `The lecture "${lecture.Title}" has started. You can now record your attendance.`,
                        'lecture_started',
                        now
                    );
                });
                insertNotif.finalize();
            }
        }
    );

    res.status(200).json({
        success: true,
        message: "Lecture started successfully",
        data: lecture.Type === 'Online'
            ? { Start_Time: now, Attendance_Code: finalCode }
            : { Start_Time: now }
    });
});

const endLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;
    const now = new Date().toISOString();

    // Do NOT set Status to 'closed' yet. Keep it open so students can scan out.
    // The attendance controller will automatically close it after 15 minutes.
    const result = await lectureModel.update(lecId, {
        Status: 'open',
        End_Time: now
    });

    if (result.changes === 0) {
        return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    res.status(200).json({
        success: true,
        message: "Lecture ended. Students have 15 minutes to record departure attendance.",
        data: { End_Time: now }
    });
});

module.exports = { getLecturesByClassID, getLectureById, createLecture, updateLecture, deleteLecture, startLecture, endLecture };