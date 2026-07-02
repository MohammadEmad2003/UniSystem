const db = require('../utilities/database');

/**
 * Converts total marks (0-100) to GPA points (0-4.0) and Letter Grade
 * GPA Scale (Standard 4.0 Scale):
 * 90-100: A (4.0) - Excellent
 * 85-89:  A- (3.7) - Very Good
 * 80-84:  B+ (3.3) - Good+
 * 75-79:  B  (3.0) - Good
 * 70-74:  B- (2.7) - Good-
 * 65-69:  C+ (2.3) - Satisfactory+
 * 60-64:  C  (2.0) - Satisfactory
 * 55-59:  C- (1.7) - Satisfactory-
 * 50-54:  D  (1.0) - Passing
 * 0-49:   F  (0.0) - Fail
 * @param {number} totalMarks
 * @returns {object} { gpa: number, letter: string, status: string }
 */
const calculateCourseGPA = (earnedMarks, maxMarks = 100) => {
    let percentage = 0;

    if (typeof earnedMarks === 'number') {
        if (typeof maxMarks === 'number' && maxMarks > 0) {
            percentage = (earnedMarks / maxMarks) * 100;
        } else {
            percentage = earnedMarks;
        }
    }

    percentage = Math.min(Math.max(percentage, 0), 100);

    if (percentage >= 90) return { gpa: 4.0, letter: 'A', status: 'Excellent' };
    if (percentage >= 85) return { gpa: 3.7, letter: 'A-', status: 'Very Good' };
    if (percentage >= 80) return { gpa: 3.3, letter: 'B+', status: 'Good+' };
    if (percentage >= 75) return { gpa: 3.0, letter: 'B', status: 'Good' };
    if (percentage >= 70) return { gpa: 2.7, letter: 'B-', status: 'Good-' };
    if (percentage >= 65) return { gpa: 2.3, letter: 'C+', status: 'Satisfactory+' };
    if (percentage >= 60) return { gpa: 2.0, letter: 'C', status: 'Satisfactory' };
    if (percentage >= 55) return { gpa: 1.7, letter: 'C-', status: 'Satisfactory-' };
    if (percentage >= 50) return { gpa: 1.0, letter: 'D', status: 'Passing' };
    return { gpa: 0.0, letter: 'F', status: 'Fail' };
};

/**
 * Recalculates student's total GPA and total hours
 * Distinguishes between passed (gpa > 0) and failed (gpa = 0) courses
 * Only passed courses count toward cumulative GPA
 * @param {number} studentId
 * @returns {object} { cumulativeGPA, totalHours, passedHours, failedCourses }
 */
