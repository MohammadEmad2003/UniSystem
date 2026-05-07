const httpStatus = require('../utilities/httpstatustext');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const gradeQueries = genericQueries('Grades', { primaryKey: 'Grade_ID' });

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
      g.Grade_ID, g.User_ID, g.Class_ID, g.Type, g.Generate_At,
      g.Attendance, g.Practical, g.Project, g.Midterm, g.Final, g.GPA,
      g.Doctor_ID, c.Course_Code, c.Level, c.Semester, co.Name as Course_Name
    FROM Grades g
    LEFT JOIN Class c ON g.Class_ID = c.Class_ID
    LEFT JOIN Courses co ON c.Course_Code = co.Course_Code
    WHERE g.User_ID = ?
    ORDER BY c.Level DESC, c.Semester DESC`,
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
  const formattedGrades = grades.map(grade => ({
    grade_id: grade.Grade_ID,
    student_id: grade.User_ID,
    class_id: grade.Class_ID,
    course_code: grade.Course_Code,
    course_name: grade.Course_Name,
    level: grade.Level,
    semester: grade.Semester,
    type: grade.Type,
    attendance: grade.Attendance,
    practical: grade.Practical,
    project: grade.Project,
    midterm: grade.Midterm,
    final: grade.Final,
    gpa: grade.GPA,
    doctor_id: grade.Doctor_ID,
    generated_at: grade.Generate_At
  }));

  res.status(200).json({
    success: true,
    data: formattedGrades,
    total: formattedGrades.length
  });
});

module.exports = {
  getStudentGrades
};
