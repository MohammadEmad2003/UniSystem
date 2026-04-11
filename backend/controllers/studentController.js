const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const studentQueries = genericQueries('Student', { primaryKey: 'User_ID' });
const userQueries = genericQueries('User', { primaryKey: 'User_ID' });
const getStudentStats = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;

    const query = `
        SELECT
            Total_GPA AS gpa,
            Total_Hours AS total_hours,
            (SELECT COUNT(*) FROM Enrollment WHERE User_ID = ?) AS enrolled_classes,
            (SELECT COUNT(*) FROM Lecture WHERE Class_ID IN (SELECT Class_ID FROM Enrollment WHERE User_ID = ?)) AS upcoming_lectures
        FROM Student
        WHERE User_ID = ?
    `;

    db.get(query, [studentId, studentId, studentId], (err, stats) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!stats) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.status(200).json({
            success: true,
            data: {
                gpa: stats.gpa || 0,
                total_hours: stats.total_hours || 0,
                enrolled_classes: stats.enrolled_classes || 0,
                upcoming_lectures: stats.upcoming_lectures || 0,
                unread_notifications: 0
            }
        });
    });
});


const getAllStudents = asyncWrapper(async (req, res) => {
    const students = await studentQueries.getAll();

    const studentsWithUserData = await Promise.all(
        students.map(async (student) => {
            const user = await userQueries.getById(student.User_ID);
            return {
                User_ID: student.User_ID,
                F_Name: user.F_Name,
                L_Name: user.L_Name,
                Email: user.Email,
                Account_Status: user.Account_Status,
                Academic_Level: student.Academic_Level,
                Payment_Status: student.Payment_Status,
                NFC_Tag_ID: student.NFC_Tag_ID,
                SSN: student.SSN,
                Dept_ID: student.Dept_ID,
                Total_Hours: student.Total_Hours,
                Total_GPA: student.Total_GPA
            };
        })
    );

    res.status(200).json({
        success: true,
        data: studentsWithUserData
    });
});

module.exports = { getStudentStats, getAllStudents };