const recalculateStudentGPA = async (studentId) => {
    const query = `
        SELECT 
            g.grade_id,
            g.gpa,
            g.midterm,
            g.project,
            g.practical,
            g.attendance,
            g.final,
            g.max_midterm,
            g.max_project,
            g.max_practical,
            g.max_attendance,
            g.max_final,
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
    let passedHours = 0;
    let failedCourses = [];

    for (const row of rows) {
        const creditHours = parseInt(row.credit_hours) || 0;
        const totalMarks = (row.midterm || 0) + (row.project || 0) + (row.practical || 0) + (row.attendance || 0) + (row.final || 0);
        const maxTotal = (row.max_midterm || 0) + (row.max_project || 0) + (row.max_practical || 0) + (row.max_attendance || 0) + (row.max_final || 0);
        const recalculatedGpa = maxTotal > 0 ? calculateCourseGPA(totalMarks, maxTotal).gpa : parseFloat(row.gpa) || 0;

        if (recalculatedGpa !== parseFloat(row.gpa)) {
            await db.query(`UPDATE Grades SET gpa = $1 WHERE grade_id = $2`, [recalculatedGpa, row.grade_id]);
        }

        const gpaVal = recalculatedGpa;

        if (gpaVal > 0) {
            totalPoints += (gpaVal * creditHours);
            totalHours += creditHours;
            passedHours += creditHours;
        } else {
            failedCourses.push({
                course_code: row.course_code,
                credit_hours: creditHours
            });
        }
    }

    const cumulativeGPA = totalHours > 0 ? (totalPoints / totalHours).toFixed(2) : 0.00;

    await db.query(
        `UPDATE Student SET total_gpa = $1, total_hours = $2 WHERE user_id = $3`,
        [cumulativeGPA, totalHours, studentId]
    );

    return { cumulativeGPA, totalHours, passedHours, failedCourses };
};

/**
 * Validates if a student can enroll in a class based on credit hour limits
 * Added: Level validation, academic probation checks, semester sequence validation
 * @param {number} studentId
 * @param {number} classId
 * @returns {Promise<{canEnroll: boolean, message: string, warnings: string[]}>}
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

    if (!data) return { canEnroll: false, message: "Required data not found", warnings: [] };

    const { academic_level, total_gpa, max_hours, target_semester, target_level, new_class_hours } = data;
    const warnings = [];

    // 2. Level validation - check if student is trying to enroll in a course from a higher level
    const studentLevel = parseInt(academic_level);
    const targetLevelNum = parseInt(target_level);

    if (targetLevelNum > studentLevel) {
        return {
            canEnroll: false,
            message: `Cannot enroll in Level ${target_level} course. You are currently at Level ${academic_level}.`,
            warnings: []
        };
    }

    // 3. Academic probation checks
    const gpaVal = parseFloat(total_gpa) || 0;
    if (gpaVal > 0 && gpaVal < 2.0) {
        warnings.push("⚠️ You are on Academic Probation (GPA < 2.0). Please consult your academic advisor.");
    } else if (gpaVal > 0 && gpaVal < 2.5) {
        warnings.push("⚠️ Your GPA is below 2.5. Consider reducing your course load.");
    }

    // 4. Determine dynamic Max Hours based on GPA
    let effectiveMaxHours = max_hours || 18; // Default to 18 if not set
    let statusMessage = "";

    if (gpaVal >= 3.4) {
        effectiveMaxHours = 21;
        statusMessage = " (Overload allowed for high GPA)";
    } else if (gpaVal < 2.0 && gpaVal > 0) {
        effectiveMaxHours = 12;
        statusMessage = " (Probation limit applied due to low GPA)";
    }

    // 5. Get current enrolled hours for this SPECIFIC semester and level
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
            message: `Limit exceeded! For ${target_semester} (Level ${target_level}), your max is ${effectiveMaxHours} hours${statusMessage}. You are currently at ${currentHours} hours.`,
            warnings: warnings
        };
    }

    // 6. Semester sequence validation - check if student has completed previous semester
    if (target_semester === 'Spring' || target_semester === 'Spring 2') {
        // Check if student has completed Fall courses
        const prevSemesterResult = await db.query(
            `SELECT COUNT(*) as count
             FROM Enrollment e
             JOIN Class c ON e.class_id = c.class_id
             WHERE e.user_id = $1 AND c.level = $2 AND c.semester = 'Fall'`,
            [studentId, target_level]
        );
        const prevSemesterCount = parseInt(prevSemesterResult.rows[0]?.count || 0);

        if (prevSemesterCount === 0) {
            warnings.push("⚠️ You haven't enrolled in any Fall courses. Consider completing Fall semester first.");
        }
    }

    return {
        canEnroll: true,
        message: "Success",
        warnings: warnings
    };
};

/**
 * Checks if student has completed prerequisites for a course
 * Added: Flexible handling, special cases, and detailed feedback
 * @param {number} studentId
 * @param {number} classId
 * @returns {Promise<{canEnroll: boolean, message: string, missingPrereqs: string[]}>}
 */
const checkPrerequisites = async (studentId, classId) => {
    const clsResult = await db.query(`SELECT course_code FROM Class WHERE class_id = $1`, [classId]);
    const cls = clsResult.rows[0];

    if (!cls) return { canEnroll: false, message: "Class not found", missingPrereqs: [] };

    const prereqsResult = await db.query(`SELECT prereq_course_code FROM Course_Prerequisites WHERE course_code = $1`, [cls.course_code]);
    const prereqs = prereqsResult.rows || [];

    if (prereqs.length === 0) return { canEnroll: true, message: "No prerequisites required", missingPrereqs: [] };

    const prereqCodes = prereqs.map(p => p.prereq_course_code);
    const placeholders = prereqCodes.map((_, i) => `$${i + 2}`).join(',');

    // Check passed prerequisites (gpa > 0)
    const passedResult = await db.query(
        `SELECT c.course_code, g.gpa, g.final
         FROM Grades g
         JOIN Class c ON g.class_id = c.class_id
         WHERE g.user_id = $1 AND c.course_code IN (${placeholders}) AND g.gpa > 0`,
        [studentId, ...prereqCodes]
    );
    const passedPrereqs = passedResult.rows || [];

    const passedCodes = passedPrereqs.map(p => p.course_code);
    const missing = prereqCodes.filter(code => !passedCodes.includes(code));

    if (missing.length > 0) {
        // Check if student is enrolled in missing prerequisites (for better UX)
        const enrolledResult = await db.query(
            `SELECT DISTINCT c.course_code
             FROM Enrollment e
             JOIN Class c ON e.class_id = c.class_id
             WHERE e.user_id = $1 AND c.course_code IN (${placeholders})`,
            [studentId, ...missing]
        );
        const enrolledPrereqs = enrolledResult.rows || [];
        const enrolledCodes = enrolledPrereqs.map(p => p.course_code);

        const enrolledButNotPassed = missing.filter(code => enrolledCodes.includes(code));
        const notEnrolled = missing.filter(code => !enrolledCodes.includes(code));

        let message = "Missing prerequisites: ";
        if (enrolledButNotPassed.length > 0) {
            message += `${enrolledButNotPassed.join(', ')} (enrolled but not yet passed)`;
        }
        if (notEnrolled.length > 0) {
            if (enrolledButNotPassed.length > 0) message += ", ";
            message += `${notEnrolled.join(', ')} (not enrolled)`;
        }

        return {
            canEnroll: false,
            message: `${message}. You must complete these courses first.`,
            missingPrereqs: missing
        };
    }

    return { canEnroll: true, message: "All prerequisites satisfied", missingPrereqs: [] };
};

/**
 * Gets student's transcript with academic standing and cumulative GPA
 * Added: Academic standing calculation, honor roll, distinction between passed/failed courses
 * @param {number} studentId
 * @returns {object} { transcript, cumulativeGPA, academicStanding, totalHours, honorRoll }
 */
const getStudentTranscript = async (studentId) => {
    // Get student's current GPA and hours
    const studentResult = await db.query(
        `SELECT total_gpa, total_hours, academic_level FROM Student WHERE user_id = $1`,
        [studentId]
    );
    const studentData = studentResult.rows[0];

    const query = `
        SELECT
            g.gpa,
            g.midterm, g.project, g.practical, g.attendance, g.final,
            g.max_midterm, g.max_project, g.max_practical, g.max_attendance, g.max_final,
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
    let totalPassedHours = 0;
    let totalFailedCourses = 0;
    let totalPoints = 0;

    rows.forEach(row => {
        const key = `Level ${row.level} - ${row.semester}`;
        if (!transcript[key]) {
            transcript[key] = {
                semester: row.semester,
                level: row.level,
                courses: [],
                semesterGPA: 0,
                totalHours: 0,
                totalPoints: 0,
                passedHours: 0,
                failedCourses: 0
            };
        }

        const finalGrade = row.final !== null && row.final !== undefined ? parseFloat(row.final) : null;
        const creditHours = parseInt(row.credit_hours) || 0;

        const totalMarks = (row.midterm || 0) + (row.project || 0) + (row.practical || 0) + (row.attendance || 0) + (row.final || 0);
        const maxTotal = (row.max_midterm || 0) + (row.max_project || 0) + (row.max_practical || 0) + (row.max_attendance || 0) + (row.max_final || 0);
        const courseGrade = maxTotal > 0 ? calculateCourseGPA(totalMarks, maxTotal) : calculateCourseGPA(totalMarks);
        const gpaVal = courseGrade.gpa;

        transcript[key].courses.push({
            ...row,
            gpa: gpaVal,
            letter: courseGrade.letter,
            passed: gpaVal > 0
        });

        if (finalGrade !== null) {
            transcript[key].totalPoints += (gpaVal * creditHours);
            transcript[key].totalHours += creditHours;

            if (gpaVal > 0) {
                transcript[key].passedHours += creditHours;
                totalPassedHours += creditHours;
                totalPoints += (gpaVal * creditHours);
            } else {
                transcript[key].failedCourses += 1;
                totalFailedCourses += 1;
            }
        }
    });

    // Calculate semester GPAs
    Object.values(transcript).forEach(sem => {
        sem.semesterGPA = sem.totalHours > 0 ? (sem.totalPoints / sem.totalHours).toFixed(2) : "0.00";
    });

    // Calculate cumulative GPA
    const cumulativeGPA = totalPassedHours > 0 ? (totalPoints / totalPassedHours).toFixed(2) : "0.00";

    // Determine academic standing
    const gpaNum = parseFloat(cumulativeGPA) || 0;
    let academicStanding = 'Good Standing';
    let standingColor = 'green';

    if (gpaNum >= 3.5) {
        academicStanding = 'Dean\'s List';
        standingColor = 'gold';
    } else if (gpaNum >= 3.0) {
        academicStanding = 'Honor Roll';
        standingColor = 'blue';
    } else if (gpaNum >= 2.0) {
        academicStanding = 'Good Standing';
        standingColor = 'green';
    } else if (gpaNum >= 1.5) {
        academicStanding = 'Academic Warning';
        standingColor = 'orange';
    } else if (gpaNum > 0) {
        academicStanding = 'Academic Probation';
        standingColor = 'red';
    } else {
        academicStanding = 'No Grades Yet';
        standingColor = 'gray';
    }

    // Honor roll calculation (3.0+ GPA with minimum 12 credit hours)
    const honorRoll = gpaNum >= 3.0 && totalPassedHours >= 12;

    // If no grades found, use student's existing GPA from database
    if (rows.length === 0 && studentData) {
        const existingGPA = parseFloat(studentData.total_gpa) || 0;
        if (existingGPA > 0) {
            return {
                transcript,
                cumulativeGPA: existingGPA,
                academicStanding: existingGPA >= 2.0 ? 'Good Standing' : 'Academic Warning',
                standingColor: existingGPA >= 2.0 ? 'green' : 'orange',
                totalHours: parseInt(studentData.total_hours) || 0,
                totalFailedCourses: 0,
                honorRoll: existingGPA >= 3.0,
                academicLevel: studentData.academic_level || 1
            };
        }
    }

    return {
        transcript,
        cumulativeGPA: parseFloat(cumulativeGPA),
        academicStanding,
        standingColor,
        totalHours: totalPassedHours,
        totalFailedCourses,
        honorRoll,
        academicLevel: studentData?.academic_level || 1
    };
};

