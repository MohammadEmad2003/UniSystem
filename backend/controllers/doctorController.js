const httpStatus = require('../utilities/httpstatustext');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const classQueries = genericQueries('Class', { primaryKey: 'Class_ID' });
const lectureQueries = genericQueries('Lecture', { primaryKey: 'Lec_ID' });
const materialQueries = genericQueries('Material', { primaryKey: 'Material_ID' });
const questionQueries = genericQueries('Questions', { primaryKey: 'Questions_ID' });
const enrollmentQueries = genericQueries('Enrollment', { primaryKey: 'Class_ID' });

// GET DOCTOR STATS - Get dashboard statistics for a doctor
const getDoctorStats = asyncWrapper(async (req, res, next) => {
  const { doctorId } = req.params;

  if (!doctorId) {
    const error = new Error("Doctor ID is required");
    error.statusCode = 400;
    return next(error);
  }

  // Get total classes for this doctor using genericQueries count function
  const totalClasses = await classQueries.countByField('Doctor_ID', doctorId);

  // If no classes, return zeros
  if (totalClasses === 0) {
    return res.status(200).json({
      success: true,
      data: {
        total_classes: 0,
        total_students: 0,
        total_lectures: 0,
        total_materials: 0,
        recent_questions: 0
      }
    });
  }

  // Get total unique students enrolled in any of these classes
  // WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)
  const totalStudents = await enrollmentQueries.countDistinctWithWhereClause(
    'User_ID',
    `Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)`,
    [doctorId]
  );

  // Get total lectures for all classes of this doctor
  // WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)
  const totalLectures = await lectureQueries.countWithWhereClause(
    `Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)`,
    [doctorId]
  );

  // Get total materials for all lectures in classes of this doctor
  // WHERE Lec_ID IN (SELECT Lec_ID FROM Lecture WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?))
  const totalMaterials = await materialQueries.countWithWhereClause(
    `Lec_ID IN (SELECT Lec_ID FROM Lecture WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?))`,
    [doctorId]
  );

  // Get count of recent questions for all classes of this doctor
  // WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)
  const recentQuestions = await questionQueries.countWithWhereClause(
    `Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)`,
    [doctorId]
  );

  res.status(200).json({
    success: true,
    data: {
      total_classes: totalClasses,
      total_students: totalStudents,
      total_lectures: totalLectures,
      total_materials: totalMaterials,
      recent_questions: recentQuestions
    }
  });
});

module.exports = {
  getDoctorStats
};
