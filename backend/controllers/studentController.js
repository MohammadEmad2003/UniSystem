const db = require('../utilities/database');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');
const gpaService = require('../services/gpaService');

const studentQueries = genericQueries('Student', { primaryKey: 'user_id' });
const userQueries = genericQueries('User', { primaryKey: 'user_id' });

const getStudentStats = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;

    if (!studentId || !studentId.toString().trim()) {
        return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const query = `
        SELECT
            total_gpa AS gpa,
            total_hours AS total_hours,
            (SELECT COUNT(*) FROM Enrollment WHERE user_id = $1) AS enrolled_classes,
            (SELECT COUNT(*) FROM Lecture WHERE class_id IN (SELECT class_id FROM Enrollment WHERE user_id = $2)) AS upcoming_lectures
        FROM Student
        WHERE user_id = $3
    `;

    try {
        const stats = await db.query(query, [studentId, studentId, studentId]);
        if (!stats.rows || stats.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const statsData = stats.rows[0];
        res.status(200).json({
            success: true,
            data: {
                gpa: statsData.gpa || 0,
                total_hours: statsData.total_hours || 0,
                enrolled_classes: statsData.enrolled_classes || 0,
                upcoming_lectures: statsData.upcoming_lectures || 0,
                unread_notifications: 0
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});


const getAllStudents = asyncWrapper(async (req, res) => {
    const students = await studentQueries.getAll();

    const studentsWithUserData = await Promise.all(
        students.map(async (student) => {
            const user = await userQueries.getById(student.user_id);
            if (!user) {
                return null;
            }

            return {
                user_id: student.user_id,
                f_name: user.f_name,
                l_name: user.l_name,
                email: user.email,
                account_status: user.account_status,
                academic_level: student.academic_level,
                payment_status: student.payment_status,
                nfc_tag_id: student.nfc_tag_id,
                ssn: student.ssn,
                dept_id: student.dept_id,
                total_hours: student.total_hours,
                total_gpa: student.total_gpa
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

    const studentResult = await db.query(
        `SELECT academic_level, semester, payment_status, paid_amount
         FROM Student
         WHERE user_id = $1`,
        [studentId]
    );
    const student = studentResult.rows[0];

    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const coursesResult = await db.query(
        `SELECT co.course_code, co.name, co.credit_hours, cl.semester,
                alf.hour_price, alf.total_fees as fixed_fees
         FROM Enrollment e
         JOIN Class cl ON e.class_id = cl.class_id
         JOIN Courses co ON cl.course_code = co.course_code
         JOIN Student s ON e.user_id = s.user_id
         LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
         WHERE e.user_id = $1`,
        [studentId]
    );
    const courses = coursesResult.rows || [];

    const feeInfoResult = await db.query(
        `SELECT hour_price, total_fees 
         FROM Academic_Level_Fees 
         WHERE academic_level = $1 AND semester = $2`,
        [student.academic_level, student.semester]
    );
    const feeInfo = feeInfoResult.rows[0];

    let totalHours = 0;
    courses.forEach(c => totalHours += (c.credit_hours || 0));

    let totalFees = 0;
    if (feeInfo) {
        // If they have hours, multiply. Otherwise use fixed Total_Fees
        totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
    }

    const remaining = Math.max(0, totalFees - (student.paid_amount || 0));

    res.status(200).json({
        success: true,
        data: {
            academic_level: student.academic_level,
            payment_status: student.payment_status,
            paid_amount: student.paid_amount,
            total_fees: totalFees,
            remaining_amount: remaining,
            total_hours: totalHours,
            hour_price: feeInfo?.hour_price || 0,
            courses: courses
        }
    });
});

const makePayment = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const studentResult = await db.query(`SELECT paid_amount, academic_level, semester FROM Student WHERE user_id = $1`, [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const coursesResult = await db.query(
        `SELECT co.credit_hours, alf.hour_price, alf.total_fees as fixed_fees
         FROM Enrollment e
         JOIN Class cl ON e.class_id = cl.class_id
         JOIN Courses co ON cl.course_code = co.course_code
         JOIN Student s ON e.user_id = s.user_id
         LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND cl.semester = alf.semester
         WHERE e.user_id = $1`,
        [studentId]
    );
    const courses = coursesResult.rows || [];

    const feeInfoResult = await db.query(
        `SELECT hour_price, total_fees 
         FROM Academic_Level_Fees 
         WHERE academic_level = $1 AND semester = $2`,
        [student.academic_level, student.semester]
    );
    const feeInfo = feeInfoResult.rows[0];

    let totalHours = 0;
    courses.forEach(c => totalHours += (c.credit_hours || 0));

    let totalFees = 0;
    if (feeInfo) {
        totalFees = totalHours > 0 ? (totalHours * (feeInfo.hour_price || 0)) : (feeInfo.total_fees || 0);
    }

    const newPaidAmount = (student.paid_amount || 0) + Number(amount);
    let newStatus = 'Unpaid';
    if (newPaidAmount >= totalFees && totalFees > 0) {
        newStatus = 'Paid';
    } else if (newPaidAmount > 0) {
        newStatus = 'Partial';
    }

    await db.query(
        `UPDATE Student SET paid_amount = $1, payment_status = $2 WHERE user_id = $3`,
        [newPaidAmount, newStatus, studentId]
    );

    res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
            paid_amount: newPaidAmount,
            payment_status: newStatus,
            total_fees: totalFees,
            remaining_amount: Math.max(0, totalFees - newPaidAmount)
        }
    });
});

const getTranscript = asyncWrapper(async (req, res) => {
    const { studentId } = req.params;
    const transcript = await gpaService.getStudentTranscript(studentId);
    res.status(200).json({ success: true, data: transcript });
});

module.exports = { getStudentStats, getAllStudents, getPaymentDetails, makePayment, getTranscript };