/**
 * Checks if a student can retake a failed course
 * @param {number} studentId
 * @param {number} classId
 * @returns {Promise<{canRetake: boolean, message: string}>}
 */
const canRetakeCourse = async (studentId, classId) => {
    // Check if student has a grade for this class
    const gradeResult = await db.query(
        `SELECT g.gpa, c.course_code, c.semester, c.level
         FROM Grades g
         JOIN Class c ON g.class_id = c.class_id
         WHERE g.user_id = $1 AND g.class_id = $2`,
        [studentId, classId]
    );

    const grade = gradeResult.rows[0];

    if (!grade) {
        return { canRetake: false, message: "No grade found for this course" };
    }

    // Only allow retake if failed (gpa = 0)
    if (parseFloat(grade.gpa) > 0) {
        return { canRetake: false, message: "You passed this course. Retake not allowed." };
    }

    // Check if student is already enrolled in a new instance of this course
    const enrolledResult = await db.query(
        `SELECT e.class_id
         FROM Enrollment e
         JOIN Class c ON e.class_id = c.class_id
         WHERE e.user_id = $1 AND c.course_code = $2 AND e.class_id != $3`,
        [studentId, grade.course_code, classId]
    );

    if (enrolledResult.rows.length > 0) {
        return { canRetake: false, message: "You are already enrolled in a new instance of this course." };
    }

    return { canRetake: true, message: "You can retake this course." };
};

