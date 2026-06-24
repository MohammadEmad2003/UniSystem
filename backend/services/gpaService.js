const db = require('../utilities/database');

/**
 * Converts total marks (0-100) to GPA points (0-4.0)
 * @param {number} totalMarks 
 * @returns {number} GPA points
 */
const calculateCourseGPA = (totalMarks) => {
    if (totalMarks >= 90) return 4.0;
    if (totalMarks >= 85) return 3.7;
    if (totalMarks >= 80) return 3.3;
    if (totalMarks >= 75) return 3.0;
    if (totalMarks >= 70) return 2.7;
    if (totalMarks >= 65) return 2.3;
    if (totalMarks >= 60) return 2.0;
    if (totalMarks >= 55) return 1.7;
    if (totalMarks >= 50) return 1.0;
    return 0.0;
};

/**
 * Recalculates student's total GPA and total hours
 * @param {number} studentId 
 */
const recalculateStudentGPA = async (studentId) => {
    const query = `
        SELECT 
            g.gpa,
            c.course_code,
            co.credit_hours
        FROM Grades g
        JOIN Class c ON g.class_id = c.class_id
        JOIN Courses co ON c.course_code = co.course_code
        WHERE g.user_id = $1 AND g.final IS NOT NULL
    `;

    const result = await db.query(query, [studentId]);
    const rows = result.rows || [];

    let totalPoints = 0;
    let totalHours = 0;

    rows.forEach(row => {
        totalPoints += (row.gpa * row.credit_hours);
        totalHours += row.credit_hours;
    });

    const cumulativeGPA = totalHours > 0 ? (totalPoints / totalHours).toFixed(2) : 0.00;

    await db.query(
        `UPDATE Student SET total_gpa = $1, total_hours = $2 WHERE user_id = $3`,
        [cumulativeGPA, totalHours, studentId]
    );

    return { cumulativeGPA, totalHours };
};

/**
 * Validates if a student can enroll in a class based on credit hour limits
 * @param {number} studentId 
 * @param {number} classId 
 * @returns {Promise<{canEnroll: boolean, message: string}>}
 */
const canEnrollInClass = async (studentId, classId) => {
    // 1. Get student's academic level, total GPA, and target class semester/level
    const dataResult = await db.query(
        `SELECT s.academic_level, s.total_gpa, alf.max_hours, c.semester as target_semester, c.level as target_level, co.credit_hours as new_class_hours
         FROM Student s
         JOIN Class c ON c.class_id = $1
         JOIN Courses co ON c.course_code = co.course_code
         LEFT JOIN Academic_Level_Fees alf ON s.academic_level = alf.academic_level AND c.semester = alf.semester
         WHERE s.user_id = $2`,
        [classId, studentId]
    );
    const data = dataResult.rows[0];

    if (!data) return { canEnroll: false, message: "Required data not found" };

    const { academic_level, total_gpa, max_hours, target_semester, target_level, new_class_hours } = data;

    // Determine dynamic Max Hours based on GPA
    let effectiveMaxHours = max_hours || 18; // Default to 18 if not set
    let statusMessage = "";

    if (total_gpa >= 3.4) {
        effectiveMaxHours = 21;
        statusMessage = " (Overload allowed for high GPA)";
    } else if (total_gpa < 2.0 && total_gpa > 0) {
        effectiveMaxHours = 12;
        statusMessage = " (Probation limit applied due to low GPA)";
    }

    // 2. Get current enrolled hours for this SPECIFIC semester and level
    const enrolledResult = await db.query(
        `SELECT co.credit_hours
         FROM Enrollment e
         JOIN Class c ON e.class_id = c.class_id
         JOIN Courses co ON c.course_code = co.course_code
         WHERE e.user_id = $1 AND c.level = $2 AND c.semester = $3`,
        [studentId, target_level, target_semester]
    );
    const enrolledCourses = enrolledResult.rows || [];

    const currentHours = enrolledCourses.reduce((sum, course) => sum + course.credit_hours, 0);

    if (currentHours + new_class_hours > effectiveMaxHours) {
        return { 
            canEnroll: false, 
            message: `Limit exceeded! For ${target_semester} (Level ${target_level}), your max is ${effectiveMaxHours} hours${statusMessage}. You are currently at ${currentHours} hours.` 
        };
    }

    return { canEnroll: true, message: "Success" };
};

const checkPrerequisites = async (studentId, classId) => {
    const clsResult = await db.query(`SELECT course_code FROM Class WHERE class_id = $1`, [classId]);
    const cls = clsResult.rows[0];

    if (!cls) return { canEnroll: false, message: "Class not found" };

    const prereqsResult = await db.query(`SELECT prereq_course_code FROM Course_Prerequisites WHERE course_code = $1`, [cls.course_code]);
    const prereqs = prereqsResult.rows || [];

    if (prereqs.length === 0) return { canEnroll: true };

    const prereqCodes = prereqs.map(p => p.prereq_course_code);
    const placeholders = prereqCodes.map((_, i) => `$${i + 2}`).join(',');

    const passedResult = await db.query(
        `SELECT c.course_code 
         FROM Grades g
         JOIN Class c ON g.class_id = c.class_id
         WHERE g.user_id = $1 AND c.course_code IN (${placeholders}) AND g.gpa > 0`,
        [studentId, ...prereqCodes]
    );
    const passedPrereqs = passedResult.rows || [];

    const passedCodes = passedPrereqs.map(p => p.course_code);
    const missing = prereqCodes.filter(code => !passedCodes.includes(code));

    if (missing.length > 0) {
        return { 
            canEnroll: false, 
            message: `Missing prerequisites: ${missing.join(', ')}. You must pass these courses first.` 
        };
    }

    return { canEnroll: true };
};

const getStudentTranscript = async (studentId) => {
    const query = `
        SELECT 
            g.gpa,
            g.midterm, g.project, g.practical, g.attendance, g.final,
            c.semester,
            c.level,
            c.course_code,
            co.name as course_name,
            co.credit_hours
        FROM Grades g
        JOIN Class c ON g.class_id = c.class_id
        JOIN Courses co ON c.course_code = co.course_code
        WHERE g.user_id = $1
        ORDER BY c.level ASC, c.semester ASC
    `;

    const result = await db.query(query, [studentId]);
    const rows = result.rows || [];

    const transcript = {};
    rows.forEach(row => {
        const key = `Level ${row.level} - ${row.semester}`;
        if (!transcript[key]) {
            transcript[key] = {
                semester: row.semester,
                level: row.level,
                courses: [],
                semesterGPA: 0,
                totalHours: 0,
                totalPoints: 0
            };
        }
        transcript[key].courses.push(row);
        if (row.final !== null) {
            transcript[key].totalPoints += (row.gpa * row.credit_hours);
            transcript[key].totalHours += row.credit_hours;
        }
    });

    Object.values(transcript).forEach(sem => {
        sem.semesterGPA = sem.totalHours > 0 ? (sem.totalPoints / sem.totalHours).toFixed(2) : "0.00";
    });

    return transcript;
};

module.exports = {
    calculateCourseGPA,
    recalculateStudentGPA,
    canEnrollInClass,
    checkPrerequisites,
    getStudentTranscript
};
