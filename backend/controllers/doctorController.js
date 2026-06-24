const httpStatus = require('../utilities/httpstatustext');
const asyncWrapper = require("../middleware/asyncWrapper");
const genericQueries = require('../utilities/genericQueries');

const classQueries = genericQueries('Class', { primaryKey: 'Class_ID' });
const lectureQueries = genericQueries('Lecture', { primaryKey: 'Lec_ID' });
const materialQueries = genericQueries('Material', { primaryKey: 'Material_ID' });
const questionQueries = genericQueries('Questions', { primaryKey: 'Questions_ID' });
const enrollmentQueries = genericQueries('Enrollment', { primaryKey: 'Class_ID' });

const db = require("../utilities/database");

// GET DOCTOR STATS - Get dashboard statistics for a doctor
const getDoctorStats = asyncWrapper(async (req, res, next) => {
  const { doctorId } = req.params;

  if (!doctorId) {
    const error = new Error("Doctor ID is required");
    error.statusCode = 400;
    return next(error);
  }

  // Get basic counts
  const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM Class WHERE doctor_id = $1) as total_classes,
        (SELECT COUNT(DISTINCT user_id) FROM Enrollment WHERE class_id IN (SELECT class_id FROM Class WHERE doctor_id = $2)) as total_students,
        (SELECT COUNT(*) FROM Lecture WHERE class_id IN (SELECT class_id FROM Class WHERE doctor_id = $3)) as total_lectures,
        (SELECT COUNT(*) FROM Material WHERE lec_id IN (SELECT lec_id FROM Lecture WHERE class_id IN (SELECT class_id FROM Class WHERE doctor_id = $4))) as total_materials,
        (SELECT COUNT(*) FROM Questions WHERE class_id IN (SELECT class_id FROM Class WHERE doctor_id = $5)) as recent_questions
    `, [doctorId, doctorId, doctorId, doctorId, doctorId]);
  const stats = statsResult.rows[0];

  // Get students per class for chart
  const classEnrollmentResult = await db.query(`
      SELECT c.class_id as id, co.name as name, COUNT(e.user_id) as students
      FROM Class c
      JOIN Courses co ON c.course_code = co.course_code
      LEFT JOIN Enrollment e ON c.class_id = e.class_id
      WHERE c.doctor_id = $1
      GROUP BY c.class_id
    `, [doctorId]);
  const classEnrollmentData = classEnrollmentResult.rows || [];

  // Get upcoming lectures
  const upcomingLecturesResult = await db.query(`
      SELECT l.lec_id as id, l.title as title, l.date as date, cl.course_code as course
      FROM Lecture l
      JOIN Class cl ON l.class_id = cl.class_id
      WHERE cl.doctor_id = $1 AND l.date >= CURRENT_DATE
      ORDER BY l.date ASC
      LIMIT 5
    `, [doctorId]);
  const upcomingLectures = upcomingLecturesResult.rows || [];

  res.status(200).json({
    success: true,
    data: {
      ...stats,
      class_enrollment_data: classEnrollmentData,
      upcoming_lectures: upcomingLectures
    }
  });
});

module.exports = {
  getDoctorStats
};
