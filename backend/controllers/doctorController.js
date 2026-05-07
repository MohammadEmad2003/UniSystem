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
  const stats = await new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        (SELECT COUNT(*) FROM Class WHERE Doctor_ID = ?) as total_classes,
        (SELECT COUNT(DISTINCT User_ID) FROM Enrollment WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)) as total_students,
        (SELECT COUNT(*) FROM Lecture WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)) as total_lectures,
        (SELECT COUNT(*) FROM Material WHERE Lec_ID IN (SELECT Lec_ID FROM Lecture WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?))) as total_materials,
        (SELECT COUNT(*) FROM Questions WHERE Class_ID IN (SELECT Class_ID FROM Class WHERE Doctor_ID = ?)) as recent_questions
    `, [doctorId, doctorId, doctorId, doctorId, doctorId], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });

  // Get students per class for chart
  const classEnrollmentData = await new Promise((resolve, reject) => {
    db.all(`
      SELECT c.Class_ID as id, co.Name as name, COUNT(e.User_ID) as students
      FROM Class c
      JOIN Courses co ON c.Course_Code = co.Course_Code
      LEFT JOIN Enrollment e ON c.Class_ID = e.Class_ID
      WHERE c.Doctor_ID = ?
      GROUP BY c.Class_ID
    `, [doctorId], (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });

  // Get upcoming lectures
  const upcomingLectures = await new Promise((resolve, reject) => {
    db.all(`
      SELECT l.Lec_ID as id, l.Title as title, l.Date as date, cl.Course_Code as course
      FROM Lecture l
      JOIN Class cl ON l.Class_ID = cl.Class_ID
      WHERE cl.Doctor_ID = ? AND l.Date >= date('now')
      ORDER BY l.Date ASC
      LIMIT 5
    `, [doctorId], (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });

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
