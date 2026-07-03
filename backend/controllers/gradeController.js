const httpStatus = require('../utilities/httpstatustext');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');
const gpaService = require('../services/gpaService');

const gradeQueries = genericQueries('Grades', { primaryKey: 'grade_id' });

// GET STUDENT GRADES - Get all grades for a student across all classes
const getStudentGrades = asyncWrapper(async (req, res, next) => {
  const { studentId } = req.params;

  if (!studentId) {
    const error = new Error("Student ID is required");
    error.statusCode = 400;
    return next(error);
  }

  const grades = await gradeQueries.customQuery(
    `SELECT 
      g.grade_id, g.user_id, g.class_id, g.generate_at,
      g.attendance, g.practical, g.project, g.midterm, g.final, g.gpa,
      g.max_midterm, g.max_project, g.max_practical, g.max_attendance, g.max_final,
      g.doctor_id, c.course_code, c.level, c.semester, co.name as course_name, co.credit_hours
    FROM Grades g
    LEFT JOIN Class c ON g.class_id = c.class_id
    LEFT JOIN Courses co ON c.course_code = co.course_code
    WHERE g.user_id = $1
    ORDER BY c.level DESC, c.semester DESC`,
    [studentId]
  );

  if (grades.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: "No grades found for this student"
    });
  }

  // Format response
  const formattedGrades = grades.map(grade => {
    const total = (grade.attendance || 0) + (grade.practical || 0) + (grade.project || 0) + (grade.midterm || 0) + (grade.final || 0);
    const maxTotal = (grade.max_midterm || 0) + (grade.max_project || 0) + (grade.max_practical || 0) + (grade.max_attendance || 0) + (grade.max_final || 0);
    const { letter, gpa: computedGpa } = gpaService.calculateCourseGPA(total, maxTotal);

    return {
      grade_id: grade.grade_id,
      student_id: grade.user_id,
      class_id: grade.class_id,
      course_code: grade.course_code,
      course_name: grade.course_name,
      level: grade.level,
      semester: grade.semester,
      attendance: grade.attendance,
      practical: grade.practical,
      project: grade.project,
      midterm: grade.midterm,
      final: grade.final,
      max_attendance: grade.max_attendance,
      max_practical: grade.max_practical,
      max_project: grade.max_project,
      max_midterm: grade.max_midterm,
      max_final: grade.max_final,
      gpa: computedGpa,
      letter: letter,
      doctor_id: grade.doctor_id,
      generated_at: grade.generate_at,
      credit_hours: grade.credit_hours
    };
  });

  res.status(200).json({
    success: true,
    data: formattedGrades,
    total: formattedGrades.length
  });
});

module.exports = {
  getStudentGrades
};
