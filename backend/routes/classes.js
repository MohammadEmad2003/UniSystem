const express = require('express');
const router = express.Router();
const allowedTo = require("../middleware/allowedTo");
const userRoles = require("../utilities/userRoles");
const {
  getAllClasses, getClassById, getClassesByDoctor,
  getClassesByStudent, createClass, deleteClass,
  getClassStudents, enrollStudent, dropStudent,
  getClassGrades, getStudentGrades, addGrade
} = require('../controllers/classController');
const verifyToken = require('../middleware/verifytoken');
const { getClassQuestions, postQuestion } = require('../controllers/discussionController');

router.use(verifyToken);

router.get('/', allowedTo(userRoles.ADMIN, userRoles.DOCTOR, userRoles.STUDENT), getAllClasses);
router.get('/doctor/:doctorId', getClassesByDoctor);
router.get('/student/:studentId', getClassesByStudent);
router.get('/:classId', getClassById);
router.get('/:classId/students', allowedTo(userRoles.DOCTOR), getClassStudents);
router.get('/:classId/questions' , allowedTo(userRoles.DOCTOR , userRoles.STUDENT), getClassQuestions);
router.get('/:classId/grades', allowedTo(userRoles.DOCTOR), getClassGrades);
router.get('/:classId/grades/student/:studentId', getStudentGrades);
router.post('/', allowedTo(userRoles.ADMIN), createClass);
router.post('/:classId/enroll', enrollStudent);
router.delete('/:classId/enroll/:studentId', dropStudent);
router.post('/:classId/questions', allowedTo(userRoles.DOCTOR , userRoles.STUDENT), postQuestion);
router.post('/:classId/grades', allowedTo(userRoles.DOCTOR), addGrade);
router.delete('/:classId', allowedTo(userRoles.ADMIN), deleteClass);

module.exports = router;