const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries'); 

const lectureModel = genericQueries('Lecture', { 
    primaryKey: 'Lec_ID', 
    emailField: 'none'    
});
const getLecturesByClassID = asyncWrapper(async (req, res) => {
    const { classId } = req.params;

    // مفيش Loop هنا! قاعدة البيانات بتبعتلك المصفوفة جاهزة
    const lectures = await lectureModel.getAllByField('Class_ID', classId);

    res.status(200).json({
        success: true,
        data: lectures
    });
});

const createLecture = asyncWrapper(async (req, res) => {
    const { classId } = req.params;
    const { day, time, type, room_id, title, date, meeting_link } = req.body;

    if (!day || !time || !type || !title || !date) {
        return res.status(400).json({ success: false, message: "Missing fields" });
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

module.exports = { getLecturesByClassID, createLecture, deleteLecture };