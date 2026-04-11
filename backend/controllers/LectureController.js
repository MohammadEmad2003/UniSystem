const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");

const getLecturesByClassID = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

    return new Promise((resolve, reject) => {
        db.all(`
            SELECT 
                Lec_ID AS Lec_ID,
                Class_ID AS Class_id,
                Day AS day,
                Time AS time,
                Type AS type,
                Room_ID AS room_id,
                Meeting_Link AS meeting_link,
                Title AS title,
                Date AS date
            FROM Lecture
            WHERE Class_ID = ?
        `, [classId], (err, rows) => {
            if (err) {
                console.error("Error fetching lectures:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching lectures"
                });
            }

            console.log("Lectures found for class", classId, ":", rows);

            res.status(200).json({
                success: true,
                data: rows || []
            });
            resolve();
        });
    });
});

const createLecture = asyncWrapper(async (req, res) => {
    const { classId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body;

    if (!day || !time || !type || !title || !date) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields: day, time, type, title, date"
        });
    }

    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO Lecture (Title, Date, Day, Time, Type, Room_ID, Meeting_Link, Class_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [title, date, day, time, type, room_id || null, meeting_link || null, classId], function(err) {
            if (err) {
                console.error("Error creating lecture:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error creating lecture"
                });
            }

            console.log("Lecture created with ID:", this.lastID);

            res.status(201).json({
                success: true,
                message: "Lecture created successfully",
                data: {
                    Lec_ID: this.lastID,
                    Title: title,
                    Date: date,
                    Day: day,
                    Time: time,
                    Type: type,
                    Room_ID: room_id || null,
                    Meeting_Link: meeting_link || null,
                    Class_ID: classId
                }
            });
            resolve();
        });
    });
});

const deleteLecture = asyncWrapper(async (req, res) => {
    const { lecId } = req.params;

    return new Promise((resolve, reject) => {
        db.run(`
            DELETE FROM Lecture
            WHERE Lec_ID = ?
        `, [lecId], function(err) {
            if (err) {
                console.error("Error deleting lecture:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error deleting lecture"
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Lecture not found"
                });
            }

            console.log("Lecture deleted with ID:", lecId);

            res.status(200).json({
                success: true,
                message: "Lecture deleted successfully"
            });
            resolve();
        });
    });
});

module.exports = { getLecturesByClassID, createLecture, deleteLecture };