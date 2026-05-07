const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const studentQueries = genericQueries('Student', { primaryKey: 'User_ID' });
const userQueries = genericQueries('User', { primaryKey: 'User_ID' });
const getStudentStats = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;

    if (!studentId || !studentId.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

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
            return res.status(404).json({ success: false, message: 'Student not found' });
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
            if (!user) {
                return null;
            }

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
        data: studentsWithUserData.filter(Boolean)
    });
});

const getPaymentDetails = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;

    const student = await new Promise((resolve, reject) => {
        db.get(
            `SELECT s.Academic_Level, s.Payment_Status, s.Paid_Amount, 
                    COALESCE(alf.Total_Fees, 0) as Total_Fees
             FROM Student s
             LEFT JOIN Academic_Level_Fees alf ON s.Academic_Level = alf.Academic_Level
             WHERE s.User_ID = ?`,
            [studentId],
            (err, row) => {
                if (err) return reject(err);
                resolve(row);
            }
        );
    });

    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const remaining = Math.max(0, student.Total_Fees - student.Paid_Amount);

    res.status(200).json({
        success: true,
        data: {
            ...student,
            remaining_amount: remaining
        }
    });
});

const makePayment = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const student = await new Promise((resolve, reject) => {
        db.get(
            `SELECT s.Academic_Level, s.Payment_Status, s.Paid_Amount, 
                    COALESCE(alf.Total_Fees, 0) as Total_Fees
             FROM Student s
             LEFT JOIN Academic_Level_Fees alf ON s.Academic_Level = alf.Academic_Level
             WHERE s.User_ID = ?`,
            [studentId],
            (err, row) => {
                if (err) return reject(err);
                resolve(row);
            }
        );
    });

    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const newPaidAmount = student.Paid_Amount + Number(amount);
    let newStatus = 'Unpaid';
    if (newPaidAmount >= student.Total_Fees && student.Total_Fees > 0) {
        newStatus = 'Paid';
    } else if (newPaidAmount > 0) {
        newStatus = 'Partial';
    }

    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE Student SET Paid_Amount = ?, Payment_Status = ? WHERE User_ID = ?`,
            [newPaidAmount, newStatus, studentId],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });

    res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
            paid_amount: newPaidAmount,
            payment_status: newStatus,
            total_fees: student.Total_Fees,
            remaining_amount: Math.max(0, student.Total_Fees - newPaidAmount)
        }
    });
});

module.exports = { getStudentStats, getAllStudents, getPaymentDetails, makePayment };