/**
 * Handles repeated courses - returns the highest grade for each course
 * @param {number} studentId
 * @returns {Promise<object>} Map of course_code to best grade
 */
const getBestGradesForRepeatedCourses = async (studentId) => {
    const query = `
        SELECT
            c.course_code,
            g.gpa,
            g.final,
            g.class_id
        FROM Grades g
        JOIN Class c ON g.class_id = c.class_id
        WHERE g.user_id = $1 AND g.final IS NOT NULL
        ORDER BY c.course_code, g.final DESC
    `;

    const result = await db.query(query, [studentId]);
    const rows = result.rows || [];

    const bestGrades = {};

    rows.forEach(row => {
        const courseCode = row.course_code;
        const gpaVal = parseFloat(row.gpa) || 0;

        if (!bestGrades[courseCode] || gpaVal > parseFloat(bestGrades[courseCode].gpa)) {
            bestGrades[courseCode] = {
                course_code: courseCode,
                gpa: gpaVal,
                final: row.final,
                class_id: row.class_id
            };
        }
    });

    return bestGrades;
};

/**
 * Generates academic probation warnings based on student's GPA
 * @param {number} studentId
 * @returns {Promise<object>} { warnings: string[], probationLevel: string, recommendations: string[] }
 */
const getAcademicProbationWarnings = async (studentId) => {
    const studentResult = await db.query(
        `SELECT total_gpa, total_hours, academic_level FROM Student WHERE user_id = $1`,
        [studentId]
    );
    const studentData = studentResult.rows[0];

    if (!studentData) {
        return {
            warnings: [],
            probationLevel: 'Unknown',
            recommendations: []
        };
    }

    const gpaVal = parseFloat(studentData.total_gpa) || 0;
    const totalHours = parseInt(studentData.total_hours) || 0;
    const warnings = [];
    const recommendations = [];
    let probationLevel = 'Good Standing';

    if (gpaVal === 0 && totalHours === 0) {
        probationLevel = 'No Grades Yet';
        recommendations.push('Start enrolling in courses to establish your academic record.');
    } else if (gpaVal >= 3.5) {
        probationLevel = 'Dean\'s List';
        recommendations.push('Excellent performance! Consider taking on leadership roles or research opportunities.');
    } else if (gpaVal >= 3.0) {
        probationLevel = 'Honor Roll';
        recommendations.push('Great job! Keep up the good work and consider challenging yourself with advanced courses.');
    } else if (gpaVal >= 2.0) {
        probationLevel = 'Good Standing';
        // No warnings needed
    } else if (gpaVal >= 1.5) {
        probationLevel = 'Academic Warning';
        warnings.push('⚠️ Your GPA is below 2.0. You are on Academic Warning.');
        warnings.push('⚠️ If your GPA drops below 1.5, you will be placed on Academic Probation.');
        recommendations.push('Consider reducing your course load next semester.');
        recommendations.push('Seek academic advising and tutoring services.');
        recommendations.push('Focus on improving your study habits and time management.');
    } else if (gpaVal > 0) {
        probationLevel = 'Academic Probation';
        warnings.push('🚨 Your GPA is below 1.5. You are on Academic Probation.');
        warnings.push('🚨 You must improve your GPA to above 2.0 within the next semester to avoid dismissal.');
        recommendations.push('Reduce your course load to 12 credit hours maximum.');
        recommendations.push('Mandatory academic advising required.');
        recommendations.push('Attend all tutoring sessions and office hours.');
        recommendations.push('Consider retaking failed courses to improve your GPA.');
    }

    // Check for consecutive failing semesters
    const recentGradesResult = await db.query(
        `SELECT c.semester, c.level, g.gpa
         FROM Grades g
         JOIN Class c ON g.class_id = c.class_id
         WHERE g.user_id = $1 AND g.final IS NOT NULL
         ORDER BY c.level DESC, c.semester DESC
         LIMIT 20`,
        [studentId]
    );

    const recentGrades = recentGradesResult.rows || [];
    let consecutiveFailures = 0;

    for (const grade of recentGrades) {
        if (parseFloat(grade.gpa) === 0) {
            consecutiveFailures++;
        } else {
            break;
        }
    }

    if (consecutiveFailures >= 3) {
        warnings.push('🚨 You have failed courses in 3 consecutive semesters.');
        recommendations.push('Immediate intervention required - meet with academic advisor.');
    }

    return {
        warnings,
        probationLevel,
        recommendations,
        gpa: gpaVal,
        totalHours
    };
};

module.exports = {
    calculateCourseGPA,
    recalculateStudentGPA,
    canEnrollInClass,
    checkPrerequisites,
    getStudentTranscript,
    canRetakeCourse,
    getBestGradesForRepeatedCourses,
    getAcademicProbationWarnings
};
