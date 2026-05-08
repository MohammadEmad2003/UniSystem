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
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                g.GPA,
                c.Course_Code,
                co.Credit_Hours
            FROM Grades g
            JOIN Class c ON g.Class_ID = c.Class_ID
            JOIN Courses co ON c.Course_Code = co.Course_Code
            WHERE g.User_ID = ? AND g.Final IS NOT NULL
        `;

        db.all(query, [studentId], async (err, rows) => {
            if (err) return reject(err);

            let totalPoints = 0;
            let totalHours = 0;

            rows.forEach(row => {
                totalPoints += (row.GPA * row.Credit_Hours);
                totalHours += row.Credit_Hours;
            });

            const cumulativeGPA = totalHours > 0 ? (totalPoints / totalHours).toFixed(2) : 0.00;

            db.run(
                `UPDATE Student SET Total_GPA = ?, Total_Hours = ? WHERE User_ID = ?`,
                [cumulativeGPA, totalHours, studentId],
                (updateErr) => {
                    if (updateErr) return reject(updateErr);
                    resolve({ cumulativeGPA, totalHours });
                }
            );
        });
    });
};

/**
 * Validates if a student can enroll in a class based on credit hour limits
 * @param {number} studentId 
 * @param {number} classId 
 * @returns {Promise<{canEnroll: boolean, message: string}>}
 */
const canEnrollInClass = async (studentId, classId) => {
    return new Promise((resolve, reject) => {
        // 1. Get student's academic level, total GPA, and target class semester/level
        db.get(
            `SELECT s.Academic_Level, s.Total_GPA, alf.Max_Hours, c.Semester as TargetSemester, c.Level as TargetLevel, co.Credit_Hours as NewClassHours
             FROM Student s
             JOIN Class c ON c.Class_ID = ?
             JOIN Courses co ON c.Course_Code = co.Course_Code
             LEFT JOIN Academic_Level_Fees alf ON s.Academic_Level = alf.Academic_Level AND c.Semester = alf.Semester
             WHERE s.User_ID = ?`,
            [classId, studentId],
            (err, data) => {
                if (err) return reject(err);
                if (!data) return resolve({ canEnroll: false, message: "Required data not found" });

                const { Academic_Level, Total_GPA, Max_Hours, TargetSemester, TargetLevel, NewClassHours } = data;

                // Determine dynamic Max Hours based on GPA
                let effectiveMaxHours = Max_Hours || 18; // Default to 18 if not set
                let statusMessage = "";

                if (Total_GPA >= 3.4) {
                    effectiveMaxHours = 21;
                    statusMessage = " (Overload allowed for high GPA)";
                } else if (Total_GPA < 2.0 && Total_GPA > 0) {
                    effectiveMaxHours = 12;
                    statusMessage = " (Probation limit applied due to low GPA)";
                }

                // 2. Get current enrolled hours for this SPECIFIC semester and level
                db.all(
                    `SELECT co.Credit_Hours
                     FROM Enrollment e
                     JOIN Class c ON e.Class_ID = c.Class_ID
                     JOIN Courses co ON c.Course_Code = co.Course_Code
                     WHERE e.User_ID = ? AND c.Level = ? AND c.Semester = ?`,
                    [studentId, TargetLevel, TargetSemester],
                    (enrollErr, enrolledCourses) => {
                        if (enrollErr) return reject(enrollErr);

                        const currentHours = enrolledCourses.reduce((sum, course) => sum + course.Credit_Hours, 0);

                        if (currentHours + NewClassHours > effectiveMaxHours) {
                            return resolve({ 
                                canEnroll: false, 
                                message: `Limit exceeded! For ${TargetSemester} (Level ${TargetLevel}), your max is ${effectiveMaxHours} hours${statusMessage}. You are currently at ${currentHours} hours.` 
                            });
                        }

                        resolve({ canEnroll: true, message: "Success" });
                    }
                );
            }
        );
    });
};

const checkPrerequisites = async (studentId, classId) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT Course_Code FROM Class WHERE Class_ID = ?`, [classId], (err, cls) => {
            if (err) return reject(err);
            if (!cls) return resolve({ canEnroll: false, message: "Class not found" });

            db.all(`SELECT Prereq_Course_Code FROM Course_Prerequisites WHERE Course_Code = ?`, [cls.Course_Code], (prereqErr, prereqs) => {
                if (prereqErr) return reject(prereqErr);
                if (prereqs.length === 0) return resolve({ canEnroll: true });

                const prereqCodes = prereqs.map(p => p.Prereq_Course_Code);
                const placeholders = prereqCodes.map(() => '?').join(',');

                db.all(
                    `SELECT c.Course_Code 
                     FROM Grades g
                     JOIN Class c ON g.Class_ID = c.Class_ID
                     WHERE g.User_ID = ? AND c.Course_Code IN (${placeholders}) AND g.GPA > 0`,
                    [studentId, ...prereqCodes],
                    (passErr, passedPrereqs) => {
                        if (passErr) return reject(passErr);

                        const passedCodes = passedPrereqs.map(p => p.Course_Code);
                        const missing = prereqCodes.filter(code => !passedCodes.includes(code));

                        if (missing.length > 0) {
                            return resolve({ 
                                canEnroll: false, 
                                message: `Missing prerequisites: ${missing.join(', ')}. You must pass these courses first.` 
                            });
                        }

                        resolve({ canEnroll: true });
                    }
                );
            });
        });
    });
};

const getStudentTranscript = async (studentId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                g.GPA,
                g.Midterm, g.Project, g.Practical, g.Attendance, g.Final,
                c.Semester,
                c.Level,
                c.Course_Code,
                co.Name as Course_Name,
                co.Credit_Hours
            FROM Grades g
            JOIN Class c ON g.Class_ID = c.Class_ID
            JOIN Courses co ON c.Course_Code = co.Course_Code
            WHERE g.User_ID = ?
            ORDER BY c.Level ASC, c.Semester ASC
        `;

        db.all(query, [studentId], (err, rows) => {
            if (err) return reject(err);

            const transcript = {};
            rows.forEach(row => {
                const key = `Level ${row.Level} - ${row.Semester}`;
                if (!transcript[key]) {
                    transcript[key] = {
                        semester: row.Semester,
                        level: row.Level,
                        courses: [],
                        semesterGPA: 0,
                        totalHours: 0,
                        totalPoints: 0
                    };
                }
                transcript[key].courses.push(row);
                if (row.Final !== null) {
                    transcript[key].totalPoints += (row.GPA * row.Credit_Hours);
                    transcript[key].totalHours += row.Credit_Hours;
                }
            });

            Object.values(transcript).forEach(sem => {
                sem.semesterGPA = sem.totalHours > 0 ? (sem.totalPoints / sem.totalHours).toFixed(2) : "0.00";
            });

            resolve(transcript);
        });
    });
};

module.exports = {
    calculateCourseGPA,
    recalculateStudentGPA,
    canEnrollInClass,
    checkPrerequisites,
    getStudentTranscript
};
